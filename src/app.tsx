import { Mic, StopCircle } from "lucide-react";
import { Button } from "./components/ui/button";
import { useRef, useState } from "react";

type Result = {
  action: string;
  product: string;
  quantity: number;
};

const isRecordingSupported =
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === "function" &&
  typeof window.MediaRecorder === "function";

export function App() {
  const [result, setResult] = useState<Result | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);

  function stopRecording() {
    setIsRecording(false);

    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.stop();
    }
  }

  async function uploadAudio(audio: Blob) {
    const formData = new FormData();
    formData.append("file", audio, "audio.webm");
    const response = await fetch(`http://localhost:3333/process-audio`, {
      method: "POST",
      body: formData,
    });

    const data: Result = await response.json();

    setResult(data);
    return data;
  }

  function createRecorder(audio: MediaStream) {
    recorder.current = new MediaRecorder(audio, {
      mimeType: "audio/webm",
      audioBitsPerSecond: 64_000,
    });

    recorder.current.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await uploadAudio(event.data);
      }
    };

    recorder.current.onstart = () => {
      console.log("Gravação Iniciada");
    };

    recorder.current.onstop = () => {
      console.log("Gravação Encerrada");
    };

    recorder.current.start();
  }

  async function startRecording() {
    if (!isRecordingSupported) {
      alert("Seu navegador não suporta gravações");
      return;
    }

    setIsRecording(true);

    const audio = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44_100,
      },
    });

    createRecorder(audio);
  }

  return (
    <div className="flex items-center justify-center h-screen">
      {isRecording ? (
        <Button variant={"destructive"} onClick={stopRecording}>
          Parar Gravação <StopCircle />
        </Button>
      ) : (
        <Button onClick={startRecording}>
          Iniciar Gravação <Mic />
        </Button>
      )}
      {result && (
        <div>
          <p>
            <strong>Ação:</strong> {result.action}
          </p>
          <p>
            <strong>Produto:</strong> {result.product}
          </p>
          <p>
            <strong>Quantidade:</strong> {result.quantity}
          </p>
        </div>
      )}
    </div>
  );
}
