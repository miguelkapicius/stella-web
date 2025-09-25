import Pusher, { type Channel } from "pusher-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import {
  ConversationState,
  type ConversationStateValue,
} from "./speech.types";

interface SpeechContextType {
  transcript: string;
  chat: ChatMessage[];
  voiceLoading: boolean;
  isSpeaking: boolean;
  isRecording: boolean;
  conversationState: ConversationStateValue;
  isHotwordArmed: boolean;
  canListen: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  activateByTouch: () => void;
}

interface Message {
  session_id: string;
  correlation_id: string;
  timestamp: string;
  data: {
    intention: string;
    items?: Array<{
      productName: string;
      quantity: number;
    }>;
    response: string;
    stella_analysis: string;
    reason?: string | null;
  };
}

interface ChatMessage {
  from: "user" | "stella";
  text: string;
}

type ActivationOrigin = "hotword" | "touch" | "manual";

const HOTWORD_VARIANTS = ["stella", "estela", "tela", "stelar", "stel"];
const INACTIVITY_TIMEOUT_MS = 1600;
const WAKE_TRANSITION_DELAY_MS = 400;
const AGENT_CHANNEL = "private-agent-123";

type SpeechRecognitionConstructor = new () => SpeechRecognition;
type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const matchesHotword = (text: string) => {
  const normalized = normalizeText(text);
  if (!normalized) {
    return false;
  }

  if (HOTWORD_VARIANTS.some((variant) => normalized.includes(variant))) {
    return true;
  }

  const hasSteLa = normalized.includes("ste") && normalized.includes("la");
  const hasEsteLa = normalized.includes("este") && normalized.includes("la");
  return hasSteLa || hasEsteLa;
};

const log = (...args: unknown[]) => console.log("[STELLA]", ...args);

