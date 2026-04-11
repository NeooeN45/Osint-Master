import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OsintCase, OsintEntity, OsintRelation, ChatMessage } from "../types";

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

  // Entity actions
  addEntity: (entity: Omit<OsintEntity, "id" | "createdAt" | "updatedAt">) => string;
  updateEntity: (id: string, updates: Partial<OsintEntity>) => void;
  deleteEntity: (id: string) => void;

  // Relation actions
  addRelation: (relation: Omit<OsintRelation, "id" | "createdAt">) => string;
  deleteRelation: (id: string) => void;

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
          tags: [],
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ cases: [...s.cases, newCase], activeCaseId: id }));
        return id;
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
