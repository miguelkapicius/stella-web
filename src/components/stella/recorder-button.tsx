import { useSpeech } from "@/contexts/speech.context";
import { ConversationState } from "@/contexts/speech.types";
import { Button } from "../ui/button";
import { Mic, StopCircle } from "lucide-react";

export function RecorderButton() {
  const {
    isRecording,
    startRecording,
    stopRecording,
    conversationState,
    canListen,
  } = useSpeech();

  const isBusy =
    conversationState === ConversationState.Speaking ||
    conversationState === ConversationState.Paused;
  const disabled = (!isRecording && !canListen) || isBusy;

  return (
    <>
      {isRecording ? (
        <Button
          variant={"destructive"}
          onClick={stopRecording}
          disabled={disabled}
        >
          Parar Gravação <StopCircle />
        </Button>
      ) : (
        <Button onClick={startRecording} disabled={disabled}>
          Iniciar Gravação <Mic />
        </Button>
      )}
    </>
  );
}
