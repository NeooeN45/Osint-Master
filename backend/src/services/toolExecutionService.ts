import axios from "axios";
import { logger } from "../utils/logger";
import { OSINT_TOOLS, AUTOMATED_WORKFLOWS, VERIFICATION_RULES, type OsintTool, type Workflow, type VerificationRule } from "../config/osintTools";

export interface ToolResult {
  toolId: string;
  toolName: string;
  success: boolean;
  data: unknown;
  confidence: number;
  falsePositiveRisk: number;
  verified: boolean;
  verificationScore: number;
  executionTime: number;
  timestamp: string;
  sources?: string[];
  error?: string;
  warnings?: string[];
}

export interface WorkflowResult {
  workflowId: string;
  workflowName: string;
  target: string;
  targetType: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
  results: ToolResult[];
  aggregatedFindings: unknown[];
  totalConfidence: number;
  falsePositiveRate: number;
  executionTime: number;
  startedAt: string;
  completedAt?: string;
  progress: number;
}

// ============================================================
// VERIFICATION ENGINE
// ============================================================

class VerificationEngine {
  private rules: VerificationRule[];

  constructor() {
    this.rules = VERIFICATION_RULES;
  }

  async verifyResult(result: ToolResult, tool: OsintTool): Promise<{ verified: boolean; score: number; appliedRules: string[] }> {
    let score = result.confidence;
    let verified = true;
    const appliedRules: string[] = [];

    for (const rule of this.rules) {
      if (!rule.appliesTo.includes(tool.category) && !rule.appliesTo.includes('all')) {
        continue;
      }

      try {
        const passed = await rule.check(result.data);
        if (passed) {
          score += rule.confidenceWeight;
          appliedRules.push(rule.id);
        } else {
          // Some rules are mandatory for verification
          if (rule.id === 'cross_reference_min_2' || rule.id === 'confidence_threshold_70') {
            verified = false;
          }
        }
      } catch (error) {
        logger.warn(`Verification rule ${rule.id} failed:`, error);
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    // Calculate false positive risk reduction
    const fpReduction = this.rules
      .filter(r => appliedRules.includes(r.id))
      .reduce((sum, r) => sum + r.falsePositiveReduction, 0);

    return {
      verified: verified && score >= 70,
      score: Math.round(score),
      appliedRules,
    };
  }

  calculateFalsePositiveRate(results: ToolResult[]): number {
    if (results.length === 0) return 0;
    
    const avgFp = results.reduce((sum, r) => sum + r.falsePositiveRisk, 0) / results.length;
    const verificationBonus = results.filter(r => r.verified).length / results.length * 30;
    
    return Math.max(0, Math.round(avgFp - verificationBonus));
  }
}

export const verificationEngine = new VerificationEngine();

// ============================================================
// TOOL EXECUTOR
// ============================================================

class ToolExecutor {
  private rateLimiters = new Map<string, { lastRequest: number; count: number }>();

  async executeTool(tool: OsintTool, target: string, apiKeys?: Record<string, string>): Promise<ToolResult> {
    const startTime = Date.now();
    
    logger.info(`Executing tool: ${tool.name} for target: ${target}`);

    try {
      // Check rate limit
      await this.checkRateLimit(tool);

      // Execute based on tool configuration
      let data: unknown;
      
      if (tool.apiEndpoint) {
        data = await this.executeApiTool(tool, target, apiKeys);
      } else if (tool.id.includes('scraper')) {
        data = await this.executeScraperTool(tool, target);
      } else {
        data = await this.executeInternalTool(tool, target);
      }

      // Calculate initial confidence based on tool reliability
      let confidence = tool.reliability;
      let falsePositiveRisk = tool.falsePositiveRate;

      // Apply verification
      const toolResult: ToolResult = {
        toolId: tool.id,
        toolName: tool.name,
        success: true,
        data,
        confidence,
        falsePositiveRisk,
        verified: false,
        verificationScore: 0,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        sources: [tool.name],
      };

      const verification = await verificationEngine.verifyResult(toolResult, tool);
      toolResult.verified = verification.verified;
      toolResult.verificationScore = verification.score;

      // Boost confidence if verified
      if (toolResult.verified) {
        toolResult.confidence = Math.min(100, toolResult.confidence + 10);
        toolResult.falsePositiveRisk = Math.max(0, toolResult.falsePositiveRisk - 20);
      }

      // Update rate limiter
      this.updateRateLimit(tool);

      return toolResult;

    } catch (error) {
      logger.error(`Tool execution failed: ${tool.name}`, error);
      
      return {
        toolId: tool.id,
        toolName: tool.name,
        success: false,
        data: null,
        confidence: 0,
        falsePositiveRisk: 100,
        verified: false,
        verificationScore: 0,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: ['Tool execution failed - result excluded from aggregation'],
      };
    }
  }

  private async executeApiTool(tool: OsintTool, target: string, apiKeys?: Record<string, string>): Promise<unknown> {
    if (!tool.apiEndpoint) throw new Error('No API endpoint configured');

    const url = tool.apiEndpoint.replace('{query}', encodeURIComponent(target));
    const apiKey = apiKeys?.[tool.id];

    if (tool.requiresApiKey && !apiKey) {
      throw new Error(`API key required for ${tool.name}`);
    }

    const response = await axios.get(url, {
      headers: apiKey ? { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}` } : {},
      timeout: 30000,
    });

    return response.data;
  }

  private async executeScraperTool(tool: OsintTool, target: string): Promise<unknown> {
    // Simulated scraper execution
    // In production, this would use Puppeteer or similar
    logger.info(`Simulating scraper: ${tool.name} for ${target}`);
    
    return {
      target,
      scraped: true,
      timestamp: new Date().toISOString(),
      note: 'Scraper execution simulated - integrate Puppeteer for real scraping',
    };
  }

  private async executeInternalTool(tool: OsintTool, target: string): Promise<unknown> {
    // Internal tool execution logic
    logger.info(`Executing internal tool: ${tool.name}`);
    
    // Simulate various tool types
    switch (tool.category) {
      case 'person':
        return this.simulatePersonSearch(target);
      case 'domain':
        return this.simulateDomainLookup(target);
      case 'ip_network':
        return this.simulateIpLookup(target);
      case 'crypto':
        return this.simulateCryptoLookup(target);
      case 'breach_leak':
        return this.simulateBreachSearch(target);
      default:
        return { target, found: true, data: 'Simulated result' };
    }
  }

  private async checkRateLimit(tool: OsintTool): Promise<void> {
    const limiter = this.rateLimiters.get(tool.id);
    if (!limiter) return;

    const now = Date.now();
    const windowMs = tool.rateLimit.window;
    const maxRequests = tool.rateLimit.requests;

    if (now - limiter.lastRequest < windowMs && limiter.count >= maxRequests) {
      const waitTime = windowMs - (now - limiter.lastRequest);
      logger.warn(`Rate limit hit for ${tool.name}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private updateRateLimit(tool: OsintTool): void {
    const now = Date.now();
    const existing = this.rateLimiters.get(tool.id);
    
    if (existing && now - existing.lastRequest > tool.rateLimit.window) {
      // Reset window
      this.rateLimiters.set(tool.id, { lastRequest: now, count: 1 });
    } else {
      this.rateLimiters.set(tool.id, {
        lastRequest: existing?.lastRequest || now,
        count: (existing?.count || 0) + 1,
      });
    }
  }

  // Simulation methods for different tool types
  private simulatePersonSearch(target: string): unknown {
    return {
      name: target,
      possibleProfiles: [
        { platform: 'LinkedIn', confidence: 85 },
        { platform: 'Twitter', confidence: 72 },
      ],
      emails: [`${target.toLowerCase().replace(/\s+/g, '.')}@example.com`],
      phone: '+1-555-0100',
      locations: ['New York, USA'],
      found: true,
    };
  }

  private simulateDomainLookup(target: string): unknown {
    return {
      domain: target,
      registrar: 'Example Registrar',
      created: '2020-01-01',
      expires: '2025-01-01',
      nameservers: ['ns1.example.com', 'ns2.example.com'],
      subdomains: ['www', 'mail', 'api'],
      found: true,
    };
  }

  private simulateIpLookup(target: string): unknown {
    return {
      ip: target,
      country: 'United States',
      city: 'San Francisco',
      org: 'Example ISP',
      ports: [80, 443, 22],
      vulnerabilities: [],
      found: true,
    };
  }

  private simulateCryptoLookup(target: string): unknown {
    return {
      address: target,
      balance: '1.23456789',
      transactions: 42,
      firstSeen: '2019-03-15',
      riskScore: 15,
      found: true,
    };
  }

  private simulateBreachSearch(target: string): unknown {
    return {
      email: target,
      breached: true,
      breaches: [
        { name: 'Example Breach', date: '2022-06-01', dataClasses: ['email', 'password'] },
      ],
      pastes: 3,
      found: true,
    };
  }
}

export const toolExecutor = new ToolExecutor();

// ============================================================
// WORKFLOW ORCHESTRATOR
// ============================================================

class WorkflowOrchestrator {
  private activeWorkflows = new Map<string, WorkflowResult>();

  async executeWorkflow(workflowId: string, target: string, apiKeys?: Record<string, string>): Promise<WorkflowResult> {
    const workflow = AUTOMATED_WORKFLOWS.find(w => w.id === workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const result: WorkflowResult = {
      workflowId,
      workflowName: workflow.name,
      target,
      targetType: workflow.targetType,
      status: 'running',
      results: [],
      aggregatedFindings: [],
      totalConfidence: 0,
      falsePositiveRate: 0,
      executionTime: 0,
      startedAt: new Date().toISOString(),
      progress: 0,
    };

    this.activeWorkflows.set(workflowId, result);

    const workflowStart = Date.now();
    const tools = OSINT_TOOLS.filter(t => workflow.tools.includes(t.id) && t.enabled);

    logger.info(`Starting workflow: ${workflow.name} with ${tools.length} tools`);

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      
      try {
        const toolResult = await toolExecutor.executeTool(tool, target, apiKeys);
        result.results.push(toolResult);
        
        // Update progress
        result.progress = Math.round(((i + 1) / tools.length) * 100);
        
        // Aggregate findings from successful results
        if (toolResult.success && toolResult.verified) {
          result.aggregatedFindings.push({
            source: tool.name,
            data: toolResult.data,
            confidence: toolResult.confidence,
          });
        }

      } catch (error) {
        logger.error(`Workflow step failed: ${tool.name}`, error);
        result.results.push({
          toolId: tool.id,
          toolName: tool.name,
          success: false,
          data: null,
          confidence: 0,
          falsePositiveRisk: 100,
          verified: false,
          verificationScore: 0,
          executionTime: 0,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate final metrics
    const successful = result.results.filter(r => r.success);
    const verified = successful.filter(r => r.verified);

    result.totalConfidence = verified.length > 0
      ? Math.round(verified.reduce((sum, r) => sum + r.confidence, 0) / verified.length)
      : 0;
    
    result.falsePositiveRate = verificationEngine.calculateFalsePositiveRate(result.results);
    result.executionTime = Date.now() - workflowStart;
    result.status = successful.length === tools.length ? 'completed' : successful.length > 0 ? 'partial' : 'failed';
    result.completedAt = new Date().toISOString();
    result.progress = 100;

    this.activeWorkflows.delete(workflowId);

    logger.info(`Workflow completed: ${workflow.name} - Confidence: ${result.totalConfidence}%, FP Rate: ${result.falsePositiveRate}%`);

    return result;
  }

  async executeParallel(workflowIds: string[], target: string, apiKeys?: Record<string, string>): Promise<WorkflowResult[]> {
    return Promise.all(workflowIds.map(id => this.executeWorkflow(id, target, apiKeys)));
  }

  getActiveWorkflows(): WorkflowResult[] {
    return Array.from(this.activeWorkflows.values());
  }
}

export const workflowOrchestrator = new WorkflowOrchestrator();

// ============================================================
// RESULT AGGREGATOR
// ============================================================

export class ResultAggregator {
  static aggregate(workflowResults: WorkflowResult[]): {
    findings: unknown[];
    confidence: number;
    falsePositiveRate: number;
    sources: string[];
  } {
    const allResults = workflowResults.flatMap(w => w.results);
    const successful = allResults.filter(r => r.success);
    const verified = successful.filter(r => r.verified);

    // Deduplicate findings
    const uniqueFindings = this.deduplicate(verified.map(r => r.data));

    // Calculate aggregate confidence
    const confidence = verified.length > 0
      ? Math.round(verified.reduce((sum, r) => sum + r.confidence, 0) / verified.length)
      : 0;

    // Get unique sources
    const sources = [...new Set(verified.flatMap(r => r.sources || [r.toolName]))];

    return {
      findings: uniqueFindings,
      confidence,
      falsePositiveRate: verificationEngine.calculateFalsePositiveRate(allResults),
      sources,
    };
  }

  private static deduplicate(items: unknown[]): unknown[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export default {
  toolExecutor,
  workflowOrchestrator,
  verificationEngine,
  ResultAggregator,
};
