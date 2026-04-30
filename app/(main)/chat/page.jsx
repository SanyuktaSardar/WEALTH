"use client";
import { useState } from "react";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: input,
        userId: "123",
      }),
    });

    const data = await res.json();

    setMessages([...messages, { user: input, bot: data.reply }]);
    setInput("");
  };

  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>
          <p><b>You:</b> {m.user}</p>
          <p><b>Bot:</b> {m.bot}</p>
        </div>
      ))}

      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}