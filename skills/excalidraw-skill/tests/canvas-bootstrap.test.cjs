const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseCodexMcpListForRepoRoot,
  resolveRepoRoot,
} = require("../scripts/lib/canvas-bootstrap.cjs");

test("parseCodexMcpListForRepoRoot extracts repo root from codex mcp list output", () => {
  const repoRoot = parseCodexMcpListForRepoRoot(
    [
      "Name        Command  Args                                           Env",
      "excalidraw  node     /Users/felix/tmp/mcp_excalidraw/dist/index.js  ENABLE_CANVAS_SYNC=*****",
    ].join("\n"),
  );

  assert.equal(repoRoot, "/Users/felix/tmp/mcp_excalidraw");
});

test("resolveRepoRoot prefers EXCALIDRAW_REPO_DIR when it points to a valid repo", () => {
  const repoRoot = resolveRepoRoot({
    envRepoDir: "/repo/from-env",
    cwd: "/repo/from-cwd",
    scriptDir: "/Users/felix/.codex/skills/excalidraw-skill/scripts",
    exists: (target) =>
      target === "/repo/from-env/package.json" ||
      target === "/repo/from-env/src/server.ts",
    codexMcpListOutput: "",
  });

  assert.equal(repoRoot, "/repo/from-env");
});

test("resolveRepoRoot falls back to the repo registered in codex mcp list", () => {
  const repoRoot = resolveRepoRoot({
    envRepoDir: "",
    cwd: "/not-the-repo",
    scriptDir: "/Users/felix/.codex/skills/excalidraw-skill/scripts",
    exists: (target) =>
      target === "/Users/felix/tmp/mcp_excalidraw/package.json" ||
      target === "/Users/felix/tmp/mcp_excalidraw/src/server.ts",
    codexMcpListOutput: [
      "Name        Command  Args                                           Env",
      "excalidraw  node     /Users/felix/tmp/mcp_excalidraw/dist/index.js  ENABLE_CANVAS_SYNC=*****",
    ].join("\n"),
  });

  assert.equal(repoRoot, "/Users/felix/tmp/mcp_excalidraw");
});
