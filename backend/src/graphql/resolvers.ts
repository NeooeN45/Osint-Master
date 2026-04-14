import type { IResolvers } from "@graphql-tools/utils";
import { GraphQLScalarType } from "graphql";
import { logger } from "../utils/logger";
import { caseService } from "../services/caseService";
import { entityService } from "../services/entityService";
import { relationService } from "../services/relationService";
import { findingService } from "../services/findingService";
import { reportService } from "../services/reportService";
import { monitorService } from "../services/monitorService";
import { shodanService } from "../services/osint/shodanService";
import { censysService } from "../services/osint/censysService";
import { darkwebService } from "../services/osint/darkwebService";
import { socialService } from "../services/osint/socialService";
import { ctService } from "../services/osint/ctService";
import { dnsService } from "../services/osint/dnsService";
import { scanService } from "../services/scanService";
import { pubsub } from "./pubsub";

// Custom scalars
const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "Date custom scalar type",
  serialize(value: unknown) {
    if (value instanceof Date) return value.toISOString();
    return value;
  },
  parseValue(value: unknown) {
    if (typeof value === "string") return new Date(value);
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === "StringValue") return new Date(ast.value);
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "JSON custom scalar type",
  serialize(value: unknown) {
    return value;
  },
  parseValue(value: unknown) {
    return value;
  },
  parseLiteral() {
    return null;
  },
});

