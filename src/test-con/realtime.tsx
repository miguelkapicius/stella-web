import { Mic, StopCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { useRef, useState, useEffect } from "react";
import Pusher from "pusher-js";

const isRecordingSupported =
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === "function" &&
  typeof window.MediaRecorder === "function";

export function RealtimeTest() {
  const [pusherConnected, setPusherConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [sendingSpeech, setSendingSpeech] = useState(false);
  const [sendingFace, setSendingFace] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    // Configurar Pusher apenas para receber mensagens do backend
    // pusher.current = new Pusher("6e145679d2e5714d4e58", {
    //   cluster: "us2",
    //   authEndpoint: "http://localhost:8000/pusher/auth",
    // });

    const pusher = new Pusher("6e145679d2e5714d4e58", {
      cluster: "us2",
      authEndpoint: "http://localhost:8000/pusher/auth",
    });

    // Eventos de conexão
    pusher.connection.bind("connected", () => {
      console.log("Pusher conectado!");
      setPusherConnected(true);
    });

    pusher.connection.bind("disconnected", () => {
      console.log("Pusher desconectado!");
      setPusherConnected(false);
    });

    // Inscreve no canal privado usado pelo backend
    const channel = pusher.subscribe("private-agent-123");

    // Bind aos eventos de saída do servidor (alinhados ao backend)
    const onSpeech = (data: any) => {
      console.log("server-speech-output recebido:", data);
      const stamp = new Date().toLocaleTimeString();
      setLastMessage(`[${stamp}] Speech Response: ${JSON.stringify(data)}`);
    };
    const onFace = (data: any) => {
      console.log("server-face-output recebido:", data);
      const stamp = new Date().toLocaleTimeString();
      setLastMessage(`[${stamp}] Face Response: ${JSON.stringify(data)}`);
    };
    channel.bind("server-speech-output", onSpeech);
    channel.bind("server-face-output", onFace);

    // Cleanup
    return () => {
      try {
        channel.unbind("server-speech-output", onSpeech);
        channel.unbind("server-face-output", onFace);
        pusher.current?.unsubscribe("private-agent-123");
      } finally {
        pusher.current?.disconnect();
      }
    };
  }, []);

  async function sendSpeechMessage() {
    const payload = {
      correlation_id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      timestamp: new Date().toISOString(),
      data: {
        text: "quero retirar 100 seringas",
        userId: "user123",
      },
    };

    setSendingSpeech(true);
    try {
      const res = await fetch("http://localhost:8000/api/speech", {
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
    } finally {
      setSendingSpeech(false);
    }
  }

  async function sendFaceMessage() {
    const payload = {
      correlation_id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      timestamp: new Date().toISOString(),
      data: {
        encoding: "base64_fake_encoding_here",
        userId: "user123",
      },
    };

    setSendingFace(true);
    try {
      const res = await fetch("http://localhost:8000/api/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
    } catch (e: unknown) {
      console.error("Falha ao enviar face via HTTP:", e);
    } finally {
      setSendingFace(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      {/* Status do Pusher */}
      <div
        className={`p-2 rounded-lg text-sm font-medium ${
          pusherConnected
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        Pusher: {pusherConnected ? "Conectado" : "Desconectado"}
      </div>

      {/* Botões de teste (envio via HTTP, recepção via Pusher) */}
      <div className="flex gap-4">
        <Button onClick={sendSpeechMessage} disabled={sendingSpeech}>
          Testar Speech
        </Button>
        <Button onClick={sendFaceMessage} disabled={sendingFace}>
          Testar Face
        </Button>
      </div>

      {/* Botão de gravação original */}
      <div className="flex gap-4">
        {isRecording ? (
          <Button variant={"destructive"} onClick={stopRecording}>
            Parar Gravação <StopCircle />
          </Button>
        ) : (
          <Button onClick={startRecording}>
            Iniciar Gravação <Mic />
          </Button>
        )}
      </div>

      {/* Mensagens do Pusher */}
      {lastMessage && (
        <div className="p-4 rounded-lg max-w-2xl">
          <p>
            <strong>Última mensagem:</strong> {lastMessage}
          </p>
        </div>
      )}
    </div>
  );
}
