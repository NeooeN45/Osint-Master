import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { 
  OsintCase, 
  OsintEntity, 
  OsintRelation, 
  ChatMessage,
  AnalyzedImage,
  AnalyzedDocument,
  GeneratedProfile,
  InvestigationReport
} from "../types";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface CaseStore {
  cases: OsintCase[];
  activeCaseId: string | null;
  chatHistory: ChatMessage[];
  apiKeys: Record<string, string>;

  // Case actions
  createCase: (name: string, description?: string) => string;
  deleteCase: (id: string) => void;
  setActiveCase: (id: string | null) => void;
  getActiveCase: () => OsintCase | null;
  updateCase: (id: string, updates: Partial<OsintCase>) => void;

  // Entity actions
  addEntity: (entity: Omit<OsintEntity, "id" | "createdAt" | "updatedAt">) => string;
  updateEntity: (id: string, updates: Partial<OsintEntity>) => void;
  deleteEntity: (id: string) => void;

  // Relation actions
  addRelation: (relation: Omit<OsintRelation, "id" | "createdAt">) => string;
  deleteRelation: (id: string) => void;

  // Image analysis actions
  addImage: (image: Omit<AnalyzedImage, "id">) => string;
  updateImage: (id: string, updates: Partial<AnalyzedImage>) => void;
  deleteImage: (id: string) => void;
  getImageById: (id: string) => AnalyzedImage | null;
  findSimilarImages: (imageId: string) => string[];

  // Document analysis actions
  addDocument: (doc: Omit<AnalyzedDocument, "id">) => string;
  updateDocument: (id: string, updates: Partial<AnalyzedDocument>) => void;
  deleteDocument: (id: string) => void;
  getDocumentById: (id: string) => AnalyzedDocument | null;

  // Profile generation actions
  addProfile: (profile: Omit<GeneratedProfile, "id">) => string;
  updateProfile: (id: string, updates: Partial<GeneratedProfile>) => void;
  deleteProfile: (id: string) => void;
  getProfileById: (id: string) => GeneratedProfile | null;

  // Report actions
  addReport: (report: Omit<InvestigationReport, "id">) => string;
  updateReport: (id: string, updates: Partial<InvestigationReport>) => void;
  deleteReport: (id: string) => void;
  getReportById: (id: string) => InvestigationReport | null;

  // Chat
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearChat: () => void;

  // API Keys
  setApiKey: (tool: string, key: string) => void;
  getApiKey: (tool: string) => string;
}

