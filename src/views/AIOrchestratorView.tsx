import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Plus, Settings, Terminal, Sparkles, RefreshCw, Layers, AlertCircle, CheckCircle, Clock, Play, Square, ChevronRight, Bot, User, Shield, Globe, Wifi, Database, FileText, Download } from "lucide-react";
import { toast } from "sonner";

// Types
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    toolsExecuted?: string[];
    confidence?: number;
    mode?: string;
  };
}

interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  tasks: Task[];
  createdAt: string;
}

// AI Modes
const AI_MODES = [
  { id: "analyze", name: "Analyze", icon: Shield, description: "Analyze target and suggest tools" },
  { id: "plan", name: "Plan", icon: FileText, description: "Create investigation plan" },
  { id: "execute", name: "Execute", icon: Play, description: "Run tools automatically" },
  { id: "conclude", name: "Conclude", icon: CheckCircle, description: "Compile final report" },
] as const;

export default function AIOrchestratorView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"analyze" | "plan" | "execute" | "conclude">("analyze");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Create new conversation
  const createConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New Investigation",
      messages: [{
        id: "welcome",
        role: "assistant",
        content: `👋 Welcome to **OSINT Master AI**

I'm your intelligent assistant for open-source investigations. I can:

🔍 **Analyze** - Understand your target and suggest optimal tools
📋 **Plan** - Create structured investigation workflows  
⚡ **Execute** - Run multiple tools automatically in background
📊 **Conclude** - Compile comprehensive reports with findings

**How to start:**
1. Enter a target (IP, email, username, domain)
2. Select a mode above
3. Let me handle the rest

What would you like to investigate?`,
        timestamp: new Date().toISOString(),
        metadata: { mode: "analyze" },
      }],
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    if (!activeConversation) {
      createConversation();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    // Add user message
    setConversations(prev => prev.map(c => 
      c.id === activeConversationId 
        ? { ...c, messages: [...c.messages, userMessage] }
        : c
    ));
    
    setInput("");
    setIsProcessing(true);

    // Simulate AI processing with tool execution
    try {
      // Extract target from input
      const target = extractTarget(input);
      
      if (target && mode === "execute") {
        // Execute tools in background
        await executeTools(target, mode);
      }

      // Generate AI response
      const aiResponse = await generateAIResponse(input, mode, target);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: { 
          mode,
          toolsExecuted: target ? ["geolocation", "whois", "shodan"] : undefined,
          confidence: target ? 87 : undefined,
        },
      };

      setConversations(prev => prev.map(c => 
        c.id === activeConversationId 
          ? { ...c, messages: [...c.messages, assistantMessage] }
          : c
      ));
    } catch (error) {
      toast.error("Failed to process request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute tools in background
  const executeTools = async (target: string, currentMode: string) => {
    const newTasks: Task[] = [
      { id: "1", name: `Geolocation lookup: ${target}`, status: "running", progress: 0 },
      { id: "2", name: "Network reconnaissance", status: "pending", progress: 0 },
      { id: "3", name: "Data cross-reference", status: "pending", progress: 0 },
    ];
    
    setTasks(newTasks);

    // Simulate progressive tool execution
    for (let i = 0; i < newTasks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTasks(prev => prev.map((t, idx) => 
        idx === i ? { ...t, status: "completed", progress: 100, completedAt: new Date().toISOString() } :
        idx === i + 1 ? { ...t, status: "running", progress: 20 } :
        t
      ));
    }

    toast.success("All tools executed successfully");
  };

  // Generate AI response
  const generateAIResponse = async (userInput: string, currentMode: string, target?: string): Promise<string> => {
    const lowerInput = userInput.toLowerCase();

    if (currentMode === "analyze") {
      if (target) {
        return `🔍 **Analysis of \`${target}\`**

**Target Type:** ${detectTargetType(target)}

**Recommended Investigation Path:**

1. **Initial Reconnaissance**
   - Geolocation lookup
   - Basic WHOIS/DNS records
   - Network identification

2. **Deep Investigation** 
   - OSINT tool aggregation
   - Social media correlation
   - Historical data analysis

3. **Cross-Reference Validation**
   - Multi-source verification
   - Confidence scoring
   - False-positive filtering

**Estimated Time:** 2-3 minutes

Type **"plan"** to create a detailed execution plan, or **"execute"** to run tools immediately.`;
      }
      return "Please provide a target (IP, email, username, or domain) for analysis.";
    }

    if (currentMode === "plan") {
      return `📋 **Investigation Plan Created**

**Phases:**

**Phase 1: Reconnaissance** (30s)
- IP geolocation via multiple sources
- ISP and network identification
- Basic metadata extraction

**Phase 2: Deep Scan** (90s)  
- Shodan network scan
- DNS enumeration
- Historical data lookup

**Phase 3: Validation** (30s)
- Cross-reference results
- Confidence calculation
- False-positive removal

**Total Duration:** ~2.5 minutes

Ready to execute? Click **Execute** mode and send "run".`;
    }

    if (currentMode === "execute") {
      return `⚡ **Execution Report**

✅ **Geolocation** - Completed
- Latitude: 48.8566
- Longitude: 2.3522
- Accuracy: ±50m
- Source: MaxMind, IPinfo

✅ **Network Scan** - Completed  
- ISP: Orange France
- Connection: Fiber
- VPN/Proxy: Not detected

✅ **Cross-Reference** - Completed
- Confidence: 87%
- Sources: 4 verified
- Warnings: None

**Next:** Type **"conclude"** for comprehensive summary.`;
    }

    if (currentMode === "conclude") {
      return `📊 **Final Investigation Report**

**Summary:**
Target successfully analyzed across 4 data sources with 87% confidence.

**Key Findings:**
- Location: Paris, France
- ISP: Orange France (Fiber)
- No anonymization detected
- Historical stability: High

**Sources Used:**
- MaxMind GeoIP2
- IPinfo.io
- Shodan
- IP-API

**Recommendations:**
1. Continue monitoring for changes
2. Investigate connected infrastructure
3. Cross-reference with social data if available

Investigation complete. Start a new investigation or export results.`;
    }

    return "I'm ready to help with your OSINT investigation. Please select a mode (Analyze, Plan, Execute, or Conclude) and provide your target.";
  };

  // Helper functions
  const extractTarget = (input: string): string | undefined => {
    const ipMatch = input.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (ipMatch) return ipMatch[0];
    
    const emailMatch = input.match(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/);
    if (emailMatch) return emailMatch[0];
    
    return undefined;
  };

  const detectTargetType = (target: string): string => {
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(target)) return "IP Address";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return "Email";
    return "Domain/Username";
  };

  return (
    <div className="h-full flex bg-slate-950 text-slate-200">
      {/* Sidebar - Conversations */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <button
            onClick={createConversation}
            className="w-full flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors border border-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Investigation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                activeConversationId === conv.id
                  ? "bg-slate-800 border border-slate-700"
                  : "hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{conv.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {conv.messages.length} messages
                  </p>
                </div>
              </div>
            </button>
          ))}
          
          {conversations.length === 0 && (
            <div className="text-center p-4 text-slate-500 text-sm">
              No investigations yet.
              <br />Create one to start.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mode Selector */}
        <div className="border-b border-slate-800 bg-slate-900/30 p-2">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            {AI_MODES.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as typeof mode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === m.id
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {activeConversation?.messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  message.role === "assistant" 
                    ? "bg-cyan-500/10 text-cyan-400" 
                    : "bg-slate-700 text-slate-300"
                }`}>
                  {message.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                
                <div className={`flex-1 max-w-[85%] ${message.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block text-left p-4 rounded-2xl ${
                    message.role === "assistant"
                      ? "bg-slate-900 border border-slate-800"
                      : "bg-cyan-500/10 border border-cyan-500/20"
                  }`}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      {message.content.split('\n').map((line, i) => (
                        <p key={i} className="mb-1 last:mb-0">
                          {line.startsWith('**') ? (
                            <span dangerouslySetInnerHTML={{ 
                              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1 rounded">$1</code>')
                            }} />
                          ) : line}
                        </p>
                      ))}
                    </div>
                    
                    {message.metadata?.toolsExecuted && (
                      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                        {message.metadata.toolsExecuted.map(tool => (
                          <span key={tool} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                            {tool}
                          </span>
                        ))}
                        {message.metadata.confidence && (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {message.metadata.confidence}% confidence
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {!activeConversation && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-200 mb-2">
                  Start Your Investigation
                </h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  Create a new investigation or select an existing one from the sidebar.
                </p>
                <button
                  onClick={createConversation}
                  className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-medium transition-colors"
                >
                  New Investigation
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-800 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={`${mode === "analyze" ? "Enter target to analyze..." : mode === "plan" ? "Describe your investigation goals..." : mode === "execute" ? "Confirm execution or modify plan..." : "Request final report..."}`}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                  disabled={isProcessing}
                />
                <button
                  onClick={sendMessage}
                  disabled={isProcessing || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 rounded-lg transition-colors"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Mode: <span className="text-cyan-400 capitalize">{mode}</span> • Press Enter to send
            </p>
          </div>
        </div>
      </main>

      {/* Right Panel - Task Status */}
      <aside className="w-72 border-l border-slate-800 bg-slate-900/30 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Task Status
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No active tasks.
              <br />Start an investigation.
            </div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  {task.status === "completed" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                  ) : task.status === "running" ? (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin mt-0.5" />
                  ) : task.status === "failed" ? (
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{task.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            task.status === "completed" ? "bg-emerald-500" :
                            task.status === "failed" ? "bg-red-500" :
                            "bg-cyan-500"
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Quick Stats
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <Globe className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <p className="text-lg font-semibold text-slate-200">
                {conversations.length}
              </p>
              <p className="text-xs text-slate-500">Investigations</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <Database className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <p className="text-lg font-semibold text-slate-200">
                {tasks.filter(t => t.status === "completed").length}
              </p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
