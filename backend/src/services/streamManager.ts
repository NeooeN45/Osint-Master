// ============================================================================
// Stream Manager - Real-time progress streaming for OSINT operations
// ============================================================================

import { EventEmitter } from "events";
import { logger } from "../utils/logger";

export interface ProgressEvent {
  type: "start" | "progress" | "find" | "complete" | "error";
  toolId: string;
  target: string;
  message: string;
  progress: number; // 0-100
  details?: {
    currentStep?: string;
    totalSteps?: number;
    currentStepNumber?: number;
    itemsFound?: number;
    currentItem?: string;
    eta?: number; // seconds
    speed?: string; // items/minute
    toolResults?: number;
    duration?: number;
  };
  timestamp: string;
  data?: any;
}

export interface AnalysisSession {
  id: string;
  target: string;
  targetType: string;
  tools: string[];
  startTime: number;
  events: ProgressEvent[];
  status: "running" | "completed" | "error";
  results: any[];
  progress: number;
  currentTool?: string;
  itemsFound: number;
}

class StreamManager extends EventEmitter {
  private sessions: Map<string, AnalysisSession> = new Map();
  private clients: Map<string, Set<(event: ProgressEvent) => void>> = new Map();

  // Create a new analysis session
  createSession(sessionId: string, target: string, targetType: string, tools: string[]): AnalysisSession {
    const session: AnalysisSession = {
      id: sessionId,
      target,
      targetType,
      tools,
      startTime: Date.now(),
      events: [],
      status: "running",
      results: [],
      progress: 0,
      itemsFound: 0
    };
    
    this.sessions.set(sessionId, session);
    this.clients.set(sessionId, new Set());
    
    logger.info(`[STREAM] Created session ${sessionId} for ${target} (${targetType})`);
    
    this.emitEvent(sessionId, {
      type: "start",
      toolId: "system",
      target,
      message: `🔍 Starting analysis of ${target} (${targetType})`,
      progress: 0,
      details: {
        totalSteps: tools.length,
        currentStepNumber: 0,
        itemsFound: 0
      },
      timestamp: new Date().toISOString()
    });
    
    return session;
  }

  // Subscribe to session events
  subscribe(sessionId: string, callback: (event: ProgressEvent) => void): () => void {
    const clients = this.clients.get(sessionId);
    if (!clients) {
      logger.warn(`[STREAM] Session ${sessionId} not found for subscription`);
      return () => {};
    }
    
    clients.add(callback);
    
    // Send existing events to new subscriber
    const session = this.sessions.get(sessionId);
    if (session) {
      session.events.forEach(event => callback(event));
    }
    
    logger.info(`[STREAM] Client subscribed to session ${sessionId}`);
    
    // Return unsubscribe function
    return () => {
      clients.delete(callback);
      logger.info(`[STREAM] Client unsubscribed from session ${sessionId}`);
    };
  }

