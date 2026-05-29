import { ChatPage } from "@/components/chat/chat-page";
import { getLlmModel } from "@/lib/env";

export default function Home() {
  return <ChatPage model={getLlmModel()} />;
}
