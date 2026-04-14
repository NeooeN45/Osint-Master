// ============================================================================
// OSINT MODULE MANAGER SERVICE
// Handles installation, execution and management of 100+ OSINT modules
// ============================================================================

import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  OSINTModule,
  getModuleById,
  getEnabledModules,
  osintModules,
} from "../config/osint-modules";

const execAsync = promisify(exec);

interface ModuleExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  outputFile?: string;
}

interface ModuleStatus {
  id: string;
  installed: boolean;
  version?: string;
  enabled: boolean;
  lastChecked?: string;
  error?: string;
}

interface BatchInstallResult {
  total: number;
  successful: number;
  failed: number;
  results: {
    moduleId: string;
    success: boolean;
    message: string;
  }[];
}

export class ModuleManagerService {
  private modulesDir: string;
  private outputDir: string;
  private installedModules: Map<string, ModuleStatus> = new Map();

  constructor() {
    this.modulesDir = path.join(process.cwd(), "tools");
    this.outputDir = path.join(process.cwd(), "output");
    this.initializeDirectories();
  }

  private async initializeDirectories() {
    try {
      await fs.mkdir(this.modulesDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error("Failed to initialize directories:", error);
    }
  }

  // ==========================================================================
  // MODULE INSTALLATION
  // ==========================================================================

  async installModule(moduleId: string): Promise<{ success: boolean; message: string }> {
    const module = getModuleById(moduleId);
    if (!module) {
      return { success: false, message: `Module ${moduleId} not found` };
    }

    try {
      console.log(`[ModuleManager] Installing ${module.name}...`);

      let installCommand = module.installCommand;

      // Replace placeholders with actual paths
      installCommand = installCommand.replace(/\{modulesDir\}/g, this.modulesDir);

      // Execute installation based on method
      switch (module.installMethod) {
        case "pip":
          await this.installPipModule(module, installCommand);
          break;
        case "apt":
          await this.installAptModule(module, installCommand);
          break;
        case "git":
          await this.installGitModule(module, installCommand);
          break;
        case "npm":
          await this.installNpmModule(module, installCommand);
          break;
        case "docker":
          await this.installDockerModule(module, installCommand);
          break;
        case "manual":
          await this.installManualModule(module, installCommand);
          break;
        case "api":
          // API modules don't need installation, just API key validation
          await this.validateApiModule(module);
          break;
        default:
          throw new Error(`Unknown install method: ${module.installMethod}`);
      }

      // Verify installation
      const isInstalled = await this.checkModuleInstallation(moduleId);

      if (isInstalled) {
        this.installedModules.set(moduleId, {
          id: moduleId,
          installed: true,
          enabled: true,
          lastChecked: new Date().toISOString(),
        });

        return {
          success: true,
          message: `${module.name} installed successfully`,
        };
      } else {
        throw new Error("Installation verification failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ModuleManager] Installation failed for ${moduleId}:`, errorMessage);

      this.installedModules.set(moduleId, {
        id: moduleId,
        installed: false,
        enabled: false,
        error: errorMessage,
        lastChecked: new Date().toISOString(),
      });

      return {
        success: false,
        message: `Installation failed: ${errorMessage}`,
      };
    }
  }

  async batchInstall(moduleIds?: string[]): Promise<BatchInstallResult> {
    const modulesToInstall = moduleIds || getEnabledModules().map((m) => m.id);
    const results: BatchInstallResult["results"] = [];

    let successful = 0;
    let failed = 0;

    for (const moduleId of modulesToInstall) {
      const result = await this.installModule(moduleId);
      results.push({
        moduleId,
        success: result.success,
        message: result.message,
      });

      if (result.success) successful++;
      else failed++;

      // Small delay between installations
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      total: modulesToInstall.length,
      successful,
      failed,
      results,
    };
  }

  private async installPipModule(module: OSINTModule, command: string) {
    const { stdout, stderr } = await execAsync(command);
    console.log(`[Pip] ${module.name}:`, stdout, stderr);
  }

  private async installAptModule(module: OSINTModule, command: string) {
    // Check if on Linux
    if (os.platform() !== "linux") {
      throw new Error(`APT installation not supported on ${os.platform()}`);
    }

    const { stdout, stderr } = await execAsync(`sudo ${command}`);
    console.log(`[APT] ${module.name}:`, stdout, stderr);
  }

  private async installGitModule(module: OSINTModule, command: string) {
    const moduleDir = path.join(this.modulesDir, module.id);

    // Remove existing directory if present
    try {
      await fs.rm(moduleDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }

    // Clone and install
    const { stdout, stderr } = await execAsync(command, {
      cwd: this.modulesDir,
    });
    console.log(`[Git] ${module.name}:`, stdout, stderr);
  }

  private async installNpmModule(module: OSINTModule, command: string) {
    const { stdout, stderr } = await execAsync(command);
    console.log(`[NPM] ${module.name}:`, stdout, stderr);
  }

  private async installDockerModule(module: OSINTModule, command: string) {
    const { stdout, stderr } = await execAsync(command);
    console.log(`[Docker] ${module.name}:`, stdout, stderr);
  }

  private async installManualModule(module: OSINTModule, command: string) {
    const moduleDir = path.join(this.modulesDir, module.id);
    await fs.mkdir(moduleDir, { recursive: true });

    const { stdout, stderr } = await execAsync(command, {
      cwd: moduleDir,
    });
    console.log(`[Manual] ${module.name}:`, stdout, stderr);
  }

  private async validateApiModule(module: OSINTModule) {
    // For API modules, just check if we can reach the endpoint
    if (module.checkCommand) {
      const { stdout } = await execAsync(module.checkCommand);
      console.log(`[API] ${module.name} validation:`, stdout);
    }
  }

  // ==========================================================================
  // MODULE VERIFICATION
  // ==========================================================================

  async checkModuleInstallation(moduleId: string): Promise<boolean> {
    const module = getModuleById(moduleId);
    if (!module) return false;

    try {
      // Replace placeholders in check command
      let checkCommand = module.checkCommand;

      // Handle different module types
      if (module.installMethod === "git") {
        const moduleDir = path.join(this.modulesDir, module.id);
        checkCommand = checkCommand.replace(module.id, moduleDir);
      }

      const { stdout, stderr } = await execAsync(checkCommand, {
        timeout: 10000,
      });

      // If we get output without error, module is installed
      return stdout.length > 0 || stderr.length === 0;
    } catch (error) {
      return false;
    }
  }

  async getAllModuleStatuses(): Promise<ModuleStatus[]> {
    const statuses: ModuleStatus[] = [];

    for (const module of osintModules) {
      const isInstalled = await this.checkModuleInstallation(module.id);
      const cached = this.installedModules.get(module.id);

      statuses.push({
        id: module.id,
        installed: isInstalled,
        version: cached?.version,
        enabled: module.enabled,
        lastChecked: new Date().toISOString(),
        error: cached?.error,
      });
    }

    return statuses;
  }

  // ==========================================================================
  // MODULE EXECUTION
  // ==========================================================================

  async executeModule(
    moduleId: string,
    parameters: Record<string, any>
  ): Promise<ModuleExecutionResult> {
    const module = getModuleById(moduleId);
    if (!module) {
      return {
        success: false,
        output: "",
        error: `Module ${moduleId} not found`,
        duration: 0,
      };
    }

    // Check if installed
    const isInstalled = await this.checkModuleInstallation(moduleId);
    if (!isInstalled) {
      return {
        success: false,
        output: "",
        error: `Module ${moduleId} is not installed. Run install first.`,
        duration: 0,
      };
    }

    const startTime = Date.now();
    const outputFile = path.join(this.outputDir, `${moduleId}_${Date.now()}.json`);

    try {
      // Build command with parameters
      let command = module.executeCommand;

      // Replace parameter placeholders
      for (const [key, value] of Object.entries(parameters)) {
        if (value !== undefined && value !== null) {
          command = command.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
        }
      }

      // Replace output placeholder
      command = command.replace(/\{output\}/g, outputFile);

      // Handle git modules
      if (module.installMethod === "git") {
        const moduleDir = path.join(this.modulesDir, module.id);
        command = command.replace(new RegExp(`\\b${module.id}\\b`, "g"), moduleDir);
      }

      console.log(`[ModuleManager] Executing: ${command}`);

      // Execute with timeout
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      const duration = Date.now() - startTime;

      // Read output file if it exists
      let output = stdout;
      try {
        const fileContent = await fs.readFile(outputFile, "utf-8");
        output = fileContent;
        // Clean up output file
        await fs.unlink(outputFile).catch(() => {});
      } catch {
        // File doesn't exist, use stdout
      }

      return {
        success: true,
        output,
        error: stderr || undefined,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        output: "",
        error: errorMessage,
        duration,
      };
    }
  }

  async executeBatch(
    moduleIds: string[],
    parameters: Record<string, Record<string, any>>
  ): Promise<Record<string, ModuleExecutionResult>> {
    const results: Record<string, ModuleExecutionResult> = {};

    // Execute modules in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks: string[][] = [];

    for (let i = 0; i < moduleIds.length; i += concurrencyLimit) {
      chunks.push(moduleIds.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (moduleId) => {
          const moduleParams = parameters[moduleId] || {};
          const result = await this.executeModule(moduleId, moduleParams);
          return { moduleId, result };
        })
      );

      for (const { moduleId, result } of chunkResults) {
        results[moduleId] = result;
      }
    }

    return results;
  }

  // ==========================================================================
  // AUTONOMOUS OSINT EXECUTION
  // ==========================================================================

  async executeAutonomousOSINT(
    target: string,
    targetType: string,
    enabledModules?: string[]
  ): Promise<{
    target: string;
    results: Record<string, ModuleExecutionResult>;
    summary: {
      totalModules: number;
      successful: number;
      failed: number;
      totalDuration: number;
    };
  }> {
    const modulesToExecute =
      enabledModules ||
      getEnabledModules()
        .filter((m) => m.category === targetType || m.category === "person")
        .map((m) => m.id);

    const parameters: Record<string, Record<string, any>> = {};

    // Prepare parameters for each module
    for (const moduleId of modulesToExecute) {
      const module = getModuleById(moduleId);
      if (!module) continue;

      const moduleParams: Record<string, any> = {};

      // Map target to appropriate parameter based on module type
      for (const param of module.parameters) {
        if (targetType === "username" && param.name === "username") {
          moduleParams[param.name] = target;
        } else if (targetType === "email" && param.name === "email") {
          moduleParams[param.name] = target;
        } else if (targetType === "domain" && (param.name === "domain" || param.name === "url")) {
          moduleParams[param.name] = target;
        } else if (targetType === "ip" && (param.name === "ip" || param.name === "target")) {
          moduleParams[param.name] = target;
        } else if (targetType === "phone" && param.name === "phone") {
          moduleParams[param.name] = target;
        } else {
          // Use default value if available
          if (param.default !== undefined) {
            moduleParams[param.name] = param.default;
          }
        }
      }

      parameters[moduleId] = moduleParams;
    }

    const startTime = Date.now();
    const results = await this.executeBatch(modulesToExecute, parameters);
    const totalDuration = Date.now() - startTime;

    // Calculate summary
    const successful = Object.values(results).filter((r) => r.success).length;
    const failed = Object.values(results).filter((r) => !r.success).length;

    return {
      target,
      results,
      summary: {
        totalModules: modulesToExecute.length,
        successful,
        failed,
        totalDuration,
      },
    };
  }

  // ==========================================================================
  // MODULE MANAGEMENT
  // ==========================================================================

  enableModule(moduleId: string): boolean {
    const module = getModuleById(moduleId);
    if (!module) return false;

    module.enabled = true;
    return true;
  }

  disableModule(moduleId: string): boolean {
    const module = getModuleById(moduleId);
    if (!module) return false;

    module.enabled = false;
    return true;
  }

  async uninstallModule(moduleId: string): Promise<{ success: boolean; message: string }> {
    try {
      const module = getModuleById(moduleId);
      if (!module) {
        return { success: false, message: `Module ${moduleId} not found` };
      }

      // Remove git cloned modules
      if (module.installMethod === "git") {
        const moduleDir = path.join(this.modulesDir, moduleId);
        await fs.rm(moduleDir, { recursive: true, force: true });
      }

      // Uninstall pip modules
      if (module.installMethod === "pip") {
        await execAsync(`pip uninstall -y ${moduleId}`);
      }

      // Uninstall npm modules
      if (module.installMethod === "npm") {
        await execAsync(`npm uninstall -g ${moduleId}`);
      }

      this.installedModules.delete(moduleId);

      return { success: true, message: `${module.name} uninstalled successfully` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Uninstall failed: ${errorMessage}` };
    }
  }

  // ==========================================================================
  // SYSTEM UTILITIES
  // ==========================================================================

  async getSystemInfo(): Promise<{
    platform: string;
    arch: string;
    nodeVersion: string;
    pythonVersion?: string;
    goVersion?: string;
    dockerInstalled?: boolean;
  }> {
    const info: any = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
    };

    // Check Python
    try {
      const { stdout } = await execAsync("python3 --version");
      info.pythonVersion = stdout.trim();
    } catch {
      try {
        const { stdout } = await execAsync("python --version");
        info.pythonVersion = stdout.trim();
      } catch {
        // Python not available
      }
    }

    // Check Go
    try {
      const { stdout } = await execAsync("go version");
      info.goVersion = stdout.trim();
    } catch {
      // Go not available
    }

    // Check Docker
    try {
      await execAsync("docker --version");
      info.dockerInstalled = true;
    } catch {
      info.dockerInstalled = false;
    }

    return info;
  }

  async installDependencies(): Promise<{
    success: boolean;
    message: string;
    installed: string[];
    failed: string[];
  }> {
    const required = ["python3", "pip", "git", "curl"];
    const optional = ["go", "nodejs", "npm", "docker"];
    const installed: string[] = [];
    const failed: string[] = [];

    // Check required dependencies
    for (const dep of required) {
      try {
        await execAsync(`which ${dep}`);
        installed.push(dep);
      } catch {
        failed.push(dep);
      }
    }

    // Check optional dependencies
    for (const dep of optional) {
      try {
        await execAsync(`which ${dep}`);
        installed.push(dep);
      } catch {
        // Optional, don't add to failed
      }
    }

    const allRequiredInstalled = required.every((dep) => installed.includes(dep));

    return {
      success: allRequiredInstalled,
      message: allRequiredInstalled
        ? "All required dependencies are installed"
        : `Missing required dependencies: ${failed.filter((d) => required.includes(d)).join(", ")}`,
      installed,
      failed: failed.filter((d) => required.includes(d)),
    };
  }
}

// Export singleton instance
export const moduleManager = new ModuleManagerService();