  // Emit event to all subscribers
  emitEvent(sessionId: string, event: ProgressEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Store event
    session.events.push(event);
    
    // Update session progress
    if (event.type === "progress") {
      session.progress = event.progress;
      session.currentTool = event.toolId;
    }
    if (event.type === "find") {
      session.itemsFound = event.details?.itemsFound || session.itemsFound + 1;
    }
    
    // Broadcast to subscribers
    const clients = this.clients.get(sessionId);
    if (clients) {
      clients.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          logger.error(`[STREAM] Error sending event to client:`, error);
        }
      });
    }
    
    // Also emit globally for logging
    this.emit("event", sessionId, event);
  }

  // Tool started
  toolStarted(sessionId: string, toolId: string, target: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const toolIndex = session.tools.indexOf(toolId);
    const progress = Math.round((toolIndex / session.tools.length) * 100);
    
    this.emitEvent(sessionId, {
      type: "progress",
      toolId,
      target,
      message: `🚀 Starting ${toolId}...`,
      progress,
      details: {
        currentStep: `Running ${toolId}`,
        totalSteps: session.tools.length,
        currentStepNumber: toolIndex + 1,
        itemsFound: session.itemsFound
      },
      timestamp: new Date().toISOString()
    });
    
    logger.info(`[STREAM] Tool ${toolId} started for session ${sessionId}`);
  }

  // Tool progress update
  toolProgress(sessionId: string, toolId: string, target: string, message: string, details?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const toolIndex = session.tools.indexOf(toolId);
    const baseProgress = (toolIndex / session.tools.length) * 100;
    const stepProgress = details?.stepProgress || 50;
    const progress = Math.round(baseProgress + (stepProgress / session.tools.length));
    
    this.emitEvent(sessionId, {
      type: "progress",
      toolId,
      target,
      message: `⏳ ${message}`,
      progress: Math.min(progress, 99),
      details: {
        ...details,
        currentStep: message,
        currentStepNumber: toolIndex + 1,
        itemsFound: session.itemsFound
      },
      timestamp: new Date().toISOString()
    });
  }

  // Item found
  itemFound(sessionId: string, toolId: string, target: string, itemType: string, itemValue: string, confidence: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.itemsFound++;
    
    const icons: Record<string, string> = {
      email: "📧",
      username: "👤",
      social: "🌐",
      domain: "🌐",
      ip: "🌐",
      phone: "📱",
      location: "📍",
      crypto: "₿",
      url: "🔗",
      breach: "⚠️"
    };
    
    const icon = icons[itemType] || "🔍";
    
    this.emitEvent(sessionId, {
      type: "find",
      toolId,
      target,
      message: `${icon} Found ${itemType}: ${itemValue}`,
      progress: session.progress,
      details: {
        itemsFound: session.itemsFound,
        currentItem: itemValue
      },
      timestamp: new Date().toISOString(),
      data: {
        type: itemType,
        value: itemValue,
        confidence,
        source: toolId
      }
    });
    
    logger.info(`[STREAM] ${toolId} found ${itemType}: ${itemValue} (conf: ${confidence})`);
  }

  // Tool completed
  toolCompleted(sessionId: string, toolId: string, target: string, result: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const toolIndex = session.tools.indexOf(toolId);
    const progress = Math.round(((toolIndex + 1) / session.tools.length) * 100);
    
    session.results.push(result);
    
    const success = result.success ? "✅" : "❌";
    const foundCount = result.entities?.length || result.parsed?.found || 0;
    
    this.emitEvent(sessionId, {
      type: "progress",
      toolId,
      target,
      message: `${success} ${toolId} completed - ${foundCount} items found`,
      progress,
      details: {
        currentStep: `${toolId} completed`,
        totalSteps: session.tools.length,
        currentStepNumber: toolIndex + 1,
        itemsFound: session.itemsFound,
        toolResults: foundCount
      },
      timestamp: new Date().toISOString(),
      data: result
    });
    
    logger.info(`[STREAM] Tool ${toolId} completed for session ${sessionId}: ${foundCount} items`);
  }

  // Session completed
  sessionCompleted(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.status = "completed";
    const duration = Math.round((Date.now() - session.startTime) / 1000);
    
    this.emitEvent(sessionId, {
      type: "complete",
      toolId: "system",
      target: session.target,
      message: `🎉 Analysis complete! ${session.itemsFound} items found in ${duration}s`,
      progress: 100,
      details: {
        itemsFound: session.itemsFound,
        totalSteps: session.tools.length,
        currentStepNumber: session.tools.length,
        duration
      },
      timestamp: new Date().toISOString(),
      data: {
        totalResults: session.results.length,
        totalEntities: session.itemsFound,
        duration
      }
    });
    
    logger.info(`[STREAM] Session ${sessionId} completed: ${session.itemsFound} items in ${duration}s`);
  }

  // Error occurred
  sessionError(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.status = "error";
    
    this.emitEvent(sessionId, {
      type: "error",
      toolId: session.currentTool || "system",
      target: session.target,
      message: `❌ Error: ${error}`,
      progress: session.progress,
      timestamp: new Date().toISOString()
    });
    
    logger.error(`[STREAM] Session ${sessionId} error:`, error);
  }

  // Get session status
  getSession(sessionId: string): AnalysisSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Get all active sessions
  getActiveSessions(): AnalysisSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === "running");
  }

  // Cleanup old sessions (older than 1 hour)
  cleanup(): void {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status !== "running" && (now - session.startTime) > oneHour) {
        this.sessions.delete(sessionId);
        this.clients.delete(sessionId);
        logger.info(`[STREAM] Cleaned up session ${sessionId}`);
      }
    }
  }
}

// Export singleton
export const streamManager = new StreamManager();

// Auto-cleanup every 10 minutes
setInterval(() => streamManager.cleanup(), 10 * 60 * 1000);
