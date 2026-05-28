"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessageBubble, SuggestionChips } from "./chat-message";
import { WELCOME_MESSAGE } from "@/lib/finance-chat-model";

/**
 * Shared interactive chat panel.
 * @param {Object} props
 * @param {(text: string) => Promise<object>} props.onSend - returns structured message payload
 * @param {string} [props.className]
 * @param {boolean} [props.compact]
 */
export function ChatPanel({ onSend, className, compact = false }) {
  const [messages, setMessages] = useState([
    { role: "assistant", payload: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const suggestions = lastAssistant?.payload?.suggestions;

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", payload: msg }]);
    setLoading(true);

    try {
      const reply = await onSend(msg);
      setMessages((prev) => [...prev, { role: "assistant", payload: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          payload: {
            type: "text",
            title: "Something went wrong",
            body: err.message || "Please try again.",
            suggestions: WELCOME_MESSAGE.suggestions,
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={className}>
      <div
        className={
          compact
            ? "flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
            : "flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        }
      >
        {messages.map((msg, i) => (
          <div key={i} className="space-y-2">
            <ChatMessageBubble
              role={msg.role}
              payload={msg.payload}
              isUser={msg.role === "user"}
            />
            {msg.role === "assistant" &&
              i === messages.length - 1 &&
              !loading &&
              msg.payload?.suggestions && (
                <SuggestionChips
                  suggestions={msg.payload.suggestions}
                  onSelect={sendMessage}
                  disabled={loading}
                />
              )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2 pl-0">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your finances..."
          className="flex-1 text-sm rounded-xl"
          disabled={loading}
        />
        <Button
          size="icon"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="rounded-xl shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
