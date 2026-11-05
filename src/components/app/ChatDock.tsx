import { ArrowUp, Loader2, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/holdings/Markdown";
import { useRepo } from "@/data/RepoContext";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const SUGGESTIONS = [
  "How did my portfolio do today",
  "Which holdings have the best return on cost",
  "Summarise the latest results for my largest position",
  "Which private companies am I invested in",
];

/** Floating assistant: answers questions from the signed-in user's own dashboard data. */
export function ChatDock() {
  const { repo } = useRepo();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const r = await repo.ask(q, conversationId);
      setConversationId(r.conversationId);
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e) {
      const msg = (e as Error).message;
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          error: true,
          content: /API key/i.test(msg)
            ? "The assistant isn't switched on yet. It needs an Anthropic API key added in Supabase (Edge Functions → Secrets → ANTHROPIC_API_KEY)."
            : `Something went wrong: ${msg}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Ask the assistant"}
        className="fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-ink text-paper shadow-[0_0_40px_rgba(94,240,176,0.25)] transition-transform hover:scale-105 md:right-6 md:bottom-6"
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Assistant"
          className="fixed inset-x-3 bottom-[calc(152px+env(safe-area-inset-bottom))] z-40 flex max-h-[min(640px,70dvh)] flex-col overflow-hidden rounded-[22px] border border-line bg-surface/95 shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-6 md:bottom-24 md:w-[420px]"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <div className="text-[15px]">Ask the dashboard</div>
              <div className="text-[12px] font-light text-ink-3">
                Answers from your holdings · research · private companies
              </div>
            </div>
            {msgs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMsgs([]);
                  setConversationId(null);
                }}
                className="text-[12px] text-ink-3 hover:text-ink"
              >
                New
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {msgs.length === 0 && (
              <div className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="block w-full rounded-[14px] border border-line px-4 py-3 text-left text-[14px] font-light text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[16px] bg-ink px-4 py-2.5 text-[14px] text-paper">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className={cn(
                    "text-[14px] leading-relaxed [&_h1]:text-[16px] [&_h2]:text-[15px] [&_h3]:text-[14px]",
                    m.error ? "text-loss" : "text-ink-2",
                  )}
                >
                  <Markdown>{m.content}</Markdown>
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-2 text-[13px] text-ink-3">
                <Loader2 className="size-4 animate-spin" /> Thinking
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2 border-t border-line p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Ask about your portfolio"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[14px] border border-line bg-paper px-4 py-3 text-[14px] font-light text-ink placeholder:text-ink-3 focus:border-brand/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-40"
            >
              <ArrowUp className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