const describeRecognitionError = (event: unknown) => {
  if (typeof event === "object" && event !== null && "error" in event) {
    return (event as { error: unknown; message?: unknown }).error;
  }
  return event;
};

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [transcript, setTranscript] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationStateValue>(
    ConversationState.Idle
  );
  const [isHotwordArmed, setIsHotwordArmed] = useState(false);

  const isRecording = conversationState === ConversationState.ActiveListening;
  const canListen =
    conversationState === ConversationState.ActiveListening ||
    conversationState === ConversationState.WakeListening;

  const sessionId = useRef<string | null>(null);
  const passiveRecognizerRef = useRef<SpeechRecognition | null>(null);
  const activeRecognizerRef = useRef<SpeechRecognition | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const wakeTransitionTimeoutRef = useRef<number | null>(null);
  const currentUtteranceRef = useRef("");
  const lastSnippetRef = useRef("");
  const conversationStateRef = useRef<ConversationStateValue>(conversationState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const elevenLabsClientRef = useRef<ElevenLabsClient | null>(null);
  const resumeAfterSpeakRef = useRef(false);

  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  const speechRecognitionCtor = useMemo<
    SpeechRecognitionConstructor | undefined
  >(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    return (
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    );
  }, []);

  useEffect(() => {
    if (!speechRecognitionCtor) {
      console.warn(
        "[STELLA] Web Speech API indisponível neste navegador; hotword desativada."
      );
    }
  }, [speechRecognitionCtor]);

  const clearWakeTransition = useCallback(() => {
    if (wakeTransitionTimeoutRef.current) {
      window.clearTimeout(wakeTransitionTimeoutRef.current);
      wakeTransitionTimeoutRef.current = null;
    }
  }, []);

  const ensureSession = useCallback(() => {
    if (!sessionId.current) {
      sessionId.current =
        globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
      log("Nova sessão criada:", sessionId.current);
    }
    return sessionId.current;
  }, []);

  const sendSpeechMessage = useCallback(
    async (text: string) => {
      if (!sessionId.current) {
        log("Impossível enviar mensagem sem sessão ativa.");
        return;
      }

      const payload = {
        session_id: sessionId.current,
        correlation_id:
          globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
        timestamp: new Date().toISOString(),
        data: {
          text,
          userId: "user123",
        },
      };

      log("Enviando comando:", payload.data.text);
      setVoiceLoading(true);

      try {
        const res = await fetch("http://localhost:8000/speech/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
      } catch (error) {
        console.error("[STELLA] Falha ao enviar speech:", error);
        setVoiceLoading(false);
        throw error;
      }
    },
    []
  );

  const flushPendingTranscript = useCallback(
    async (reason: "timeout" | "manual" = "timeout") => {
      const text = currentUtteranceRef.current.trim();
      if (!text) {
        currentUtteranceRef.current = "";
        lastSnippetRef.current = "";
        setTranscript("");
        return;
      }

      log(`Transcrição finalizada (${reason}):`, text);
      currentUtteranceRef.current = "";
      lastSnippetRef.current = "";
      setTranscript("");
      setChat((prev) => [...prev, { from: "user", text }]);

      try {
        await sendSpeechMessage(text);
      } catch {
        // já logado
      }
    },
    [sendSpeechMessage]
  );

  const stopInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    stopInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      void flushPendingTranscript("timeout");
    }, INACTIVITY_TIMEOUT_MS);
  }, [flushPendingTranscript, stopInactivityTimer]);

  const stopActiveRecognizer = useCallback(
    async ({ flush = false }: { flush?: boolean } = {}) => {
      stopInactivityTimer();

      const recognition = activeRecognizerRef.current;
      activeRecognizerRef.current = null;

      if (flush) {
        await flushPendingTranscript("manual");
      } else {
        currentUtteranceRef.current = "";
        lastSnippetRef.current = "";
        setTranscript("");
      }

      if (recognition) {
        recognition.onresult = null as unknown as (...args: unknown[]) => void;
        recognition.onend = null as unknown as (...args: unknown[]) => void;
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
    },
    [flushPendingTranscript, stopInactivityTimer]
  );

  const startActiveRecognizer = useCallback(async () => {
    if (!speechRecognitionCtor) {
      return;
    }

    if (activeRecognizerRef.current) {
      await stopActiveRecognizer({ flush: false });
    }

    const recognition = new speechRecognitionCtor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      log("Reconhecimento ativo iniciado.");
    };

    recognition.onerror = (event) => {
      console.error(
        "[STELLA] Erro no reconhecimento ativo:",
        describeRecognitionError(event)
      );
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let appended = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) {
          continue;
        }

        const snippet = result[0].transcript.trim();
        if (!snippet || snippet === lastSnippetRef.current) {
          continue;
        }

        lastSnippetRef.current = snippet;
        currentUtteranceRef.current = `${currentUtteranceRef.current} ${snippet}`.trim();
        appended = true;
      }

      if (appended) {
        setTranscript(currentUtteranceRef.current);
        resetInactivityTimer();
      }
    };

    recognition.onend = () => {
      activeRecognizerRef.current = null;
      if (conversationStateRef.current === ConversationState.ActiveListening) {
        log("Reconhecimento ativo reiniciado após onend.");
        window.setTimeout(() => {
          void startActiveRecognizer();
        }, 300);
      }
    };

    try {
      recognition.start();
      activeRecognizerRef.current = recognition;
    } catch (error) {
      console.error("[STELLA] Falha ao iniciar reconhecimento ativo:", error);
    }
  }, [resetInactivityTimer, speechRecognitionCtor, stopActiveRecognizer]);

  const speak = useCallback(
    async (text: string) => {
      if (!text) {
        return;
      }

      const shouldResume =
        conversationStateRef.current === ConversationState.ActiveListening ||
        conversationStateRef.current === ConversationState.Paused;

      resumeAfterSpeakRef.current = shouldResume;

      if (shouldResume) {
        await stopActiveRecognizer({ flush: false });
        setConversationState(ConversationState.Paused);
      }

      log("Gerando áudio para resposta:", text);

      try {
        if (!elevenLabsClientRef.current) {
          elevenLabsClientRef.current = new ElevenLabsClient({
            apiKey: "sk_c3222e5821cf2d1f52d38c4d6a80b2869858a966a8d249a7",
          });
        }

        const client = elevenLabsClientRef.current;
        const audioStream = await client.textToSpeech.convert(
          "mPDAoQyGzxBSkE0OAOKw",
          {
            outputFormat: "mp3_44100_128",
            text,
            modelId: "eleven_multilingual_v2",
            voiceSettings: {
              speed: 1.15,
            },
          }
        );

        const arrayBuffer = await new Response(audioStream).arrayBuffer();
        const audioBlob = new Blob([arrayBuffer], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }

        const audioElement = new Audio(audioUrl);
        audioRef.current = audioElement;

        audioElement.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);

          if (resumeAfterSpeakRef.current) {
            resumeAfterSpeakRef.current = false;
            setConversationState(ConversationState.ActiveListening);
            void startActiveRecognizer();
          } else {
            setConversationState(ConversationState.Idle);
          }
        };

        audioElement.onerror = (event) => {
          console.error("[STELLA] Falha no elemento de áudio:", event);
        };

        setVoiceLoading(false);
        setIsSpeaking(true);
        setConversationState(ConversationState.Speaking);

        try {
          await audioElement.play();
        } catch (error) {
          console.error("[STELLA] Erro ao iniciar reprodução:", error);
          setIsSpeaking(false);
          setConversationState(
            resumeAfterSpeakRef.current
              ? ConversationState.ActiveListening
              : ConversationState.Idle
          );
          resumeAfterSpeakRef.current = false;
          URL.revokeObjectURL(audioUrl);
          await startActiveRecognizer();
        }
      } catch (error) {
        console.error("[STELLA] Erro ao gerar áudio:", error);
        setVoiceLoading(false);
        setIsSpeaking(false);
        setConversationState(
          resumeAfterSpeakRef.current
            ? ConversationState.ActiveListening
            : ConversationState.Idle
        );
        resumeAfterSpeakRef.current = false;
        await startActiveRecognizer();
      }
    },
    [startActiveRecognizer, stopActiveRecognizer]
  );

  const connectPusher = useCallback(() => {
    if (!sessionId.current) {
      return;
    }
    if (pusherRef.current) {
      return;
    }

    const pusher = new Pusher("6e145679d2e5714d4e58", {
      cluster: "us2",
      authEndpoint: "http://localhost:8000/auth/pusher",
      auth: {
        params: {
          session_id: sessionId.current,
        },
      },
    });

    const channel = pusher.subscribe(AGENT_CHANNEL);

    channel.bind("server-speech-output", async (data: Message) => {
      if (data.session_id && sessionId.current && data.session_id !== sessionId.current) {
        log("Resposta ignorada: sessão divergente", data.session_id);
        return;
      }

      const response = data?.data?.response ?? "";
      if (!response) {
        return;
      }

      log("Recebido do backend:", response);
      setChat((prev) => [...prev, { from: "stella", text: response }]);

      try {
        await speak(response);
      } catch (error) {
        console.error("[STELLA] Erro ao reproduzir resposta:", error);
      }
    });

    pusherRef.current = pusher;
    channelRef.current = channel;
    log("Conectado ao Pusher.");
  }, [speak]);

  const disconnectPusher = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusherRef.current?.unsubscribe(AGENT_CHANNEL);
      channelRef.current = null;
    }

    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
      log("Pusher desconectado.");
    }
  }, []);

  const cleanupPassiveRecognizer = useCallback(() => {
    const recognition = passiveRecognizerRef.current;
    passiveRecognizerRef.current = null;

    if (recognition) {
      recognition.onresult = null as unknown as (...args: unknown[]) => void;
      recognition.onend = null as unknown as (...args: unknown[]) => void;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }

    setIsHotwordArmed(false);
  }, []);

  const startActiveConversation = useCallback(
    (origin: ActivationOrigin) => {
      if (!speechRecognitionCtor) {
        alert("Seu navegador não suporta Web Speech API 😢");
        return;
      }

      if (conversationStateRef.current !== ConversationState.Idle) {
        log(
          `Ignorando acionamento (${origin}) enquanto em ${conversationStateRef.current}.`
        );
        return;
      }

      log(`Acordando por ${origin}.`);
      setConversationState(ConversationState.WakeListening);
      cleanupPassiveRecognizer();
      clearWakeTransition();

      wakeTransitionTimeoutRef.current = window.setTimeout(() => {
        ensureSession();
        connectPusher();
        startActiveRecognizer().catch((error) => {
          console.error("[STELLA] Falha ao iniciar escuta ativa:", error);
        });
        setConversationState(ConversationState.ActiveListening);
      }, WAKE_TRANSITION_DELAY_MS);
    },
    [
      cleanupPassiveRecognizer,
      clearWakeTransition,
      connectPusher,
      ensureSession,
      speechRecognitionCtor,
      startActiveRecognizer,
    ]
  );

  const startPassiveHotword = useCallback(() => {
    if (!speechRecognitionCtor) {
      return;
    }
    if (passiveRecognizerRef.current) {
      return;
    }

    const recognition = new speechRecognitionCtor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsHotwordArmed(true);
      log("Escutando hotword.");
    };

    recognition.onerror = (event) => {
      console.error(
        "[STELLA] Erro na hotword:",
        describeRecognitionError(event)
      );
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) {
          continue;
        }

        const text = result[0].transcript.trim();
        if (!text) {
          continue;
        }

        log("Hotword resultado bruto:", text);
        if (matchesHotword(text)) {
          log("Hotword detectada:", text);
          cleanupPassiveRecognizer();
          startActiveConversation("hotword");
          break;
        }
      }
    };

    recognition.onend = () => {
      passiveRecognizerRef.current = null;
      setIsHotwordArmed(false);

      if (conversationStateRef.current === ConversationState.Idle) {
        window.setTimeout(() => {
          startPassiveHotword();
        }, 350);
      }
    };

    try {
      recognition.start();
      passiveRecognizerRef.current = recognition;
      log("Hotword listener inicializado.");
    } catch (error) {
      console.error("[STELLA] Falha ao iniciar hotword:", error);
    }
  }, [cleanupPassiveRecognizer, speechRecognitionCtor, startActiveConversation]);

  const stopActiveConversation = useCallback(async () => {
    log("Encerrando sessão atual.");
    clearWakeTransition();
    await stopActiveRecognizer({ flush: true });
    disconnectPusher();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    setIsSpeaking(false);
    setVoiceLoading(false);
    sessionId.current = null;
    setConversationState(ConversationState.Idle);
  }, [clearWakeTransition, disconnectPusher, stopActiveRecognizer]);

  useEffect(() => {
    if (!speechRecognitionCtor) {
      return;
    }

    if (conversationState === ConversationState.Idle) {
      startPassiveHotword();
    } else {
      cleanupPassiveRecognizer();
    }
  }, [cleanupPassiveRecognizer, conversationState, speechRecognitionCtor, startPassiveHotword]);

  useEffect(() => {
    return () => {
      clearWakeTransition();
      cleanupPassiveRecognizer();
      void stopActiveRecognizer({ flush: false });
      disconnectPusher();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [
    clearWakeTransition,
    cleanupPassiveRecognizer,
    disconnectPusher,
    stopActiveRecognizer,
  ]);

  return (
    <SpeechContext.Provider
      value={{
        transcript,
        chat,
        voiceLoading,
        isSpeaking,
        isRecording,
        conversationState,
        isHotwordArmed,
        canListen,
        startRecording: () => startActiveConversation("manual"),
        stopRecording: () => {
          void stopActiveConversation();
        },
        activateByTouch: () => startActiveConversation("touch"),
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error("useSpeech precisa estar dentro do SpeechProvider");
  }
  return context;
};
