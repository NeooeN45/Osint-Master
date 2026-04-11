import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Trash2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCaseStore } from "../store/useCaseStore";

const SYSTEM_CONTEXT = (caseData: string) => `Tu es un expert en OSINT (Open Source Intelligence) et en analyse de données. 
Tu aides à corréler des informations, identifier des patterns et des relations entre entités.
Tu analyses les données du dossier actif et tu proposes des pistes d'investigation.

Données du dossier actif:
${caseData}

Réponds de manière concise, en français. Propose des actions concrètes et des corrélations.`;

export default function ChatView() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { chatHistory, addMessage, clearChat, getActiveCase, getApiKey } = useCaseStore();
  const activeCase = getActiveCase();

  useEffect(() => {
    const saved = getApiKey("openrouter");
    if (saved) setApiKey(saved);
  }, [getApiKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  const buildContext = () => {
    if (!activeCase) return "Aucun dossier actif.";
    return JSON.stringify(
      {
        name: activeCase.name,
        entities: activeCase.entities.map((e) => ({ type: e.type, value: e.value, confidence: e.confidence, tags: e.tags })),
        relations: activeCase.relations.map((r) => ({ type: r.type, label: r.label, strength: r.strength })),
      },
      null,
      2
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");

    addMessage({ role: "user", content: userMsg });
    setIsLoading(true);

    try {
      const messages = [
        { role: "system", content: SYSTEM_CONTEXT(buildContext()) },
        ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMsg },
      ];

      const key = apiKey || getApiKey("openrouter");
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://github.com/NeooeN45/Osint-Master",
          "X-Title": "OSINT Master",
        },
        body: JSON.stringify({
          model: "google/gemma-3-27b-it:free",
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "Erreur: réponse vide.";
      addMessage({ role: "assistant", content: reply });
    } catch (err) {
      addMessage({ role: "assistant", content: `❌ Erreur: ${String(err)}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-cyan" />
          <span className="text-sm font-semibold text-white">IA Corrélation OSINT</span>
          {activeCase && (
            <span className="text-xs text-slate-500 font-mono">
              — {activeCase.entities.length} entités disponibles
            </span>
          )}
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Effacer
        </button>
      </div>

      {/* API key if not set */}
      {!apiKey && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400">Clé API OpenRouter requise pour l'IA</span>
            <input
              type="password"
              placeholder="sk-or-..."
              className="flex-1 px-2 py-1 bg-surface-3 border border-border rounded text-xs text-white font-mono focus:outline-none focus:border-accent-cyan"
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Posez une question sur vos données OSINT</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {[
                "Quelles corrélations vois-tu entre les entités ?",
                "Résume le profil de cette cible",
                "Quelles pistes d'investigation suggères-tu ?",
                "Y a-t-il des red flags dans les données ?",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="px-3 py-1.5 bg-surface-3 border border-border rounded-full text-xs text-slate-400 hover:text-white hover:border-accent-cyan/50 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "user" ? "bg-accent-cyan/20" : "bg-accent-purple/20"
            }`}>
              {msg.role === "user"
                ? <User className="w-3.5 h-3.5 text-accent-cyan" />
                : <Bot className="w-3.5 h-3.5 text-accent-purple" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-accent-cyan/10 border border-accent-cyan/20 text-white rounded-tr-sm"
                : "bg-surface-3 border border-border text-slate-200 rounded-tl-sm"
            }`}>
              <ReactMarkdown
                components={{
                  code: ({ children }) => (
                    <code className="bg-surface-0 px-1 py-0.5 rounded text-xs font-mono text-accent-cyan">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-surface-0 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2 text-green-300">
                      {children}
                    </pre>
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
              <div className="text-[10px] text-slate-600 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-accent-purple" />
            </div>
            <div className="bg-surface-3 border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-accent-purple animate-spin" />
              <span className="text-xs text-slate-400">Analyse en cours...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-surface-1">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Analysez vos données OSINT, demandez des corrélations..."
            rows={2}
            className="flex-1 px-4 py-2.5 bg-surface-3 border border-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan transition-colors resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center w-10 h-10 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-xl hover:bg-accent-cyan/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
