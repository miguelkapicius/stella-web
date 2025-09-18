import { useSpeech } from "./contexts/speech.context";
import GeneratingText from "./components/stella/generating-text";
import { StellaWave } from "./components/stella-wave";
import { MemoTypewriterTitle } from "./components/stella/typing-text";

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
    <div className="flex flex-col min-h-screen bg-[#000000]">
      <div
        onClick={() => {
          isRecording ? stopRecording() : startRecording();
        }}
        className="fixed left-0 bottom-0 h-screen w-screen"
      >
        <header className="h-16 px-6 flex items-center justify-center border-b mb-24">
          <h1 className="text-3xl font-medium text-center tracking-tight">
            Stella
          </h1>
        </header>
        <main className="max-w-5xl mx-auto flex flex-col items-start w-full px-6 space-y-4">
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
            color={isRecording ? "#0B04D9" : "#A7BDD9"}
            amplitude={isRecording ? 0.9 : 0.2}
            frequency={0.01}
            peak={isRecording ? 0.6 : 1}
            lineWidth={1.5}
            numberOfWaves={isRecording ? 15 : 3}
          />
        </main>
      </div>
    </div>
  );
}
