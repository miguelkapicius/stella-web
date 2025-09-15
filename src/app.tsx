import { Button } from "./components/ui/button";

import { useSpeech } from "./contexts/speech.context";
import gifUser from "./assets/ios_9.gif";
import gifStella from "./assets/ios_7.gif";
import GeneratingText from "./components/stella/generating-text";
import TypewriterTitle from "./components/stella/typing-text";

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
      <header className="h-16 px-6 flex items-center justify-center border-b mb-24">
        <h1 className="text-3xl font-medium text-center tracking-tight">
          Stella
        </h1>
      </header>
      <main className="max-w-4xl mx-auto flex flex-col items-start w-full px-6 space-y-4">
        <div className="flex items-center justify-between w-full">
          {isRecording ? (
            <Button variant={"destructive"} onClick={() => stopRecording()}>
              Parar
            </Button>
          ) : (
            <Button variant={"outline"} onClick={() => startRecording()}>
              Iniciar
            </Button>
          )}

          <Button variant={"secondary"}>Chat</Button>
        </div>

        <main>
          {isRecording && <img src={gifUser} alt="GIF usuario" />}
          {isSpeaking && <img src={gifStella} alt="GIF stella" />}
        </main>
        <footer>
          {voiceLoading && <GeneratingText text={`Gerando resposta...`} />}
          {!voiceLoading &&
            chat.length > 0 &&
            chat[chat.length - 1].from !== "user" && (
              <TypewriterTitle
                sequences={[{ text: chat[chat.length - 1].text }]}
              />
            )}
        </footer>

        {/* {chat.map((message, i) => (
          <Fragment key={i}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {message.from === "stella" ? "Stella" : "Usuário"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{message.text}</CardDescription>
              </CardContent>
            </Card>
            {message.from === "stella" && <Separator />}
          </Fragment>
        ))} */}
      </main>
    </div>
  );
}