export const useCaseStore = create<CaseStore>()(
  persist(
    (set, get) => ({
      cases: [],
      activeCaseId: null,
      chatHistory: [],
      apiKeys: {},

      createCase: (name, description) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newCase: OsintCase = {
          id,
          name,
          description,
          entities: [],
          relations: [],
          images: [],
          documents: [],
          profiles: [],
          reports: [],
          tags: [],
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ cases: [...s.cases, newCase], activeCaseId: id }));
        return id;
      },

      updateCase: (id, updates) => {
        const now = new Date().toISOString();
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: now } : c
          ),
        }));
      },

      deleteCase: (id) =>
        set((s) => ({
          cases: s.cases.filter((c) => c.id !== id),
          activeCaseId: s.activeCaseId === id ? null : s.activeCaseId,
        })),

      setActiveCase: (id) => set({ activeCaseId: id }),

      getActiveCase: () => {
        const { cases, activeCaseId } = get();
        return cases.find((c) => c.id === activeCaseId) ?? null;
      },

      addEntity: (entity) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newEntity: OsintEntity = { ...entity, id, createdAt: now, updatedAt: now };
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, entities: [...c.entities, newEntity], updatedAt: now }
              : c
          ),
        }));
        return id;
      },

      updateEntity: (id, updates) => {
        const now = new Date().toISOString();
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? {
                  ...c,
                  entities: c.entities.map((e) =>
                    e.id === id ? { ...e, ...updates, updatedAt: now } : e
                  ),
                }
              : c
          ),
        }));
      },

      deleteEntity: (id) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? {
                  ...c,
                  entities: c.entities.filter((e) => e.id !== id),
                  relations: c.relations.filter(
                    (r) => r.sourceId !== id && r.targetId !== id
                  ),
                }
              : c
          ),
        })),

      addRelation: (relation) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newRelation: OsintRelation = { ...relation, id, createdAt: now };
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, relations: [...c.relations, newRelation] }
              : c
          ),
        }));
        return id;
      },

      deleteRelation: (id) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, relations: c.relations.filter((r) => r.id !== id) }
              : c
          ),
        })),

      // Image actions
      addImage: (image) => {
        const id = generateId();
        const newImage: AnalyzedImage = { ...image, id };
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, images: [...c.images, newImage] }
              : c
          ),
        }));
        return id;
      },

      updateImage: (id, updates) => {
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? {
                  ...c,
                  images: c.images.map((img) =>
                    img.id === id ? { ...img, ...updates } : img
                  ),
                }
              : c
          ),
        }));
      },

      deleteImage: (id) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, images: c.images.filter((img) => img.id !== id) }
              : c
          ),
        })),

      getImageById: (id) => {
        const { cases, activeCaseId } = get();
        const activeCase = cases.find((c) => c.id === activeCaseId);
        return activeCase?.images.find((img) => img.id === id) ?? null;
      },

      findSimilarImages: (imageId) => {
        const { cases, activeCaseId } = get();
        const activeCase = cases.find((c) => c.id === activeCaseId);
        if (!activeCase) return [];
        
        const targetImage = activeCase.images.find((img) => img.id === imageId);
        if (!targetImage?.faceAnalysis?.faceDescriptors) return [];
        
        const similar: string[] = [];
        const targetEncodings = targetImage.faceAnalysis.faceDescriptors;
        
        for (const img of activeCase.images) {
          if (img.id === imageId) continue;
          if (!img.faceAnalysis?.faceDescriptors) continue;
          
          // Simple similarity check based on face count
          const commonFaces = img.faceAnalysis.faceDescriptors.some((face) =>
            targetEncodings.some((target) => {
              // Basic Euclidean distance comparison
              const distance = Math.sqrt(
                face.encoding.reduce((sum, val, i) => 
                  sum + Math.pow(val - (target.encoding[i] ?? 0), 2), 0
                )
              );
              return distance < 0.6; // Threshold for face similarity
            })
          );
          
          if (commonFaces) similar.push(img.id);
        }
        
        return similar;
      },

      // Document actions
      addDocument: (doc) => {
        const id = generateId();
        const newDoc: AnalyzedDocument = { ...doc, id };
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, documents: [...c.documents, newDoc] }
              : c
          ),
        }));
        return id;
      },

      updateDocument: (id, updates) => {
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? {
                  ...c,
                  documents: c.documents.map((doc) =>
                    doc.id === id ? { ...doc, ...updates } : doc
                  ),
                }
              : c
          ),
        }));
      },

      deleteDocument: (id) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, documents: c.documents.filter((doc) => doc.id !== id) }
              : c
          ),
        })),

      getDocumentById: (id) => {
        const { cases, activeCaseId } = get();
        const activeCase = cases.find((c) => c.id === activeCaseId);
        return activeCase?.documents.find((doc) => doc.id === id) ?? null;
      },

      // Profile actions
      addProfile: (profile) => {
        const id = generateId();
        const newProfile: GeneratedProfile = { ...profile, id };
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, profiles: [...c.profiles, newProfile] }
              : c
          ),
        }));
        return id;
      },

      updateProfile: (id, updates) => {
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? {
                  ...c,
                  profiles: c.profiles.map((p) =>
                    p.id === id ? { ...p, ...updates } : p
                  ),
                }
              : c
          ),
        }));
      },

      deleteProfile: (id) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, profiles: c.profiles.filter((p) => p.id !== id) }
              : c
          ),
        })),

      getProfileById: (id) => {
        const { cases, activeCaseId } = get();
        const activeCase = cases.find((c) => c.id === activeCaseId);
        return activeCase?.profiles.find((p) => p.id === id) ?? null;
      },

      // Report actions
      addReport: (report) => {
        const id = generateId();
        const newReport: InvestigationReport = { ...report, id };
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, reports: [...c.reports, newReport] }
              : c
          ),
        }));
        return id;
      },

      updateReport: (id, updates) => {
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? {
                  ...c,
                  reports: c.reports.map((r) =>
                    r.id === id ? { ...r, ...updates } : r
                  ),
                }
              : c
          ),
        }));
      },

      deleteReport: (id) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === s.activeCaseId
              ? { ...c, reports: c.reports.filter((r) => r.id !== id) }
              : c
          ),
        })),

      getReportById: (id) => {
        const { cases, activeCaseId } = get();
        const activeCase = cases.find((c) => c.id === activeCaseId);
        return activeCase?.reports.find((r) => r.id === id) ?? null;
      },

      addMessage: (msg) => {
        const id = generateId();
        const now = new Date().toISOString();
        set((s) => ({
          chatHistory: [...s.chatHistory, { ...msg, id, timestamp: now }],
        }));
      },

      clearChat: () => set({ chatHistory: [] }),

      setApiKey: (tool, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [tool]: key } })),

      getApiKey: (tool) => get().apiKeys[tool] ?? "",
    }),
    { name: "osint-master-store" }
  )
);
