"use client";

import { Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatPanel } from "@/components/chat/chat-panel";

async function sendChatMessage(message) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Chat request failed");
  return data.reply;
}

export default function ChatPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-0">
      <div className="mb-6 flex justify-center md:justify-normal">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl gradient-title">Finance AI Chat</h1>
      </div>

      <Card className="flex h-[70vh] min-h-[520px] max-h-[760px] flex-col overflow-hidden">
        <CardHeader className="border-b pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Bot className="h-5 w-5 text-blue-500" />
            Powered by local AI — no external API
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 min-h-0 p-0">
          <ChatPanel
            className="flex flex-col flex-1 min-h-0"
            onSend={sendChatMessage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
