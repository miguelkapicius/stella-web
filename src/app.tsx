import { useSpeech } from "./contexts/speech.context";
import GeneratingText from "./components/stella/generating-text";
import { StellaWave } from "./components/stella-wave";
import { MemoTypewriterTitle } from "./components/stella/typing-text";
import { Button } from "./components/ui/button";
import {
  AudioLines,
  AudioWaveformIcon,
  ChevronRight,
  FireExtinguisherIcon,
  Mic2Icon,
  MicIcon,
  MicOff,
  Square,
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
  } = useSpeech();

  console.log(isSpeaking);

  return (
    <div className="flex flex-col min-h-screen bg-stone-950 relative bg-[url(/bg.png)] space-y-20">
      <header className="h-20 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-baseline gap-2 w-full h-5 select-none">
          <AudioWaveformIcon className="size-5" />
          <h1 className="text-2xl font-medium tracking-tight inline">Stella</h1>
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
        <div>
          <div
            className={`rounded-full border border-input px-6 py-2 w-max mx-auto flex items-center gap-3 shadow ${
              chat.length > 0 && "hidden"
            }`}
          >
            <AudioLines /> Basta falar sua solicitação que eu cuido do resto
          </div>
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
        </div>
      </main>
      <footer>
        <div className="relative w-screen">
          <StellaWave
            speed={isRecording ? 0.03 : 0.02}
            color={isRecording ? "#0788D9" : "#05DBF2"}
            amplitude={isRecording ? 0.9 : 0.2}
            frequency={0.01}
            peak={isRecording ? 0.6 : 1}
            lineWidth={1.5}
            numberOfWaves={isRecording ? 15 : 3}
          />
          <button
            onClick={() => {
              isRecording ? stopRecording() : startRecording();
            }}
            className={cn(
              "top-1/2 left-1/2 z-50 absolute -translate-x-1/2 cursor-pointer p-4 rounded-full group shadow-xs hover:scale-110 duration-500 bg-gradient-to-br from-indigo-700 via-pink-800 to-orange-300",
              isRecording && "bg-[#0788D9]"
            )}
          >
            <div
              className={`size-full scale-150 border-[12px] animate-pulse absolute left-0 top-0 rounded-full z-10 ${
                !isRecording && "hidden"
              }`}
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
