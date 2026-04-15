// ============================================================================
// TYPES COMMUNS POUR TOUS LES MODULES OSINT
// ============================================================================

export interface StreamEvent {
  type: "phase" | "tool_start" | "tool_done" | "entity_found" | "correlation" | "ai_analysis" | "recursive_launch" | "progress" | "complete" | "error" | "log";
  id: string;
  timestamp: string;
  data: any;
}

export interface DeepEntity {
  id: string;
  type: string;
  value: string;
  source: string;
  confidence: number;
  metadata: Record<string, any>;
  verified: boolean;
  depth: number;
  parentEntityId?: string;
}

export interface DeepCorrelation {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
  evidence: string;
  source: string;
}

export interface ModuleResult {
  success: boolean;
  data: any;
  entities: DeepEntity[];
  rawOutput?: string;
  executionTimeMs?: number;
}

export interface OSINTModule {
  id: string;
  name: string;
  category: string;
  targetTypes: string[];
  priority: number;
  rateLimit?: "none" | "normal" | "strict";
  maxConcurrent?: number;
  execute: (target: string, emit: (event: Partial<StreamEvent>) => void) => Promise<ModuleResult>;
  isAvailable: () => Promise<boolean>;
}

export type EmitFunction = (event: Partial<StreamEvent>) => void;

export interface InvestigationConfig {
  maxDepth: number;
  maxEntities: number;
  timeoutMs: number;
  enableAI: boolean;
  enableWebSearch: boolean;
  enableRecursive: boolean;
  recursiveThreshold: number;
  selectedModules: string[];
  targetType?: string;
}

// Helper pour créer un ID d'entité
export function makeEntityId(): string {
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
