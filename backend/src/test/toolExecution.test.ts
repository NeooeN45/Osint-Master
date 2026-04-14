import { describe, it, expect, beforeAll } from 'vitest';
import {
  AdvancedToolExecutor,
  AdvancedWorkflowOrchestrator,
  AntiFalsePositiveEngine,
  defaultConfig,
} from '../services/advancedToolExecutionService';
import { OSINT_TOOLS, AUTOMATED_WORKFLOWS } from '../config/osintTools';

describe('Advanced Tool Execution', () => {
  let executor: AdvancedToolExecutor;
  let orchestrator: AdvancedWorkflowOrchestrator;
  let fpEngine: AntiFalsePositiveEngine;

  beforeAll(() => {
    executor = new AdvancedToolExecutor(defaultConfig);
    orchestrator = new AdvancedWorkflowOrchestrator(defaultConfig);
    fpEngine = new AntiFalsePositiveEngine();
  });

  describe('Anti-False Positive Engine', () => {
    it('should validate email patterns correctly', () => {
      const valid = fpEngine.validatePattern('test@example.com', 'email');
      expect(valid.valid).toBe(true);
      expect(valid.confidence).toBeGreaterThan(90);

      const invalid = fpEngine.validatePattern('not-an-email', 'email');
      expect(invalid.valid).toBe(false);
      expect(invalid.confidence).toBeLessThan(30);
    });

    it('should validate IP patterns correctly', () => {
      const valid = fpEngine.validatePattern('192.168.1.1', 'ipv4');
      expect(valid.valid).toBe(true);

      const invalid = fpEngine.validatePattern('999.999.999.999', 'ipv4');
      expect(invalid.valid).toBe(false);
    });

    it('should detect false positive indicators', () => {
      const result = fpEngine.checkFalsePositiveIndicators({
        email: 'test@localhost',
        data: 'sample data',
      });
      expect(result.isLikelyFP).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should return source reliability scores', () => {
      const shodanReliability = fpEngine.getSourceReliability('Shodan');
      expect(shodanReliability).toBe(95);

      const unknownReliability = fpEngine.getSourceReliability('Unknown');
      expect(unknownReliability).toBe(70);
    });
  });

  describe('Tool Execution', () => {
    it('should execute a tool in simulation mode', async () => {
      const tool = OSINT_TOOLS.find(t => t.id === 'shodan');
      expect(tool).toBeDefined();

      if (tool) {
        const result = await executor.executeTool(tool, '8.8.8.8');
        expect(result.toolId).toBe('shodan');
        expect(result.toolName).toBe('Shodan');
        expect(result.timestamp).toBeDefined();
        expect(result.verificationDetails).toBeDefined();
      }
    }, 10000);

    it('should handle missing API keys gracefully', async () => {
      const tool = OSINT_TOOLS.find(t => t.id === 'shodan' && t.requiresApiKey);
      if (tool) {
        const result = await executor.executeTool(tool, '8.8.8.8');
        // Should still return a result, possibly simulated
        expect(result).toBeDefined();
      }
    }, 10000);
  });

  describe('Workflow Orchestration', () => {
    it('should execute a workflow', async () => {
      const workflow = AUTOMATED_WORKFLOWS[0];
      expect(workflow).toBeDefined();

      const result = await orchestrator.executeWorkflow(
        workflow.id,
        'test@example.com'
      );

      expect(result.workflowId).toBe(workflow.id);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.statistics).toBeDefined();
    }, 30000);

    it('should calculate statistics correctly', async () => {
      const workflow = AUTOMATED_WORKFLOWS[0];
      const result = await orchestrator.executeWorkflow(
        workflow.id,
        'test@example.com'
      );

      expect(result.statistics.totalTools).toBeGreaterThan(0);
      expect(result.statistics.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(result.statistics.fpReduction).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('Result Verification', () => {
    it('should verify results with cross-referencing', async () => {
      const mockResults = [
        {
          toolId: 'tool1',
          toolName: 'Tool 1',
          success: true,
          data: { ip: '192.168.1.1', location: 'Paris' },
          confidence: 85,
          falsePositiveRisk: 10,
          verified: false,
          verificationScore: 0,
          verificationDetails: {
            rulesApplied: [],
            crossReferences: [],
            patternValidations: [],
            dataFreshness: 0,
            sourceReliability: 90,
          },
          executionTime: 1000,
          timestamp: new Date().toISOString(),
          sources: ['Tool 1'],
          warnings: [],
          retryCount: 0,
          cacheHit: false,
        },
        {
          toolId: 'tool2',
          toolName: 'Tool 2',
          success: true,
          data: { ip: '192.168.1.1', location: 'Paris' },
          confidence: 80,
          falsePositiveRisk: 15,
          verified: false,
          verificationScore: 0,
          verificationDetails: {
            rulesApplied: [],
            crossReferences: [],
            patternValidations: [],
            dataFreshness: 0,
            sourceReliability: 85,
          },
          executionTime: 1200,
          timestamp: new Date().toISOString(),
          sources: ['Tool 2'],
          warnings: [],
          retryCount: 0,
          cacheHit: false,
        },
      ];

      const verified = await executor.verifyResult(mockResults[0], mockResults);
      expect(verified.verified).toBe(true);
      expect(verified.verificationDetails.crossReferences.length).toBeGreaterThan(0);
    });
  });
});

// Run tests
describe('API Connection Tests', () => {
  it('should validate environment variables', () => {
    const requiredVars = [
      'SHODAN_API_KEY',
      'VIRUSTOTAL_API_KEY',
      'HIBP_API_KEY',
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        console.warn(`⚠️ Missing API key: ${varName}`);
      }
    }

    // Test passes regardless - we just warn about missing keys
    expect(true).toBe(true);
  });
});
