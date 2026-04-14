// Mock case service - would connect to database in production
import { logger } from "../utils/logger";

interface Case {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  entities: unknown[];
  relations: unknown[];
  tags: string[];
}

const cases: Map<string, Case> = new Map();
let activeCaseId: string | null = null;

export const caseService = {
  async getAll(): Promise<Case[]> {
    return Array.from(cases.values());
  },

  async getById(id: string): Promise<Case | null> {
    return cases.get(id) || null;
  },

  async getActive(): Promise<Case | null> {
    if (!activeCaseId) return null;
    return cases.get(activeCaseId) || null;
  },

  async create(input: { name: string; description?: string; priority?: string; tags?: string[] }, userId?: string): Promise<Case> {
    const newCase: Case = {
      id: `case-${Date.now()}`,
      name: input.name,
      description: input.description,
      status: "active",
      priority: input.priority || "medium",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entities: [],
      relations: [],
      tags: input.tags || [],
    };
    cases.set(newCase.id, newCase);
    logger.info(`Created case: ${newCase.id}`);
    return newCase;
  },

  async update(id: string, input: Partial<Case>): Promise<Case> {
    const existing = cases.get(id);
    if (!existing) throw new Error("Case not found");
    const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
    cases.set(id, updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    cases.delete(id);
    if (activeCaseId === id) activeCaseId = null;
  },

  async setActive(id: string): Promise<Case> {
    if (!cases.has(id)) throw new Error("Case not found");
    activeCaseId = id;
    return cases.get(id)!;
  },

  async count(): Promise<number> {
    return cases.size;
  },

  async export(id: string): Promise<unknown> {
    const caseData = cases.get(id);
    if (!caseData) throw new Error("Case not found");
    return caseData;
  },

  async import(data: unknown): Promise<Case> {
    const imported = data as Case;
    imported.id = `imported-${Date.now()}`;
    cases.set(imported.id, imported);
    return imported;
  },
};
