import TypewriterTitle from "./components/stella/typing-text";
import GeneratingText from "./components/stella/generating-text";
import { RecorderButton } from "./components/stella/recorder-button";
import { useSpeech } from "./contexts/speech.context";

export function App() {
  const { transcript, isRecording } = useSpeech();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-16 px-6 flex items-center justify-center border-b mb-24">
        <h1 className="text-3xl font-medium text-center tracking-tight">
          Stella
        </h1>
      </header>
      <main className="max-w-4xl mx-auto flex flex-col items-start w-full px-6 space-y-4">
        <GeneratingText text="Gerando resposta..." />
        {!isRecording && (
          <TypewriterTitle
            sequences={[
              {
                text: transcript,
              },
            ]}
          />
        )}
        <RecorderButton />
      </main>
    </div>
  );
}