export const resolvers: IResolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    // Cases
    cases: async () => {
      return caseService.getAll();
    },

    case: async (_, { id }) => {
      return caseService.getById(id);
    },

    activeCase: async () => {
      return caseService.getActive();
    },

    // Entities
    entities: async (_, { caseId, type }) => {
      return entityService.getAll(caseId, type);
    },

    entity: async (_, { id }) => {
      return entityService.getById(id);
    },

    searchEntities: async (_, { query, filters }) => {
      const startTime = Date.now();
      const results = await entityService.search(query, filters);
      return {
        ...results,
        query,
        executionTime: Date.now() - startTime,
      };
    },

    // Relations
    relations: async (_, { caseId, entityId }) => {
      return relationService.getAll(caseId, entityId);
    },

    relationGraph: async (_, { caseId, depth }) => {
      return relationService.getGraph(caseId, depth);
    },

    // Findings
    findings: async (_, { caseId, severity }) => {
      return findingService.getAll(caseId, severity);
    },

    finding: async (_, { id }) => {
      return findingService.getById(id);
    },

    // Reports
    reports: async (_, { caseId }) => {
      return reportService.getAll(caseId);
    },

    report: async (_, { id }) => {
      return reportService.getById(id);
    },

    // Monitors
    monitors: async () => {
      return monitorService.getAll();
    },

    monitor: async (_, { id }) => {
      return monitorService.getById(id);
    },

    alerts: async (_, { monitorId, status }) => {
      return monitorService.getAlerts(monitorId, status);
    },

    // OSINT Sources
    shodanLookup: async (_, { ip }, { apiKeys }) => {
      if (!apiKeys?.shodan) {
        throw new Error("Shodan API key not configured");
      }
      return shodanService.lookup(ip, apiKeys.shodan);
    },

    censysLookup: async (_, { ip }, { apiKeys }) => {
      if (!apiKeys?.censysId || !apiKeys?.censysSecret) {
        throw new Error("Censys API credentials not configured");
      }
      return censysService.lookup(ip, apiKeys.censysId, apiKeys.censysSecret);
    },

    darkwebSearch: async (_, { query, sources }) => {
      return darkwebService.search(query, sources);
    },

    socialProfile: async (_, { platform, username }, { apiKeys }) => {
      return socialService.getProfile(platform, username, apiKeys);
    },

    ctLogs: async (_, { domain }) => {
      return ctService.query(domain);
    },

    passiveDns: async (_, { query }, { apiKeys }) => {
      return dnsService.passiveLookup(query, apiKeys);
    },

    whoisLookup: async (_, { domain }) => {
      return dnsService.whoisLookup(domain);
    },

    // Dashboard Stats
    dashboardStats: async () => {
      return {
        totalCases: await caseService.count(),
        totalEntities: await entityService.count(),
        totalFindings: await findingService.count(),
        activeMonitors: await monitorService.countActive(),
        newAlerts: await monitorService.countNewAlerts(),
        recentScans: await scanService.getRecent(5),
      };
    },

    osintStats: async (_, { source, period }) => {
      return {
        queries: 0,
        results: 0,
        apiUsage: {},
      };
    },
  },

  Mutation: {
    // Cases
    createCase: async (_, { input }, { user }) => {
      const newCase = await caseService.create(input, user?.id);
      pubsub.publish("CASE_CREATED", { caseUpdated: newCase });
      return newCase;
    },

    updateCase: async (_, { id, input }) => {
      const updated = await caseService.update(id, input);
      pubsub.publish("CASE_UPDATED", { caseUpdated: updated });
      return updated;
    },

    deleteCase: async (_, { id }) => {
      await caseService.delete(id);
      pubsub.publish("CASE_DELETED", { caseId: id });
      return true;
    },

    setActiveCase: async (_, { id }) => {
      return caseService.setActive(id);
    },

    // Entities
    createEntity: async (_, { input }, { user }) => {
      const entity = await entityService.create(input, user?.id);
      pubsub.publish("ENTITY_CREATED", { entityCreated: entity, caseId: input.caseId });
      return entity;
    },

    updateEntity: async (_, { id, confidence, metadata }) => {
      return entityService.update(id, { confidence, metadata });
    },

    deleteEntity: async (_, { id }) => {
      await entityService.delete(id);
      return true;
    },

    mergeEntities: async (_, { ids, targetId }) => {
      return entityService.merge(ids, targetId);
    },

    // Relations
    createRelation: async (_, { input }) => {
      return relationService.create(input);
    },

    deleteRelation: async (_, { id }) => {
      await relationService.delete(id);
      return true;
    },

    // Findings
    createFinding: async (_, { title, description, severity, category, source, caseId, entityIds }, { user }) => {
      const finding = await findingService.create({
        title,
        description,
        severity,
        category,
        source,
        caseId,
        entityIds,
        createdBy: user?.id,
      });
      pubsub.publish("FINDING_CREATED", { findingCreated: finding, caseId });
      return finding;
    },

    updateFinding: async (_, { id, verified }) => {
      return findingService.update(id, { verified });
    },

    deleteFinding: async (_, { id }) => {
      await findingService.delete(id);
      return true;
    },

    // Reports
    generateReport: async (_, { caseId, template, sections, options }) => {
      return reportService.generate(caseId, template, sections, options);
    },

    deleteReport: async (_, { id }) => {
      await reportService.delete(id);
      return true;
    },

    // Monitors
    createMonitor: async (_, { input }, { user }) => {
      return monitorService.create(input, user?.id);
    },

    toggleMonitor: async (_, { id }) => {
      const monitor = await monitorService.toggle(id);
      pubsub.publish("MONITOR_STATUS", { monitorStatus: monitor, monitorId: id });
      return monitor;
    },

    deleteMonitor: async (_, { id }) => {
      await monitorService.delete(id);
      return true;
    },

    acknowledgeAlert: async (_, { id }, { user }) => {
      return monitorService.acknowledgeAlert(id, user?.id);
    },

    resolveAlert: async (_, { id }) => {
      return monitorService.resolveAlert(id);
    },

    // Scans
    startScan: async (_, { input }, { user }) => {
      const scan = await scanService.start(input, user?.id);
      
      // Simulate progress updates
      setTimeout(async () => {
        for (let i = 10; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const updated = await scanService.updateProgress(scan.id, i);
          pubsub.publish(`SCAN_PROGRESS_${scan.id}`, { scanProgress: updated });
        }
        const completed = await scanService.complete(scan.id);
        pubsub.publish(`SCAN_PROGRESS_${scan.id}`, { scanProgress: completed });
      }, 1000);

      return scan;
    },

    cancelScan: async (_, { id }) => {
      await scanService.cancel(id);
      return true;
    },

    // Import/Export
    importCase: async (_, { data }) => {
      return caseService.import(data);
    },

    exportCase: async (_, { id }) => {
      return caseService.export(id);
    },

    importEntities: async (_, { caseId, data }) => {
      return entityService.import(caseId, data);
    },
  },

  Subscription: {
    scanProgress: {
      subscribe: (_, { scanId }) => pubsub.asyncIterator(`SCAN_PROGRESS_${scanId}`),
    },
    newAlert: {
      subscribe: () => pubsub.asyncIterator("NEW_ALERT"),
    },
    monitorStatus: {
      subscribe: (_, { monitorId }) => pubsub.asyncIterator([`MONITOR_STATUS_${monitorId}`, "MONITOR_STATUS"]),
    },
    caseUpdated: {
      subscribe: (_, { caseId }) => pubsub.asyncIterator([`CASE_UPDATED_${caseId}`, "CASE_UPDATED"]),
    },
    entityCreated: {
      subscribe: (_, { caseId }) => pubsub.asyncIterator([`ENTITY_CREATED_${caseId}`, "ENTITY_CREATED"]),
    },
    findingCreated: {
      subscribe: (_, { caseId }) => pubsub.asyncIterator([`FINDING_CREATED_${caseId}`, "FINDING_CREATED"]),
    },
  },
};
