"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/lib/api";

interface AIChatPanelProps {
  playerId: string;
  userPlan: "free" | "pro";
  locale: string;
}

export default function AIChatPanel({ playerId, userPlan, locale }: AIChatPanelProps) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    try {
      // Use fetch directly for SSE (axios doesn't handle streams well)
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const { data: { session } } = await (await import("@/lib/supabase")).supabase.auth.getSession();

      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          player_id: playerId,
          message: trimmed,
          history: messages,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Stream error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let done_signal = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") { done_signal = true; break; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamingText(accumulated);
            }
          } catch { /* skip malformed */ }
        }
        if (done_signal) break;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("error") }]);
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  };

  if (userPlan !== "pro") {
    return (
      <div className="relative rounded overflow-hidden">
        <div className="blur-sm pointer-events-none">
          <div className="h-48 bg-surface-muted rounded border border-surface-border flex items-center justify-center">
            <p className="font-serif text-ink-muted">{t("placeholder")}</p>
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-card/85 backdrop-blur-sm rounded">
          <span className="text-2xl">🔒</span>
          <p className="font-display font-bold text-navy text-lg">{t("proOnly")}</p>
          <a href={`/${locale}/billing`}
            className="px-4 py-2 bg-gold hover:bg-gold-dark text-navy font-sans text-sm font-semibold uppercase tracking-wide rounded-lg transition-colors">
            {t("upgrade")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Message history */}
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-surface-muted rounded p-4 space-y-3 border border-surface-border">
        {messages.length === 0 && !streaming && (
          <p className="font-serif text-ink-muted text-sm text-center pt-8">{t("placeholder")}</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-2 rounded-lg text-sm font-serif ${
              msg.role === "user"
                ? "bg-navy text-white rounded-br-none"
                : "bg-surface-card border border-surface-border text-ink rounded-bl-none"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {streaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-2 rounded-lg text-sm font-serif bg-surface-card border border-surface-border text-ink rounded-bl-none">
              {streamingText}
              <span className="inline-block w-1.5 h-4 bg-gold ml-0.5 animate-pulse align-middle" />
            </div>
          </div>
        )}
        {streaming && !streamingText && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-lg text-sm bg-surface-card border border-surface-border text-ink-muted">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={t("inputPlaceholder")}
          disabled={streaming}
          className="flex-1 px-4 py-3 bg-surface-card border border-navy rounded-lg font-serif text-ink placeholder-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold disabled:opacity-50 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          className="px-5 py-3 bg-navy hover:bg-navy-dark text-white font-sans text-sm font-semibold uppercase tracking-wide rounded-lg disabled:opacity-50 transition-colors"
        >
          {streaming ? "..." : t("send")}
        </button>
      </div>
    </div>
  );
}
