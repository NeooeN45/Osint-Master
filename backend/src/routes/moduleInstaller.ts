// ============================================================================
// MODULE INSTALLER — Installation dynamique de modules OSINT
// Support : pip packages, npm packages, git clones, binary downloads
// ============================================================================

import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
export const moduleInstallerRouter = Router();

// Whitelist de modules installables (sécurité)
const INSTALLABLE_MODULES: Record<string, {
  name: string;
  description: string;
  method: "pip" | "npm" | "go" | "git";
  package: string;
  binary?: string;
  homepage?: string;
  category: string;
  targetTypes: string[];
}> = {
  // ═ Username hunters ═
  blackbird: {
    name: "Blackbird", description: "Fork moderne de Sherlock (580+ sites)",
    method: "pip", package: "blackbird-osint", binary: "blackbird",
    homepage: "https://github.com/p1ngul1n0/blackbird",
    category: "username", targetTypes: ["username"],
  },
  marple: {
    name: "Marple", description: "Username search engine avec scoring",
    method: "pip", package: "marple", binary: "marple",
    homepage: "https://github.com/soxoj/marple",
    category: "username", targetTypes: ["username"],
  },
  nexfil: {
    name: "Nexfil", description: "OSINT username finder",
    method: "pip", package: "nexfil", binary: "nexfil",
    homepage: "https://github.com/thewhiteh4t/nexfil",
    category: "username", targetTypes: ["username"],
  },
  snoop: {
    name: "Snoop", description: "Python username tracker",
    method: "pip", package: "snoop-project", binary: "snoop",
    homepage: "https://github.com/snooppr/snoop",
    category: "username", targetTypes: ["username"],
  },
  sherlock: {
    name: "Sherlock", description: "Original username finder (400+ sites)",
    method: "pip", package: "sherlock-project", binary: "sherlock",
    homepage: "https://github.com/sherlock-project/sherlock",
    category: "username", targetTypes: ["username"],
  },
  maigret: {
    name: "Maigret", description: "Username OSINT (500+ sites, rich reports)",
    method: "pip", package: "maigret", binary: "maigret",
    homepage: "https://github.com/soxoj/maigret",
    category: "username", targetTypes: ["username"],
  },
  socialscan: {
    name: "SocialScan", description: "Quick username/email checker",
    method: "pip", package: "socialscan", binary: "socialscan",
    homepage: "https://github.com/iojw/socialscan",
    category: "username", targetTypes: ["username", "email"],
  },

  // ═ Email/OSINT ═
  holehe: {
    name: "Holehe", description: "Email → social accounts",
    method: "pip", package: "holehe", binary: "holehe",
    homepage: "https://github.com/megadose/holehe",
    category: "email", targetTypes: ["email"],
  },
  ghunt: {
    name: "GHunt", description: "Google account OSINT",
    method: "pip", package: "ghunt", binary: "ghunt",
    homepage: "https://github.com/mxrch/ghunt",
    category: "email", targetTypes: ["email"],
  },
  h8mail: {
    name: "h8mail", description: "Email OSINT + breach hunting",
    method: "pip", package: "h8mail", binary: "h8mail",
    homepage: "https://github.com/khast3x/h8mail",
    category: "email", targetTypes: ["email"],
  },
  ignorant: {
    name: "Ignorant", description: "Phone → social accounts",
    method: "pip", package: "ignorant", binary: "ignorant",
    homepage: "https://github.com/megadose/ignorant",
    category: "phone", targetTypes: ["phone"],
  },

  // ═ Social media ═
  instaloader: {
    name: "Instaloader", description: "Instagram scraper",
    method: "pip", package: "instaloader", binary: "instaloader",
    homepage: "https://github.com/instaloader/instaloader",
    category: "social", targetTypes: ["username"],
  },
  twint: {
    name: "Twint", description: "Twitter scraper no-API",
    method: "pip", package: "twint", binary: "twint",
    homepage: "https://github.com/twintproject/twint",
    category: "social", targetTypes: ["username"],
  },

  // ═ Phone/Email ═
  phoneinfoga: {
    name: "PhoneInfoga", description: "Phone OSINT",
    method: "pip", package: "phoneinfoga", binary: "phoneinfoga",
    homepage: "https://github.com/sundowndev/phoneinfoga",
    category: "phone", targetTypes: ["phone"],
  },

  // ═ Domain/Network ═
  theharvester: {
    name: "theHarvester", description: "Domain emails/subdomains harvester",
    method: "pip", package: "theHarvester", binary: "theHarvester",
    homepage: "https://github.com/laramies/theHarvester",
    category: "domain", targetTypes: ["domain"],
  },
  photon: {
    name: "Photon", description: "Web crawler OSINT",
    method: "pip", package: "photon", binary: "photon",
    homepage: "https://github.com/s0md3v/Photon",
    category: "domain", targetTypes: ["domain", "url"],
  },

  // ═ Python deps for image analysis ═
  image_deps: {
    name: "Image Analysis Deps", description: "Pillow + pytesseract + PicImageSearch",
    method: "pip", package: "Pillow pytesseract PicImageSearch httpx",
    category: "image", targetTypes: ["image_url"],
  },
};

