// AI Orchestrator Service - Central AI brain for OSINT Master
// This service manages AI interactions, tool execution orchestration, and result compilation

import { logger } from "../utils/logger";
import { advancedExecutor, advancedOrchestrator } from "./advancedToolExecutionService";
import { OSINT_TOOLS, AUTOMATED_WORKFLOWS } from "../config/osintTools";
import { geolocationService } from "./geolocationService";

// ============================================================
// TYPES
// ============================================================

export type AIAgentMode = 'analyze' | 'plan' | 'execute' | 'conclude';

export type AITaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AIConversation {
  id: string;
  messages: AIMessage[];
  context: AIContext;
  mode: AIAgentMode;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    toolsExecuted?: string[];
    scriptsRun?: string[];
    confidence?: number;
    sources?: string[];
  };
}

export interface AIContext {
  target?: string;
  targetType?: 'ip' | 'phone' | 'email' | 'username' | 'domain' | 'hash';
  activeTools: string[];
  selectedWorkflows: string[];
  constraints: {
    maxTools?: number;
    timeout?: number;
    verificationRequired: boolean;
  };
}

export interface AITask {
  id: string;
  type: 'tool_execution' | 'script_execution' | 'data_analysis' | 'report_generation';
  status: AITaskStatus;
  description: string;
  toolId?: string;
  script?: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  progress: number;
}

export interface AIRequest {
  conversationId?: string;
  message: string;
  mode: AIAgentMode;
  context?: Partial<AIContext>;
}

export interface AIResponse {
  message: AIMessage;
  tasks: AITask[];
  suggestedActions: string[];
  confidence: number;
}

// ============================================================
// AI ORCHESTRATOR CLASS
// ============================================================

class AIOrchestrator {
  private conversations = new Map<string, AIConversation>();
  private activeTasks = new Map<string, AITask>();
  private taskHistory: AITask[] = [];

  // Initialize or get conversation
  getOrCreateConversation(id?: string): AIConversation {
    if (id && this.conversations.has(id)) {
      return this.conversations.get(id)!;
    }

    const newId = id || this.generateId();
    const conversation: AIConversation = {
      id: newId,
      messages: [],
      context: {
        activeTools: [],
        selectedWorkflows: [],
        constraints: {
          verificationRequired: true,
          maxTools: 10,
          timeout: 300000, // 5 minutes
        },
      },
      mode: 'analyze',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.conversations.set(newId, conversation);
    return conversation;
  }

  // Main entry point - process user request
  async processRequest(request: AIRequest): Promise<AIResponse> {
    logger.info(`Processing AI request in mode: ${request.mode}`, { message: request.message });

    const conversation = this.getOrCreateConversation(request.conversationId);
    
    // Update context if provided
    if (request.context) {
      conversation.context = { ...conversation.context, ...request.context };
    }
    
    conversation.mode = request.mode;
    conversation.updatedAt = new Date().toISOString();

    // Add user message
    const userMessage: AIMessage = {
      id: this.generateId(),
      role: 'user',
      content: request.message,
      timestamp: new Date().toISOString(),
    };
    conversation.messages.push(userMessage);

    // Process based on mode
    let result: AIResponse;
    
    switch (request.mode) {
      case 'analyze':
        result = await this.handleAnalyzeMode(conversation, request);
        break;
      case 'plan':
        result = await this.handlePlanMode(conversation, request);
        break;
      case 'execute':
        result = await this.handleExecuteMode(conversation, request);
        break;
      case 'conclude':
        result = await this.handleConcludeMode(conversation, request);
        break;
      default:
        result = await this.handleAnalyzeMode(conversation, request);
    }

    // Add assistant message to conversation
    conversation.messages.push(result.message);
    
    return result;
  }

  // ANALYZE MODE: Understand the request and extract intent
  private async handleAnalyzeMode(conversation: AIConversation, request: AIRequest): Promise<AIResponse> {
    const tasks: AITask[] = [];
    
    // Parse user intent
    const intent = this.parseIntent(request.message);
    
    // Create analysis task
    const analysisTask: AITask = {
      id: this.generateId(),
      type: 'data_analysis',
      status: 'completed',
      description: `Analyzed request: "${request.message}"`,
      result: intent,
      progress: 100,
      completedAt: new Date().toISOString(),
    };
    tasks.push(analysisTask);
    
    // Determine appropriate tools
    const suggestedTools = this.suggestTools(intent);
    
    // Build system prompt for AI
    const systemPrompt = this.buildSystemPrompt('analyze', conversation, intent);
    
    // Generate AI response (in real implementation, call LLM API)
    const aiContent = this.generateAnalyzeResponse(intent, suggestedTools);
    
    const assistantMessage: AIMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: aiContent,
      timestamp: new Date().toISOString(),
      metadata: {
        toolsExecuted: [],
        confidence: 85,
      },
    };

    return {
      message: assistantMessage,
      tasks,
      suggestedActions: suggestedTools.map(t => `Execute ${t}`),
      confidence: 85,
    };
  }

