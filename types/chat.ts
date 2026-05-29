export type MessageRole = "user" | "assistant";

export type MessageImage = {
  data: string;
  mimeType: string;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  images?: MessageImage[];
  createdAt: Date;
};

export type ChatRoom = {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
};
