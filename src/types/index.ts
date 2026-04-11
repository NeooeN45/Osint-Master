export type EntityType =
  | "person"
  | "email"
  | "phone"
  | "ip"
  | "domain"
  | "username"
  | "organization"
  | "location"
  | "vehicle"
  | "crypto"
  | "social"
  | "document"
  | "unknown";

export interface OsintEntity {
  id: string;
  type: EntityType;
  value: string;
  label?: string;
  metadata: Record<string, unknown>;
  tags: string[];
  confidence: number; // 0-100
  source: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  color?: string;
}

export interface OsintRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  strength: number; // 0-100
  source: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface OsintCase {
  id: string;
  name: string;
  description?: string;
  entities: OsintEntity[];
  relations: OsintRelation[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  status: "active" | "closed" | "archived";
}

export interface ToolResult {
  toolId: string;
  query: string;
  data: unknown;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  entities?: OsintEntity[];
}

export interface OsintTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  requiresKey?: boolean;
  keyName?: string;
  run: (query: string, apiKey?: string) => Promise<ToolResult>;
}

export type ToolCategory =
  | "network"
  | "social"
  | "identity"
  | "breach"
  | "geolocation"
  | "domain"
  | "image"
  | "phone"
  | "crypto"
  | "darkweb";
