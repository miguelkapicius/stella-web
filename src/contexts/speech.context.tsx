import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface SpeechContextType {
  transcript: string;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}

type Result = {
  action: string;
  product: string;
  quantity: number;
};

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<Result | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useRef<SpeechRecognition | null>(null);
  const [transcript, setTranscript] = useState("");

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

  return (
    <SpeechContext.Provider
      value={{ isRecording, startRecording, stopRecording, transcript }}
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
