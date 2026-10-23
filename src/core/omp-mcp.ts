import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// The MCP servers omp's native files declare, in the shape ACP's `session/new` takes them (`mcpServers`). omp's native files are `.omp/mcp.json` in the project and
// `~/.omp/agent/mcp.json` for the user (`~/.omp/profiles/<name>/agent/mcp.json` when a named profile is active); the project entry comes first, so its
// `enabled: false` hides the user's server of the same name. Files that are missing or not valid give no server.

export interface AcpEnvVariable {
  name: string;
  value: string;
}

/** A server of ACP's `mcpServers`: stdio has no `type`; `http` and `sse` carry theirs. */
export type AcpMcpServer =
  | { name: string; command: string; args: string[]; env: AcpEnvVariable[] }
  | { type: "http" | "sse"; name: string; url: string; headers: AcpEnvVariable[] };

/** One entry of a file: whether it is on and, when it is a valid definition, the server. */
export interface McpEntry {
  name: string;
  enabled: boolean;
  server?: AcpMcpServer;
}

type Environment = Readonly<Record<string, string | undefined>>;

/** Expands `${VAR}` and `${VAR:-default}`; `${VAR}` of an unset variable stays as written, and `:-` takes its default when the variable is unset or empty. */
export function expandVariables(text: string, env: Environment): string {
  return text.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g, (whole, name: string, fallback: string | undefined) => {
    const value = env[name];
    if (fallback !== undefined) return value === undefined || value === "" ? fallback : value;
    return value === undefined ? whole : value;
  });
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

/** The strings of a record as `{ name, value }` pairs, expanded; other values are left out. */
function pairs(value: unknown, env: Environment): AcpEnvVariable[] {
  return Object.entries(record(value) ?? {}).flatMap(([name, item]) => (typeof item === "string" ? [{ name, value: expandVariables(item, env) }] : []));
}

function serverOf(name: string, entry: Record<string, unknown>, env: Environment): AcpMcpServer | undefined {
  const type = typeof entry["type"] === "string" ? entry["type"] : undefined;
  const url = typeof entry["url"] === "string" && entry["url"] !== "" ? expandVariables(entry["url"], env) : undefined;
  const command = typeof entry["command"] === "string" && entry["command"] !== "" ? expandVariables(entry["command"], env) : undefined;
  const kind = type ?? (url !== undefined ? "http" : command !== undefined ? "stdio" : undefined);
  if ((kind === "http" || kind === "sse") && url !== undefined) return { type: kind, name, url, headers: pairs(entry["headers"], env) };
  if (kind === "stdio" && command !== undefined) {
    const args = Array.isArray(entry["args"]) ? entry["args"].flatMap((arg) => (typeof arg === "string" ? [expandVariables(arg, env)] : [])) : [];
    return { name, command, args, env: pairs(entry["env"], env) };
  }
  return undefined;
}

/** The entries of an `mcp.json` text, in file order; text that is not a JSON object with an `mcpServers` object gives none. */
export function parseMcpFile(text: string, env: Environment): McpEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const servers = record(record(parsed)?.["mcpServers"]);
  if (servers === undefined) return [];
  return Object.entries(servers).flatMap(([name, value]) => {
    const entry = record(value);
    if (entry === undefined) return [];
    const server = serverOf(name, entry, env);
    return [{ name, enabled: entry["enabled"] !== false, ...(server === undefined ? {} : { server }) }];
  });
}

/** The servers on, the project's first: a name in the project file (on or off) takes the place of the user's server of that name. */
export function mergeMcpEntries(project: readonly McpEntry[], user: readonly McpEntry[]): AcpMcpServer[] {
  const taken = new Set(project.map((entry) => entry.name));
  return [...project, ...user.filter((entry) => !taken.has(entry.name))].flatMap((entry) => (entry.enabled && entry.server !== undefined ? [entry.server] : []));
}

/**
 * The two files, project first. The user's file is in the active profile's folder (`OMP_PROFILE` or `PI_PROFILE`, other than `default`), else in omp's agent
 * folder (`PI_CODING_AGENT_DIR`, else `<home>/<PI_CONFIG_DIR or .omp>/agent`).
 */
export function mcpFiles(root: string, env: Environment, home: string): { project: string; user: string } {
  const config = join(home, env["PI_CONFIG_DIR"] || ".omp");
  const profile = env["OMP_PROFILE"] || env["PI_PROFILE"];
  const agent = profile && profile !== "default" ? join(config, "profiles", profile, "agent") : env["PI_CODING_AGENT_DIR"] || join(config, "agent");
  return { project: join(root, ".omp", "mcp.json"), user: join(agent, "mcp.json") };
}

const readIfThere = (file: string): string => {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
};

/** The MCP servers of the project at `root` for `session/new`. `read` gives a file's text, or an empty text when it cannot be read. */
export function readMcpServers(root: string, env: Environment = process.env, home: string = homedir(), read: (file: string) => string = readIfThere): AcpMcpServer[] {
  const files = mcpFiles(root, env, home);
  return mergeMcpEntries(parseMcpFile(read(files.project), env), parseMcpFile(read(files.user), env));
}