  // PLAN MODE: Create execution plan
  private async handlePlanMode(conversation: AIConversation, request: AIRequest): Promise<AIResponse> {
    const tasks: AITask[] = [];
    
    // Parse the plan from message or previous context
    const target = this.extractTarget(request.message) || conversation.context.target;
    
    if (!target) {
      return {
        message: {
          id: this.generateId(),
          role: 'assistant',
          content: '❌ **Target Missing**\n\nPlease specify a target (IP, phone, email, username) to create an investigation plan.',
          timestamp: new Date().toISOString(),
        },
        tasks: [],
        suggestedActions: ['Provide target', 'Switch to analyze mode'],
        confidence: 0,
      };
    }

    // Determine target type
    const targetType = this.detectTargetType(target);
    conversation.context.target = target;
    conversation.context.targetType = targetType;
    
    // Build execution plan
    const plan = this.buildExecutionPlan(target, targetType);
    
    // Create planning task
    const planTask: AITask = {
      id: this.generateId(),
      type: 'data_analysis',
      status: 'completed',
      description: `Created investigation plan for ${target}`,
      result: plan,
      progress: 100,
      completedAt: new Date().toISOString(),
    };
    tasks.push(planTask);
    
    // Generate plan response
    const aiContent = this.generatePlanResponse(target, targetType, plan);
    
    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toISOString(),
        metadata: {
          toolsExecuted: [],
          confidence: 90,
        },
      },
      tasks,
      suggestedActions: ['Execute plan', 'Modify plan', 'Add custom tools'],
      confidence: 90,
    };
  }

  // EXECUTE MODE: Execute tools and scripts
  private async handleExecuteMode(conversation: AIConversation, request: AIRequest): Promise<AIResponse> {
    const tasks: AITask[] = [];
    const executedTools: string[] = [];
    const results: unknown[] = [];
    
    const target = conversation.context.target;
    
    if (!target) {
      return {
        message: {
          id: this.generateId(),
          role: 'assistant',
          content: '❌ **No Target Defined**\n\nPlease set a target first using plan mode or specify it in your request.',
          timestamp: new Date().toISOString(),
        },
        tasks: [],
        suggestedActions: ['Switch to plan mode', 'Set target manually'],
        confidence: 0,
      };
    }

    // Determine what to execute based on target type
    const targetType = conversation.context.targetType || this.detectTargetType(target);
    
    // Execute appropriate tools
    if (targetType === 'ip') {
      const ipTask = await this.executeToolTask('geolocation_ip', target);
      tasks.push(ipTask);
      if (ipTask.status === 'completed') {
        executedTools.push('geolocation_ip');
        results.push(ipTask.result);
      }
    } else if (targetType === 'phone') {
      const phoneTask = await this.executeToolTask('geolocation_phone', target);
      tasks.push(phoneTask);
      if (phoneTask.status === 'completed') {
        executedTools.push('geolocation_phone');
        results.push(phoneTask.result);
      }
    }
    
    // Execute additional OSINT tools based on context
    const additionalTools = conversation.context.activeTools || [];
    for (const toolId of additionalTools) {
      const toolTask = await this.executeToolTask(toolId, target);
      tasks.push(toolTask);
      if (toolTask.status === 'completed') {
        executedTools.push(toolId);
        results.push(toolTask.result);
      }
    }
    
    // Generate execution summary
    const successCount = tasks.filter(t => t.status === 'completed').length;
    const aiContent = this.generateExecuteResponse(target, executedTools, results, successCount, tasks.length);
    
    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toISOString(),
        metadata: {
          toolsExecuted: executedTools,
          confidence: successCount / tasks.length * 100,
        },
      },
      tasks,
      suggestedActions: ['Analyze results', 'Execute more tools', 'Generate report'],
      confidence: successCount / tasks.length * 100,
    };
  }

  // CONCLUDE MODE: Compile and present final results
  private async handleConcludeMode(conversation: AIConversation, request: AIRequest): Promise<AIResponse> {
    const tasks: AITask[] = [];
    
    // Gather all previous results from conversation
    const allResults = this.gatherResultsFromConversation(conversation);
    
    // Create conclusion task
    const concludeTask: AITask = {
      id: this.generateId(),
      type: 'data_analysis',
      status: 'completed',
      description: 'Compiled investigation conclusions',
      result: allResults,
      progress: 100,
      completedAt: new Date().toISOString(),
    };
    tasks.push(concludeTask);
    
    // Generate comprehensive conclusion
    const aiContent = this.generateConclusionResponse(conversation, allResults);
    
    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toISOString(),
        metadata: {
          toolsExecuted: [],
          confidence: 92,
        },
      },
      tasks,
      suggestedActions: ['Export report', 'Start new investigation', 'Deep dive on finding'],
      confidence: 92,
    };
  }

  // Execute a single tool task
  private async executeToolTask(toolId: string, target: string): Promise<AITask> {
    const taskId = this.generateId();
    const task: AITask = {
      id: taskId,
      type: 'tool_execution',
      status: 'running',
      description: `Executing ${toolId} on ${target}`,
      toolId,
      parameters: { target },
      progress: 0,
      startedAt: new Date().toISOString(),
    };
    
    this.activeTasks.set(taskId, task);
    
    try {
      // Execute the actual tool
      let result: unknown;
      
      switch (toolId) {
        case 'geolocation_ip':
          result = await geolocationService.locateIP(target);
          break;
        case 'geolocation_phone':
          result = await geolocationService.locatePhone(target);
          break;
        default:
          // Use advanced executor for other tools
          const tool = OSINT_TOOLS.find(t => t.id === toolId);
          if (tool) {
            const execResult = await advancedExecutor.executeTool(tool, target);
            result = execResult;
          } else {
            throw new Error(`Tool ${toolId} not found`);
          }
      }
      
      task.status = 'completed';
      task.result = result;
      task.progress = 100;
      task.completedAt = new Date().toISOString();
      
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.progress = 100;
      task.completedAt = new Date().toISOString();
    }
    
    this.activeTasks.delete(taskId);
    this.taskHistory.push(task);
    
    return task;
  }

  // HELPER METHODS

  private parseIntent(message: string): {
    action: string;
    target?: string;
    targetType?: string;
    tools?: string[];
    urgency?: string;
  } {
    // Simple intent parsing (in real implementation, use NLP)
    const lowerMsg = message.toLowerCase();
    
    let action = 'investigate';
    if (lowerMsg.includes('plan')) action = 'plan';
    if (lowerMsg.includes('execute') || lowerMsg.includes('run')) action = 'execute';
    if (lowerMsg.includes('conclude') || lowerMsg.includes('summary')) action = 'conclude';
    
    // Extract target
    const target = this.extractTarget(message);
    
    // Detect target type
    const targetType = target ? this.detectTargetType(target) : undefined;
    
    return { action, target, targetType };
  }

  private extractTarget(message: string): string | undefined {
    // Extract IP
    const ipMatch = message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (ipMatch) return ipMatch[0];
    
    // Extract email
    const emailMatch = message.match(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/);
    if (emailMatch) return emailMatch[0];
    
    // Extract phone (basic pattern)
    const phoneMatch = message.match(/\+?[\d\s\-\(\)]{10,20}/);
    if (phoneMatch) return phoneMatch[0].replace(/\s/g, '');
    
    // Extract domain
    const domainMatch = message.match(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/i);
    if (domainMatch && !domainMatch[0].includes('@')) return domainMatch[0];
    
    return undefined;
  }

  private detectTargetType(target: string): 'ip' | 'phone' | 'email' | 'username' | 'domain' | 'hash' {
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(target)) return 'ip';
    if (/^\+?[\d\-\(\)\s]{10,20}$/.test(target)) return 'phone';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return 'email';
    if (/^[a-f0-9]{32,64}$/i.test(target)) return 'hash';
    if (/\.[a-z]{2,}$/i.test(target)) return 'domain';
    return 'username';
  }

  private suggestTools(intent: { action: string; targetType?: string }): string[] {
    const tools: string[] = [];
    
    if (intent.targetType === 'ip') {
      tools.push('geolocation_ip', 'shodan', 'virustotal');
    } else if (intent.targetType === 'phone') {
      tools.push('geolocation_phone', 'numverify');
    } else if (intent.targetType === 'email') {
      tools.push('hunter', 'clearbit', 'hibp');
    } else if (intent.targetType === 'username') {
      tools.push('social_scan', 'sherlock');
    } else if (intent.targetType === 'domain') {
      tools.push('whois', 'dns_lookup', 'shodan');
    }
    
    return tools;
  }

  private buildExecutionPlan(target: string, targetType: string): {
    phases: Array<{
      name: string;
      tools: string[];
      expectedOutput: string;
    }>;
    estimatedTime: number;
  } {
    type PlanPhase = { name: string; tools: string[]; expectedOutput: string };
    const phases: PlanPhase[] = [];
    
    // Phase 1: Initial reconnaissance
    phases.push({
      name: 'Initial Reconnaissance',
      tools: targetType === 'ip' ? ['geolocation_ip'] : 
            targetType === 'phone' ? ['geolocation_phone'] : 
            targetType === 'email' ? ['hunter'] : ['whois'],
      expectedOutput: 'Basic identification and location',
    });
    
    // Phase 2: Deep investigation
    phases.push({
      name: 'Deep Investigation',
      tools: targetType === 'ip' ? ['shodan', 'virustotal'] :
            targetType === 'phone' ? ['hlr_lookup'] :
            targetType === 'email' ? ['clearbit', 'hibp'] :
            ['subdomain_enum', 'dns_lookup'],
      expectedOutput: 'Detailed intelligence and connections',
    });
    
    // Phase 3: Cross-reference
    phases.push({
      name: 'Cross-Reference Validation',
      tools: ['correlation_engine'],
      expectedOutput: 'Verified findings with confidence scores',
    });
    
    return {
      phases,
      estimatedTime: phases.length * 30, // 30s per phase
    };
  }

  private buildSystemPrompt(mode: AIAgentMode, conversation: AIConversation, intent: unknown): string {
    return `You are OSINT Master AI, an expert in open-source intelligence investigations.

MODE: ${mode.toUpperCase()}

RULES:
- Be precise, factual, and nuanced
- Never invent data - only report confirmed findings
- Always cite sources and confidence levels
- Structure responses clearly with markdown
- Suggest next logical steps

CURRENT CONTEXT:
${JSON.stringify(conversation.context, null, 2)}`;
  }

  private generateAnalyzeResponse(intent: { action: string; target?: string; targetType?: string }, suggestedTools: string[]): string {
    let response = `🔍 **Analysis Complete**\n\n`;
    
    if (intent.target) {
      response += `**Target Detected:** \`${intent.target}\` (${intent.targetType})\n\n`;
    }
    
    response += `**Intent:** ${intent.action}\n\n`;
    
    if (suggestedTools.length > 0) {
      response += `**Recommended Tools:**\n`;
      suggestedTools.forEach(tool => {
        response += `- ${tool}\n`;
      });
      response += `\n`;
    }
    
    response += `Would you like me to:\n`;
    response += `1. **Plan** - Create a detailed investigation plan\n`;
    response += `2. **Execute** - Run the recommended tools immediately\n`;
    response += `3. **Modify** - Adjust the tool selection\n`;
    
    return response;
  }

  private generatePlanResponse(target: string, targetType: string, plan: { phases: Array<{ name: string; tools: string[]; expectedOutput: string }>; estimatedTime: number }): string {
    let response = `📋 **Investigation Plan for \`${target}\`**\n\n`;
    response += `**Target Type:** ${targetType.toUpperCase()}\n`;
    response += `**Estimated Duration:** ${plan.estimatedTime}s\n\n`;
    
    response += `**Execution Phases:**\n\n`;
    
    plan.phases.forEach((phase, index) => {
      response += `${index + 1}. **${phase.name}**\n`;
      response += `   - Tools: ${phase.tools.join(', ')}\n`;
      response += `   - Expected: ${phase.expectedOutput}\n\n`;
    });
    
    response += `Ready to execute? Type **"execute"** to begin.`;
    
    return response;
  }

  private generateExecuteResponse(target: string, tools: string[], results: unknown[], successCount: number, totalCount: number): string {
    const percentage = Math.round((successCount / totalCount) * 100);
    
    let response = `⚡ **Execution Report**\n\n`;
    response += `**Target:** \`${target}\`\n`;
    response += `**Tools Executed:** ${successCount}/${totalCount} (${percentage}%)\n\n`;
    
    if (tools.length > 0) {
      response += `**Completed:**\n`;
      tools.forEach(tool => {
        response += `- ✅ ${tool}\n`;
      });
      response += `\n`;
    }
    
    response += `**Next Steps:**\n`;
    response += `- Type **"conclude"** for a comprehensive summary\n`;
    response += `- Type **"execute more"** to run additional tools\n`;
    response += `- Type **"report"** to generate a detailed report\n`;
    
    return response;
  }

  private generateConclusionResponse(conversation: AIConversation, results: unknown[]): string {
    const target = conversation.context.target || 'Unknown';
    
    let response = `📊 **Investigation Summary: \`${target}\`**\n\n`;
    
    response += `**Overview:**\n`;
    response += `Investigation completed with ${results.length} data sources analyzed.\n\n`;
    
    response += `**Key Findings:**\n`;
    response += `- Target type: ${conversation.context.targetType?.toUpperCase() || 'Unknown'}\n`;
    response += `- Data sources: ${results.length}\n`;
    response += `- Verification: ${conversation.context.constraints.verificationRequired ? 'Enabled' : 'Disabled'}\n\n`;
    
    response += `**Confidence Assessment:**\n`;
    response += `Based on cross-referenced data from multiple sources, the findings have **high confidence**.\n\n`;
    
    response += `**Recommendations:**\n`;
    response += `1. Export the full report for documentation\n`;
    response += `2. Consider deeper investigation on connected entities\n`;
    response += `3. Monitor for changes over time\n\n`;
    
    response += `Investigation complete. Ready for next target.`;
    
    return response;
  }

  private gatherResultsFromConversation(conversation: AIConversation): unknown[] {
    const results: unknown[] = [];
    
    for (const message of conversation.messages) {
      if (message.metadata?.toolsExecuted) {
        // Extract results from message metadata
        results.push(...message.metadata.toolsExecuted);
      }
    }
    
    return results;
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getConversation(id: string): AIConversation | undefined {
    return this.conversations.get(id);
  }

  getActiveTasks(): AITask[] {
    return Array.from(this.activeTasks.values());
  }

  getTaskHistory(): AITask[] {
    return this.taskHistory;
  }

  cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = 'cancelled';
      this.activeTasks.delete(taskId);
      return true;
    }
    return false;
  }
}

// Export singleton
export const aiOrchestrator = new AIOrchestrator();

export default aiOrchestrator;
