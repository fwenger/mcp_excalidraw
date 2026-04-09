const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

function parseCodexMcpListForRepoRoot(output) {
  if (!output) return null;

  const match = output.match(/(?:^|\n)excalidraw\s+\S+\s+(\/\S+\/dist\/index\.js)\b/);
  if (!match) return null;

  return path.dirname(path.dirname(match[1]));
}

function isRepoRoot(candidate, exists = fs.existsSync) {
  if (!candidate) return false;
  return (
    exists(path.join(candidate, "package.json")) &&
    exists(path.join(candidate, "src", "server.ts"))
  );
}

function resolveRepoRoot({
  envRepoDir = process.env.EXCALIDRAW_REPO_DIR,
  cwd = process.cwd(),
  scriptDir = __dirname,
  exists = fs.existsSync,
  codexMcpListOutput,
} = {}) {
  const scriptRelativeRepoRoot = path.resolve(scriptDir, "../../..");
  const codexRepoRoot = parseCodexMcpListForRepoRoot(codexMcpListOutput);

  const candidates = [
    envRepoDir,
    cwd,
    scriptRelativeRepoRoot,
    codexRepoRoot,
  ];

  for (const candidate of candidates) {
    if (isRepoRoot(candidate, exists)) return candidate;
  }

  return null;
}

function readCodexMcpList() {
  try {
    return execFileSync("codex", ["mcp", "list"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

async function isCanvasHealthy(baseUrl) {
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node 18+ (global fetch).");
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startCanvasServer({
  repoRoot,
  host = process.env.HOST || "127.0.0.1",
  port = process.env.PORT || "3000",
  logFile = path.join(repoRoot, "output", "canvas.log"),
} = {}) {
  if (!repoRoot) {
    throw new Error("repoRoot is required to start the canvas server");
  }

  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const outputFd = fs.openSync(logFile, "a");

  const child = spawn("npm", ["run", "canvas"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      HOST: String(host),
      PORT: String(port),
    },
    detached: true,
    stdio: ["ignore", outputFd, outputFd],
  });

  child.unref();

  return { pid: child.pid, logFile };
}

async function ensureCanvasRunning({
  url = process.env.EXPRESS_SERVER_URL || "http://localhost:3000",
  repoRoot,
  host = process.env.HOST || "127.0.0.1",
  port = process.env.PORT || "3000",
  retries = 15,
  retryDelayMs = 1000,
} = {}) {
  if (await isCanvasHealthy(url)) {
    return { ok: true, started: false, url };
  }

  const resolvedRepoRoot =
    repoRoot ||
    resolveRepoRoot({
      codexMcpListOutput: readCodexMcpList(),
    });

  if (!resolvedRepoRoot) {
    return {
      ok: false,
      started: false,
      url,
      reason:
        "Could not locate the mcp_excalidraw repo. Set EXCALIDRAW_REPO_DIR or pass --repo.",
    };
  }

  const startResult = startCanvasServer({
    repoRoot: resolvedRepoRoot,
    host,
    port,
  });

  for (let attempt = 0; attempt < retries; attempt += 1) {
    await sleep(retryDelayMs);
    if (await isCanvasHealthy(url)) {
      return {
        ok: true,
        started: true,
        url,
        repoRoot: resolvedRepoRoot,
        ...startResult,
      };
    }
  }

  return {
    ok: false,
    started: true,
    url,
    repoRoot: resolvedRepoRoot,
    ...startResult,
    reason: `Canvas server did not become healthy at ${url} in time.`,
  };
}

module.exports = {
  ensureCanvasRunning,
  isCanvasHealthy,
  parseCodexMcpListForRepoRoot,
  resolveRepoRoot,
  startCanvasServer,
};
