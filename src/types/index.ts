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
  | "image"
  | "face"
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
  images: AnalyzedImage[];
  documents: AnalyzedDocument[];
  profiles: GeneratedProfile[];
  reports: InvestigationReport[];
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

// ============ IMAGE ANALYSIS ============

export interface AnalyzedImage {
  id: string;
  fileName: string;
  dataUrl: string;
  thumbnailUrl: string;
  uploadedAt: string;
  exifData: ExifData | null;
  aiAnalysis: ImageAIAnalysis | null;
  faceAnalysis: FaceAnalysis | null;
  similarImages: string[];
  tags: string[];
  source: string;
  notes?: string;
}

export interface ExifData {
  camera?: string;
  lens?: string;
  dateTaken?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  software?: string;
  resolution?: string;
  orientation?: number;
  make?: string;
  model?: string;
  allTags: Record<string, unknown>;
}

export interface ImageAIAnalysis {
  description: string;
  objects: DetectedObject[];
  text: string[];
  locations: string[];
  people: string[];
  vehicles: string[];
  confidence: number;
  rawResponse: string;
  analyzedAt: string;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface FaceAnalysis {
  facesDetected: number;
  faceDescriptors: FaceDescriptor[];
  patterns: FacePattern[];
  ageEstimate?: number;
  genderEstimate?: string;
  emotions?: Record<string, number>;
}

export interface FaceDescriptor {
  id: string;
  encoding: number[];
  bbox: [number, number, number, number];
  confidence: number;
  landmarks?: Record<string, [number, number]>;
}

export interface FacePattern {
  patternId: string;
  type: "face_recognition" | "expression" | "age_progression" | "similarity";
  confidence: number;
  relatedImages: string[];
  description: string;
}

// ============ DOCUMENT ANALYSIS ============

export interface AnalyzedDocument {
  id: string;
  fileName: string;
  fileType: "pdf" | "image" | "doc" | "txt";
  dataUrl: string;
  uploadedAt: string;
  ocrText: string;
  metadata: DocumentMetadata;
  extractedEntities: ExtractedEntity[];
  summary?: string;
  tags: string[];
  pageCount?: number;
}

export interface DocumentMetadata {
  author?: string;
  creationDate?: string;
  modificationDate?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  producer?: string;
  creator?: string;
  pageCount?: number;
  fileSize: number;
  checksum: string;
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  context: string;
  confidence: number;
  page?: number;
}

// ============ PROFILE GENERATION ============

export interface GeneratedProfile {
  id: string;
  targetQuery: string;
  targetType: "person" | "company" | "phone" | "email" | "username";
  createdAt: string;
  status: "running" | "completed" | "failed";
  progress: number;
  dataSources: DataSourceResult[];
  socialAccounts: SocialAccount[];
  phonePatterns: PhonePattern[];
  digitalFootprint: DigitalFootprint;
  aiSummary: string;
  riskScore: number;
  confidence: number;
}

export interface DataSourceResult {
  source: string;
  category: ToolCategory;
  data: unknown;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface SocialAccount {
  platform: string;
  username?: string;
  url: string;
  profileData?: Record<string, unknown>;
  foundAt: string;
  confidence: number;
  posts?: SocialPost[];
}

export interface SocialPost {
  id: string;
  content: string;
  timestamp: string;
  url?: string;
  media?: string[];
  engagement?: Record<string, number>;
}

export interface PhonePattern {
  pattern: string;
  type: "format" | "carrier" | "location" | "owner";
  description: string;
  confidence: number;
  source: string;
}

export interface DigitalFootprint {
  emails: string[];
  phones: string[];
  usernames: string[];
  domains: string[];
  ips: string[];
  locations: string[];
  relatedPersons: string[];
  timeline: FootprintEvent[];
}

export interface FootprintEvent {
  date: string;
  type: string;
  description: string;
  source: string;
  confidence: number;
}

// ============ INVESTIGATION REPORTS ============

export interface InvestigationReport {
  id: string;
  title: string;
  type: "full" | "summary" | "evidence" | "timeline";
  createdAt: string;
  createdBy: string;
  caseId: string;
  sections: ReportSection[];
  evidence: EvidenceItem[];
  conclusions: string[];
  recommendations: string[];
  pdfUrl?: string;
  status: "draft" | "final" | "archived";
}

export interface ReportSection {
  id: string;
  title: string;
  type: "text" | "entities" | "relations" | "images" | "documents" | "timeline" | "profile" | "analysis";
  content: string;
  data?: unknown;
  order: number;
}

export interface EvidenceItem {
  id: string;
  type: "entity" | "relation" | "image" | "document" | "tool_result" | "chat";
  referenceId: string;
  description: string;
  timestamp: string;
  confidence: number;
  hash: string;
}
