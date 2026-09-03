"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

interface SideBySideChatAgentProps {
  studentId?: string;
  studentName?: string;
  studentRollNo?: string;
  assessmentId?: string;
  batchName?: string;
}

export default function SideBySideChatAgent({
  studentId,
  studentName,
  studentRollNo,
  assessmentId,
  batchName,
}: SideBySideChatAgentProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: studentName
        ? `👋 Hello! I am your **AI Academic Coach**. I have loaded all diagnostic reports, test history, and subtopic data for **${studentName}** (${studentRollNo}). Ask me anything in plain text!`
        : "👋 Hello! I am your **AI Academic Coach**. Ask me any question about student performance, weak chapters, rankings, or draft messages for parents.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          studentId,
          assessmentId,
          history,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "model",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "model",
            text: `⚠️ **Error:** ${data.error || "Could not generate response. Please try again."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "model",
          text: "⚠️ **Network Error:** Failed to connect to AI Coach.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }

  const quickPrompts = [
    "📱 Draft WhatsApp message for Parent",
    "🔍 What are their weakest subtopics?",
    "📅 Give me a 7-day revision schedule",
    "📈 How is their score trending over time?",
  ];

  return (
    <div className="flex flex-col h-[700px] border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden sticky top-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 to-indigo-800 px-4 py-3.5 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold backdrop-blur-sm border border-white/20">
            🤖
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              AI Academic Coach
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>
            <p className="text-[11px] text-primary-100 line-clamp-1">
              {studentName ? `Context: ${studentName}` : "Active Report Assistant"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          title="Clear Chat History"
          className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition text-primary-50"
        >
          Clear
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
        <span className="text-slate-400 font-semibold uppercase text-[10px] shrink-0">Prompts:</span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            disabled={loading}
            className="shrink-0 bg-white hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full transition shadow-2xs font-medium"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs ${
                m.role === "user"
                  ? "bg-primary-600 text-white rounded-br-xs"
                  : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs leading-relaxed"
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{m.text}</div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs text-primary-600">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
                <span className="text-[11px] text-slate-500 font-medium ml-1">Analyzing report data...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={studentName ? `Ask about ${studentName.split(" ")[0]}'s performance...` : "Ask any question in plain text..."}
          disabled={loading}
          className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-slate-50/50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1 transition"
        >
          <span>Send</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>
    </div>
  );
}