// ─── LIST installable modules ──────────────────────────────────────────────
moduleInstallerRouter.get("/installable", (_req, res) => {
  res.json({
    count: Object.keys(INSTALLABLE_MODULES).length,
    modules: Object.entries(INSTALLABLE_MODULES).map(([id, m]) => ({
      id, ...m,
    })),
  });
});

// ─── CHECK install status ──────────────────────────────────────────────────
moduleInstallerRouter.get("/check/:id", async (req, res) => {
  const id = req.params.id;
  const mod = INSTALLABLE_MODULES[id];
  if (!mod) return res.status(404).json({ error: "unknown module" });

  try {
    if (mod.binary) {
      const { stdout } = await execAsync(`${mod.binary} --version 2>&1 || ${mod.binary} --help 2>&1`, { timeout: 5000 });
      if (stdout) return res.json({ installed: true, id, method: mod.method, output: stdout.slice(0, 200) });
    }
    if (mod.method === "pip") {
      const pkg = mod.package.split(" ")[0]; // first package if multi
      const { stdout } = await execAsync(`pip show ${pkg} 2>&1`, { timeout: 5000 });
      return res.json({ installed: !!stdout && !stdout.includes("not found"), id, output: stdout.slice(0, 300) });
    }
    return res.json({ installed: false, id });
  } catch {
    return res.json({ installed: false, id });
  }
});

// ─── INSTALL a module ──────────────────────────────────────────────────────
moduleInstallerRouter.post("/install/:id", async (req, res) => {
  const id = req.params.id;
  const mod = INSTALLABLE_MODULES[id];
  if (!mod) return res.status(404).json({ error: "unknown module" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  if (res.socket) res.socket.setNoDelay(true);

  const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  send({ type: "start", id, method: mod.method, package: mod.package });

  let cmd = "";
  if (mod.method === "pip") {
    const breakFlag = process.platform === "linux" ? "--break-system-packages" : "";
    cmd = `pip install ${breakFlag} ${mod.package}`;
  } else if (mod.method === "npm") {
    cmd = `npm install -g ${mod.package}`;
  } else if (mod.method === "go") {
    cmd = `go install ${mod.package}`;
  } else if (mod.method === "git") {
    cmd = `git clone ${mod.package}`;
  }

  send({ type: "command", cmd });

  try {
    const { spawn } = await import("child_process");
    const isWin = process.platform === "win32";
    const proc = spawn(isWin ? "cmd" : "bash", [isWin ? "/c" : "-c", cmd], { shell: false });

    proc.stdout.on("data", (d: Buffer) => send({ type: "stdout", data: d.toString().slice(0, 500) }));
    proc.stderr.on("data", (d: Buffer) => send({ type: "stderr", data: d.toString().slice(0, 500) }));
    proc.on("exit", (code) => {
      send({ type: "done", code, success: code === 0 });
      res.write("data: [DONE]\n\n");
      res.end();
    });
    proc.on("error", (err) => {
      send({ type: "error", message: err.message });
      res.end();
    });
  } catch (err: any) {
    send({ type: "error", message: err.message });
    res.end();
  }
});

// ─── UNINSTALL ─────────────────────────────────────────────────────────────
moduleInstallerRouter.post("/uninstall/:id", async (req, res) => {
  const id = req.params.id;
  const mod = INSTALLABLE_MODULES[id];
  if (!mod) return res.status(404).json({ error: "unknown module" });

  try {
    let cmd = "";
    if (mod.method === "pip") cmd = `pip uninstall -y ${mod.package.split(" ")[0]}`;
    else if (mod.method === "npm") cmd = `npm uninstall -g ${mod.package}`;
    else return res.status(400).json({ error: "method_not_uninstallable" });

    const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
    res.json({ success: true, stdout: stdout.slice(0, 500), stderr: stderr.slice(0, 500) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
