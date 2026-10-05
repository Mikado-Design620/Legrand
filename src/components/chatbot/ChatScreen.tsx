import { useCallback, useEffect, useRef, useState } from "react";
import { AgentPanel } from "./AgentPanel";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { VoiceOverlay } from "./VoiceOverlay";
import { WelcomeState } from "./WelcomeState";
import { RotateCcw } from "lucide-react";
import type { AgentState, ChatMessage } from "@/lib/chatbot/types";
import { classify, buildResponse } from "@/lib/chatbot/scenarios";

const uid = () => Math.random().toString(36).slice(2, 10);

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [language, setLanguage] = useState<"EN" | "HI">("EN");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [returning, setReturning] = useState(false);
  const abortRef = useRef<{ abort: boolean }>({ abort: false });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReturning(localStorage.getItem("legrand-visited") === "1");
    localStorage.setItem("legrand-visited", "1");
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const updateLast = useCallback((patch: Partial<ChatMessage>) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") next[next.length - 1] = { ...last, ...patch };
      return next;
    });
  }, []);

  const handleSend = useCallback(
    async (input: string, attachment?: { name: string; type: string }) => {
      abortRef.current = { abort: false };
      const ctrl = abortRef.current;

      // User message
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        text: input,
        attachment,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Attachment scenario short-circuit
      if (attachment) {
        const assistantId = uid();
        setMessages((prev) => [...prev, {
          id: assistantId, role: "assistant", state: "thinking", createdAt: Date.now(),
        }]);
        setAgentState("thinking");
        setStreaming(true);
        await wait(900);
        if (ctrl.abort) { setStreaming(false); setAgentState("idle"); return; }
        updateLast({
          state: "done",
          text: `I analyzed ${attachment.name}. Here is what I found:`,
          blocks: [{
            kind: "attachment-analysis",
            filename: attachment.name,
            findings: [
              "Detected single-phase distribution with main isolator",
              "SPD position visible — appears to be Type 2 in sub-DB",
              "Conductor length to earth bar looks > 50 cm — review against the 50 cm rule",
              "No upstream Type 1 SPD identified in the diagram",
            ],
          }],
          suggestions: ["Show the 50 cm rule", "Do I need Type 1 here?", "Recommended SPD model"],
        });
        setAgentState("idle");
        setStreaming(false);
        return;
      }

      const kind = classify(input, [...messages, userMsg]);

      // 5% simulated error
      if (kind === "general" && Math.random() < 0.04) {
        setMessages((prev) => [...prev, {
          id: uid(), role: "assistant", state: "done", createdAt: Date.now(),
          blocks: [{ kind: "error" }],
          suggestions: ["Retry", "Ask something else"],
        }]);
        return;
      }

      // Build response
      const resp = buildResponse(kind, input);

      // Create placeholder assistant message
      const assistantId = uid();
      setMessages((prev) => [...prev, {
        id: assistantId, role: "assistant", state: "thinking", createdAt: Date.now(),
      }]);
      setAgentState("thinking");
      setStreaming(true);

      await wait(700);
      if (ctrl.abort) return finish();

      if (resp.showSearching) {
        updateLast({ state: "searching" });
        setAgentState("searching");
        await wait(1400);
        if (ctrl.abort) return finish();
      }

      // Start streaming text
      updateLast({ state: "responding", text: "", streaming: true });
      setAgentState("speaking");

      const fullText = resp.text ?? "";
      if (fullText.length > 0) {
        const tokens = fullText.split(/(\s+)/);
        let buffer = "";
        for (const t of tokens) {
          if (ctrl.abort) break;
          buffer += t;
          updateLast({ text: buffer });
          await wait(18 + Math.random() * 30);
        }
      } else {
        await wait(200);
      }

      // Attach blocks, citations, suggestions
      updateLast({
        streaming: false,
        state: "done",
        text: fullText,
        blocks: resp.blocks,
        citations: resp.citations,
        suggestions: resp.suggestions,
      });

      function finish() {
        setAgentState("idle");
        setStreaming(false);
      }
      finish();
    },
    [messages, updateLast],
  );

  const handleStop = useCallback(() => {
    abortRef.current.abort = true;
    updateLast({ streaming: false, state: "done" });
    setStreaming(false);
    setAgentState("idle");
  }, [updateLast]);

  const handleReset = () => setMessages([]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Agent */}
      <div className="hidden w-80 shrink-0 lg:block">
        <AgentPanel
          state={agentState}
          language={language}
          onToggleLanguage={() => setLanguage((l) => (l === "EN" ? "HI" : "EN"))}
          onStartVoice={() => setVoiceOpen(true)}
        />
      </div>

      {/* Conversation */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <span className="text-xs font-bold text-primary-foreground">L</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">SPD Training Session</div>
              <div className="text-[11px] text-muted-foreground">
                {messages.length === 0 ? "New conversation" : `${messages.length} messages · context retained`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
            {messages.length === 0 ? (
              <WelcomeState returning={returning} onPrompt={handleSend} />
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} message={m} onPrompt={handleSend} />
              ))
            )}

            {/* Conversation end card */}
            {messages.length >= 6 && !streaming && (
              <div className="animate-fade-up mx-auto mt-4 flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/50 px-6 py-5 text-center">
                <div className="text-sm font-medium text-foreground">Glad I could help.</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Continue learning", "Ask a new question", "Start over"].map((s) => (
                    <button
                      key={s}
                      onClick={() => (s === "Start over" ? handleReset() : handleSend(s))}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <Composer
          onSend={handleSend}
          onStartVoice={() => setVoiceOpen(true)}
          onStop={handleStop}
          streaming={streaming}
        />
      </main>

      <VoiceOverlay
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSubmit={(text) => handleSend(text)}
      />
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
