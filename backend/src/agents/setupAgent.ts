// ============================================================================
// OSINT MASTER SETUP AGENT
// Automatically installs and configures all OSINT tools
// ============================================================================

import { exec } from "child_process";
import { promisify } from "util";
import { osintInstaller, OSINT_TOOLS_CATALOG } from "../services/osintInstaller";

const execAsync = promisify(exec);

export class SetupAgent {
  private progress: { total: number; current: number; currentTool: string } = {
    total: 0,
    current: 0,
    currentTool: ""
  };

  private log: string[] = [];

  // Check system prerequisites
  async checkPrerequisites(): Promise<{
    ready: boolean;
    missing: string[];
    installed: string[];
  }> {
    const required = [
      { name: "python", check: "python --version || python3 --version" },
      { name: "pip", check: "pip --version || pip3 --version" },
      { name: "git", check: "git --version" },
      { name: "node", check: "node --version" },
      { name: "npm", check: "npm --version" }
    ];

    const optional = [
      { name: "go", check: "go version" },
      { name: "docker", check: "docker --version" },
      { name: "ruby", check: "ruby --version" }
    ];

    const installed: string[] = [];
    const missing: string[] = [];

    // Check required
    for (const tool of required) {
      try {
        await execAsync(tool.check);
        installed.push(tool.name);
      } catch {
        missing.push(tool.name);
      }
    }

    // Check optional
    for (const tool of optional) {
      try {
        await execAsync(tool.check);
        installed.push(tool.name);
      } catch {
        // Optional, don't add to missing
      }
    }

    return {
      ready: missing.length === 0,
      missing,
      installed
    };
  }

  // Install prerequisites
  async installPrerequisites(): Promise<{ success: boolean; output: string }> {
    const platform = process.platform;
    let command = "";

    if (platform === "win32") {
      // Windows - use chocolatey
      command = `choco install python git nodejs golang ruby -y || 
                 (powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" && choco install python git nodejs golang ruby -y)`;
    } else if (platform === "darwin") {
      // macOS - use homebrew
      command = `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" && brew install python git node go ruby`;
    } else {
      // Linux
      command = `sudo apt update && sudo apt install -y python3 python3-pip python3-venv git nodejs npm golang-go ruby-full build-essential`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 600000 });
      return { success: true, output: stdout + stderr };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, output: errorMsg };
    }
  }

  // Install essential tools (quick start)
  async installEssentials(): Promise<any> {
    const essentials = [
      "sherlock",
      "holehe", 
      "subfinder",
      "waybackurls",
      "exiftool",
      "whatweb"
    ];

    return this.installBatch(essentials, "Essential OSINT Tools");
  }

  // Install all tools
  async installAll(): Promise<any> {
    const allTools = OSINT_TOOLS_CATALOG.map(t => t.id);
    return this.installBatch(allTools, "All OSINT Tools");
  }

  // Install by category
  async installCategory(category: string): Promise<any> {
    const tools = OSINT_TOOLS_CATALOG
      .filter(t => t.category === category)
      .map(t => t.id);
    
    return this.installBatch(tools, `${category} Tools`);
  }

  // Batch installation with progress tracking
  private async installBatch(toolIds: string[], batchName: string): Promise<any> {
    this.progress = {
      total: toolIds.length,
      current: 0,
      currentTool: ""
    };
    this.log = [];

    const results = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    this.log.push(`[SETUP] Starting installation: ${batchName}`);
    this.log.push(`[SETUP] Total tools to install: ${toolIds.length}`);

    for (const toolId of toolIds) {
      this.progress.current++;
      this.progress.currentTool = toolId;

      const tool = OSINT_TOOLS_CATALOG.find(t => t.id === toolId);
      if (!tool) {
        this.log.push(`[ERROR] Tool ${toolId} not found in catalog`);
        failed++;
        continue;
      }

      this.log.push(`[${this.progress.current}/${this.progress.total}] Installing ${tool.name}...`);

      // Check if already installed
      const alreadyInstalled = await osintInstaller.checkInstallation(toolId);
      if (alreadyInstalled) {
        this.log.push(`[SKIP] ${tool.name} is already installed`);
        skipped++;
        results.push({ toolId, name: tool.name, status: "skipped", reason: "already-installed" });
        continue;
      }

      // Try to install
      try {
        const result = await osintInstaller.install(toolId);
        
        if (result.success) {
          this.log.push(`[SUCCESS] ${tool.name} installed`);
          successful++;
          results.push({ toolId, name: tool.name, status: "installed", output: result.output });
        } else {
          this.log.push(`[FAILED] ${tool.name}: ${result.message}`);
          failed++;
          results.push({ toolId, name: tool.name, status: "failed", error: result.message });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.log.push(`[ERROR] ${tool.name}: ${errorMsg}`);
        failed++;
        results.push({ toolId, name: tool.name, status: "error", error: errorMsg });
      }

      // Small delay between installations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.log.push(`[SETUP] Installation complete: ${successful} installed, ${failed} failed, ${skipped} skipped`);

    return {
      batchName,
      total: toolIds.length,
      successful,
      failed,
      skipped,
      results,
      log: this.log,
      progress: this.progress
    };
  }

  // Get current progress
  getProgress(): typeof this.progress {
    return this.progress;
  }

  // Get full log
  getLog(): string[] {
    return this.log;
  }

  // Generate installation report
  generateReport(results: any): string {
    const report = [
      "=".repeat(60),
      "OSINT MASTER - INSTALLATION REPORT",
      "=".repeat(60),
      "",
      `Batch: ${results.batchName}`,
      `Date: ${new Date().toISOString()}`,
      `Platform: ${process.platform}`,
      "",
      "SUMMARY:",
      `- Total tools: ${results.total}`,
      `- Successfully installed: ${results.successful}`,
      `- Failed: ${results.failed}`,
      `- Skipped (already installed): ${results.skipped}`,
      "",
      "DETAILED RESULTS:",
      ""
    ];

    for (const result of results.results) {
      const status = result.status.toUpperCase();
      const line = `[${status}] ${result.name} (${result.toolId})`;
      report.push(line);
      
      if (result.error) {
        report.push(`  Error: ${result.error}`);
      }
      if (result.output) {
        report.push(`  Output: ${result.output.substring(0, 100)}...`);
      }
      report.push("");
    }

    report.push("=".repeat(60));
    report.push("NEXT STEPS:");
    report.push("1. Configure API keys for external services (Shodan, VirusTotal, etc.)");
    report.push("2. Test installed tools with sample targets");
    report.push("3. Set up social media session tokens for advanced features");
    report.push("=".repeat(60));

    return report.join("\n");
  }

  // Save report to file
  async saveReport(results: any, filename?: string): Promise<string> {
    const report = this.generateReport(results);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportFile = filename || `install-report-${timestamp}.txt`;
    const reportPath = `reports/${reportFile}`;
    
    await execAsync(`mkdir -p reports`);
    await execAsync(`echo "${report.replace(/"/g, '\\"')}" > ${reportPath}`);
    
    return reportPath;
  }
}

export const setupAgent = new SetupAgent();
