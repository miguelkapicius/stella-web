import { useSpeech } from "./contexts/speech.context";
import { ConversationState } from "./contexts/speech.types";
import GeneratingText from "./components/stella/generating-text";
import { StellaWave } from "./components/stella-wave";
import { MemoTypewriterTitle } from "./components/stella/typing-text";
import { Button } from "./components/ui/button";
import {
  AudioLines,
  AudioWaveformIcon,
  ChevronRight,
  MicIcon,
  MicOff,
} from "lucide-react";
import { Separator } from "./components/ui/separator";
import { cn } from "./lib/utils";

export function App() {
  const {
    chat,
    startRecording,
    stopRecording,
    isRecording,
    voiceLoading,
    isSpeaking,
    conversationState,
    activateByTouch,
    isHotwordArmed,
    canListen,
  } = useSpeech();

  const isIdle = conversationState === ConversationState.Idle;
  const isWaking = conversationState === ConversationState.WakeListening;
  const isListening = conversationState === ConversationState.ActiveListening;
  const isBusy = conversationState === ConversationState.Speaking;

  const waveSpeed = isListening ? 0.03 : 0.02;
  const waveColor = isListening
    ? "#0788D9"
    : isWaking
    ? "#38bdf8"
    : "#05DBF2";
  const waveAmplitude = isListening ? 0.9 : isBusy ? 0.4 : 0.2;
  const wavePeak = isListening ? 0.6 : 1;
  const waveCount = isListening ? 15 : 4;

  const canToggleMic = canListen || isRecording;

  return (
    <div className="relative min-h-screen bg-stone-950">
      <div
        className={cn(
          "flex flex-col min-h-screen bg-[url(/bg.png)] space-y-20 transition-all duration-500",
          isIdle ? "opacity-40 blur-sm" : "opacity-100"
        )}
      >
        <header className="h-20 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-baseline gap-2 w-full h-5 select-none">
            <AudioWaveformIcon className="size-5" />
            <h1 className="text-2xl font-medium tracking-tight inline">
              Stella
            </h1>
            <Separator orientation="vertical" className="bg-stone-50" />
            <span className="text-lg flex items-center font-light">
              Voice Assistant
            </span>
          </div>
          <Button variant={"outline"}>
            Dashboard <ChevronRight />
          </Button>
        </header>
        <main className="max-w-7xl mx-auto w-full mb-52">
          <div className="space-y-12">
            <div
              className={cn(
                "rounded-full border border-input/70 px-6 py-2 w-max mx-auto flex items-center gap-3 shadow transition-all duration-500",
                chat.length > 0 && !isIdle ? "opacity-0 pointer-events-none" : "opacity-100"
              )}
            >
              <AudioLines /> Basta falar sua solicitação que eu cuido do resto
            </div>
            <div className="flex flex-col items-center gap-6">
              <MemoTypewriterTitle
                sequences={[
                  {
                    text:
                      chat.length > 0
                        ? chat[chat.length - 1].text
                        : "Olá! Seja bem-vindo à sua Assistente Virtual de Estoque",
                  },
                ]}
              />
              {voiceLoading && !isSpeaking && (
                <GeneratingText text="Gerando resposta..." />
              )}
            </div>
          </div>
        </main>
        <footer>
          <div className="relative w-screen">
            <StellaWave
              speed={waveSpeed}
              color={waveColor}
              amplitude={waveAmplitude}
              frequency={0.01}
              peak={wavePeak}
              lineWidth={1.5}
              numberOfWaves={waveCount}
            />
            <button
              onClick={() => {
                if (!canToggleMic) return;
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              disabled={!canToggleMic}
              aria-pressed={isRecording}
              className={cn(
                "top-1/2 left-1/2 z-50 absolute -translate-x-1/2 cursor-pointer p-4 rounded-full group shadow-xs duration-500 bg-gradient-to-br from-indigo-700 via-pink-800 to-orange-300",
                isRecording && "bg-[#0788D9]",
                !canToggleMic && "opacity-60 pointer-events-none"
              )}
            >
              <div
                className={cn(
                  "size-full scale-150 border-[12px] animate-pulse absolute left-0 top-0 rounded-full z-10",
                  !isRecording && "hidden"
                )}
              />
              {isRecording ? (
                <MicOff className="size-10 group-hover:scale-105 duration-400" />
              ) : (
                <MicIcon className="size-10 group-hover:scale-105 duration-400" />
              )}
            </button>
          </div>
        </footer>
      </div>

      <div
        role="button"
        tabIndex={isIdle ? 0 : -1}
        onKeyDown={(event) => {
          if (!isIdle) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activateByTouch();
          }
        }}
        onClick={() => {
          if (isIdle) {
            activateByTouch();
          }
        }}
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center text-center px-6 transition-opacity duration-500",
          "bg-stone-950/90 backdrop-blur-sm",
          isIdle ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight text-stone-50">
            Diga “Stella” ou clique em qualquer lugar
          </h2>
          <p className="text-base md:text-lg text-stone-300 max-w-xl mx-auto">
            Assim que eu ouvir você, iniciarei uma nova sessão para te ajudar com
            o estoque em tempo real.
          </p>
          <div className="flex items-center justify-center gap-3">
            <span
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium border",
                isHotwordArmed
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-400/40 bg-amber-500/10 text-amber-200"
              )}
            >
              {isHotwordArmed
                ? "Hotword pronta para ouvir"
                : "Autorize o microfone para usar a hotword"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

{
  /* <div
        onClick={() => {
          isRecording ? stopRecording() : startRecording();
        }}
        className="fixed left-0 bottom-0 h-screen w-screen bg-transparent"
      >
        <header className="h-16 px-6 flex items-center justify-center mb-24">
          <h1 className="text-4xl font-light text-center select-none">
            Stella
          </h1>
        </header>
        <main className="w-screen space-y-4">
          <div className="max-w-5xl mx-auto flex flex-col items-start"></div>
          {voiceLoading && <GeneratingText text={`Gerando resposta...`} />}
          {!voiceLoading &&
            chat.length > 0 &&
            chat[chat.length - 1].from !== "user" && (
              <div className="mx-auto text-center">
                <MemoTypewriterTitle
                  key={chat[chat.length - 1].text}
                  sequences={[{ text: chat[chat.length - 1].text }]}
                />
              </div>
            )}
          <StellaWave
            speed={isRecording ? 0.03 : 0.02}
            color={isRecording ? "#0B04D9" : "#05DBF2"}
            amplitude={isRecording ? 0.9 : 0.2}
            frequency={0.01}
            peak={isRecording ? 0.6 : 1}
            lineWidth={1.5}
            numberOfWaves={isRecording ? 15 : 3}
          />
        </main>
      </div> */
}
