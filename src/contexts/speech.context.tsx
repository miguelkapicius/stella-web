import Pusher, { type Channel } from "pusher-js";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

interface SpeechContextType {
  transcript: string;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  chat: ChatMessage[];
  voiceLoading: boolean;
  isSpeaking: boolean;
}

interface Message {
  session_id: string;
  correlation_id: string;
  timestamp: Date;
  data: {
    intention: string;
    items: [
      {
        item: string;
        quantidade: number;
      }
    ];
    response: string;
    stella_analysis: string;
    reason: string | null;
  };
}

interface ChatMessage {
  from: "user" | "stella";
  text: string;
}

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recorder = useRef<SpeechRecognition | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const sessionId = useRef(globalThis.crypto?.randomUUID?.());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function stopRecording() {
    setIsRecording(false);
    recorder.current?.stop();
  }

  async function startRecording() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta Web Speech API 😢");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);

      setChat((prev) => [...prev, { from: "user", text }]);

      console.log("Texto reconhecido:", text, " - Enviando para backend...");
      await sendSpeechMessage(text);
      JSON.stringify({
        comando: text,
      });
    };

    setIsRecording(true);

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento:", event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recorder.current = recognition;
    console.log(transcript);
  }

  console.log(sessionId.current);

  async function sendSpeechMessage(text: string) {
    const payload = {
      session_id: sessionId.current,
      correlation_id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      timestamp: new Date().toISOString(),
      data: {
        text,
        userId: "user123",
      },
    };

    console.log("Payload:", payload);

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
    } catch (e: any) {
      console.error("Falha ao enviar speech via HTTP:", e);
    }
  }

  async function speak(text: string) {
    setVoiceLoading(true);
    const client = new ElevenLabsClient({
      apiKey: "sk_c3222e5821cf2d1f52d38c4d6a80b2869858a966a8d249a7",
    });

    try {
      // Retorna um ReadableStream
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

      audioRef.current = new Audio(audioUrl);
      setVoiceLoading(false);
      setIsSpeaking(true);
      audioRef.current.onended = () => setIsSpeaking(false);
      await audioRef.current.play();
    } catch (error) {
      console.error("Erro ao gerar voz:", error);
      setVoiceLoading(false);
      setIsSpeaking(false);
    }
  }

  useEffect(() => {
    pusherRef.current = new Pusher("6e145679d2e5714d4e58", {
      cluster: "us2",
      authEndpoint: "http://localhost:8000/auth/pusher",
      auth: {
        params: {
          session_id: sessionId.current,
        },
      },
    });

    channelRef.current = pusherRef.current.subscribe("private-agent-123");

    const onSpeech = async (data: Message) => {
      setChat((prev) => [
        ...prev,
        { from: "stella", text: data.data.response },
      ]);
      await speak(data.data.response);
    };

    // const onFace = (data: Message) => {
    //   setMessages((prev) => [...prev, data]);
    // };

    channelRef.current.bind("server-speech-output", onSpeech);
    // channelRef.current.bind("server-face-output", onFace);

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind("server-speech-output", onSpeech);
        // channelRef.current.unbind("server-face-output", onFace);
        pusherRef.current?.unsubscribe("private-agent-123");
      }
      pusherRef.current?.disconnect();
    };
  }, []);

  return (
    <SpeechContext.Provider
      value={{
        isRecording,
        voiceLoading,
        startRecording,
        stopRecording,
        transcript,
        chat,
        isSpeaking,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context)
    throw new Error("useSpeech precisa estar dentro do SpeechProvider");
  return context;
};
