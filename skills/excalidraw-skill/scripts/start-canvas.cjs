#!/usr/bin/env node
/* eslint-disable no-console */

const { ensureCanvasRunning } = require("./lib/canvas-bootstrap.cjs");

const DEFAULT_URL = process.env.EXPRESS_SERVER_URL || "http://localhost:3000";

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/start-canvas.cjs [--url <canvasUrl>] [--repo <repoRoot>] [--host <host>] [--port <port>]",
      "",
      "Repo resolution order:",
      "  1. --repo",
      "  2. EXCALIDRAW_REPO_DIR",
      "  3. current working directory",
      "  4. local repo-relative path (when running from the repo)",
      "  5. codex mcp list (if Codex is installed and excalidraw is registered)",
    ].join("\n"),
  );
  process.exit(2);
}

function parseArgs(argv) {
  const out = {
    url: DEFAULT_URL,
    repoRoot: "",
    host: process.env.HOST || "127.0.0.1",
    port: process.env.PORT || "3000",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--url") out.url = argv[++index];
    else if (arg === "--repo") out.repoRoot = argv[++index];
    else if (arg === "--host") out.host = argv[++index];
    else if (arg === "--port") out.port = argv[++index];
    else if (arg === "--help" || arg === "-h") usage();
    else usage();
  }

  return out;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await ensureCanvasRunning(options);

  if (!result.ok) {
    throw new Error(result.reason || "Failed to ensure the canvas server is running.");
  }

  if (result.started) {
    console.log(
      `Started canvas server at ${result.url} from ${result.repoRoot} (pid ${result.pid}).`,
    );
    console.log(`Logs: ${result.logFile}`);
    return;
  }

  console.log(`Canvas server already healthy at ${result.url}.`);
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
