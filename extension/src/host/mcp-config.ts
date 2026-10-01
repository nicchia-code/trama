import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../../../src/core/store";
import { writeFileEnsuringDir } from "../../../src/core/store";

/**
 * The `trama` executable for agents: the binary shipped inside the extension when there is one for this platform,
 * otherwise whatever `trama` is on the PATH.
 */
export function tramaExecutable(extensionPath: string): string {
  const bundled = join(extensionPath, "bin", process.platform === "win32" ? "trama.exe" : "trama");
  return existsSync(bundled) ? bundled : "trama";
}

/**
 * Makes sure the project's `.cursor/mcp.json` starts the Trama MCP server, keeping every other server in it.
 * Returns what happened, so the caller can tell the developer once.
 */
export function ensureCursorMcp(project: Project, executable: string): "unchanged" | "written" | "unreadable" {
  const file = join(project.root, ".cursor", "mcp.json");
  let config: { mcpServers?: Record<string, unknown> } = {};
  if (existsSync(file)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return "unreadable";
      config = parsed as typeof config;
    } catch {
      return "unreadable";
    }
  }
  const wanted = { command: executable, args: ["--root", project.root, "mcp"] };
  const servers = typeof config.mcpServers === "object" && config.mcpServers !== null ? config.mcpServers : {};
  if (JSON.stringify(servers["trama"]) === JSON.stringify(wanted)) return "unchanged";
  writeFileEnsuringDir(file, `${JSON.stringify({ ...config, mcpServers: { ...servers, trama: wanted } }, null, 2)}\n`);
  return "written";
}
