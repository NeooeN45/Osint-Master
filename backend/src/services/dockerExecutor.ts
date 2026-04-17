// ============================================================================
// DOCKER EXECUTOR - Exécute des commandes dans le container OSINT Tools
// Permet d'utiliser les 1000+ outils installés dans Docker
// ============================================================================

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DOCKER_CONTAINER = process.env.TOOLS_CONTAINER || "osint-tools";

export interface DockerExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

/**
 * Exécute une commande dans le container Docker osint-tools
 */
export async function dockerExec(
  command: string,
  timeoutMs = 60000,
  workingDir = "/home/osint"
): Promise<DockerExecResult> {
  try {
    const dockerCmd = `docker exec ${DOCKER_CONTAINER} bash -c "cd ${workingDir} && ${command.replace(/"/g, '\\"')}"`;
    
    const result = await execAsync(dockerCmd, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });

    return {
      success: true,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      exitCode: error.code || 1,
      error: error.message,
    };
  }
}

/**
 * Vérifie si le container Docker est disponible
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    const result = await dockerExec("echo 'OK'", 5000);
    return result.success && result.stdout.includes("OK");
  } catch {
    return false;
  }
}

/**
 * Liste les outils disponibles dans le container
 */
export async function listAvailableTools(): Promise<string[]> {
  const tools = [
    "sherlock",
    "holehe", 
    "theHarvester",
    "subfinder",
    "httpx",
    "nuclei",
    "amass",
    "sublist3r",
    "dnsrecon",
    "social-analyzer",
    "gau",
    "assetfinder",
    "gowitness"
  ];

  const available: string[] = [];
  
  for (const tool of tools) {
    const result = await dockerExec(`which ${tool}`, 5000);
    if (result.success && result.stdout.trim()) {
      available.push(tool);
    }
  }

  return available;
}

/**
 * Exécute Sherlock dans Docker
 */
export async function runSherlock(
  username: string,
  timeout = 30
): Promise<DockerExecResult> {
  const timestamp = Date.now();
  const outFile = `/tmp/sherlock_${timestamp}.txt`;
  
  const command = `sherlock "${username}" --timeout ${timeout} --print-found --no-color --output ${outFile} 2>&1 || true && cat ${outFile} 2>/dev/null || true`;
  
  return dockerExec(command, timeout * 1000 + 10000);
}

/**
 * Exécute Holehe dans Docker
 */
export async function runHolehe(
  email: string,
  timeout = 30
): Promise<DockerExecResult> {
  const command = `holehe ${email} --no-color 2>&1 || true`;
  return dockerExec(command, timeout * 1000 + 10000);
}

/**
 * Exécute theHarvester dans Docker
 */
export async function runTheHarvester(
  domain: string,
  limit = 100,
  timeout = 60
): Promise<DockerExecResult> {
  const command = `theHarvester -d "${domain}" -l ${limit} -b all 2>&1 || true`;
  return dockerExec(command, timeout * 1000);
}

/**
 * Exécute Subfinder dans Docker
 */
export async function runSubfinder(
  domain: string,
  timeout = 30
): Promise<DockerExecResult> {
  const command = `subfinder -d "${domain}" -silent 2>&1 || true`;
  return dockerExec(command, timeout * 1000);
}

/**
 * Exécute Amass dans Docker
 */
export async function runAmass(
  domain: string,
  timeout = 120
): Promise<DockerExecResult> {
  const command = `amass enum -passive -d "${domain}" 2>&1 || true`;
  return dockerExec(command, timeout * 1000);
}

/**
 * Exécute Nuclei dans Docker
 */
export async function runNuclei(
  target: string,
  timeout = 60
): Promise<DockerExecResult> {
  const command = `nuclei -u "${target}" -silent 2>&1 || true`;
  return dockerExec(command, timeout * 1000);
}

/**
 * Exécute Httpx dans Docker
 */
export async function runHttpx(
  target: string,
  timeout = 30
): Promise<DockerExecResult> {
  const command = `echo "${target}" | httpx -silent 2>&1 || true`;
  return dockerExec(command, timeout * 1000);
}
