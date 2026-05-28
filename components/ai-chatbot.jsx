"use client";

import { useState } from "react";
import { Bot, X, MessageCircle } from "lucide-react";
import { askFinanceAI } from "@/actions/ai-chat";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function AIChatbot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-green-600 to-blue-800 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open Finance Chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-800 text-white shrink-0">
            <Bot className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">Finance Assistant</p>
              <p className="text-xs opacity-80">Local · Private · Interactive</p>
            </div>
          </div>

          <ChatPanel
            compact
            className="flex flex-col flex-1 min-h-0"
            onSend={askFinanceAI}
          />
        </div>
      )}
    </>
  );
}
