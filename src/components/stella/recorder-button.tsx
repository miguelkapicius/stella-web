import { useSpeech } from "@/contexts/speech.context";
import { Button } from "../ui/button";
import { Mic, StopCircle } from "lucide-react";

export function RecorderButton() {
  const { isRecording, startRecording, stopRecording } = useSpeech();

  return (
    <>
      {isRecording ? (
        <Button variant={"destructive"} onClick={stopRecording}>
          Parar Gravação <StopCircle />
        </Button>
      ) : (
        <Button onClick={startRecording}>
          Iniciar Gravação <Mic />
        </Button>
      )}
    </>
  );
}
