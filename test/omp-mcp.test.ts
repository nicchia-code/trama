import { describe, expect, test } from "bun:test";
import { expandVariables, mcpFiles, mergeMcpEntries, parseMcpFile, readMcpServers } from "../src/core/omp-mcp";

const file = (servers: Record<string, unknown>) => JSON.stringify({ mcpServers: servers });

describe("variables in MCP files", () => {
  const env = { HOME_DIR: "/home/x", EMPTY: "" };
  test("${VAR} is replaced and stays as written when unset", () => {
    expect(expandVariables("${HOME_DIR}/a/${MISSING}", env)).toBe("/home/x/a/${MISSING}");
  });
  test("${VAR:-default} takes the default when the variable is unset or empty", () => {
    expect(expandVariables("${MISSING:-one}-${EMPTY:-two}-${HOME_DIR:-three}", env)).toBe("one-two-/home/x");
  });
});

describe("reading an MCP file", () => {
  test("a stdio server gets its arguments and environment expanded", () => {
    const [entry] = parseMcpFile(file({ fs: { command: "npx", args: ["-y", "${PKG:-srv}"], env: { TOKEN: "${T}" } } }), { T: "secret" });
    expect(entry).toEqual({ name: "fs", enabled: true, server: { name: "fs", command: "npx", args: ["-y", "srv"], env: [{ name: "TOKEN", value: "secret" }] } });
  });
  test("a url without a type is http, with headers; sse keeps its type", () => {
    const entries = parseMcpFile(file({ a: { url: "https://x/mcp", headers: { Authorization: "Bearer ${T}" } }, b: { type: "sse", url: "https://x/sse" } }), { T: "k" });
    expect(entries.map((entry) => entry.server)).toEqual([
      { type: "http", name: "a", url: "https://x/mcp", headers: [{ name: "Authorization", value: "Bearer k" }] },
      { type: "sse", name: "b", url: "https://x/sse", headers: [] },
    ]);
  });
  test("text that is not valid, or has no mcpServers object, gives nothing", () => {
    expect(parseMcpFile("", {})).toEqual([]);
    expect(parseMcpFile("{nope", {})).toEqual([]);
    expect(parseMcpFile("[]", {})).toEqual([]);
    expect(parseMcpFile(JSON.stringify({ mcpServers: [] }), {})).toEqual([]);
  });
  test("an entry that is not a definition has no server but still has its name and state", () => {
    expect(parseMcpFile(file({ broken: { enabled: false }, odd: 3 }), {})).toEqual([{ name: "broken", enabled: false }]);
  });
});

describe("merging the project's file and the user's", () => {
  const server = (name: string) => ({ name, command: name, args: [], env: [] });
  const entry = (name: string, enabled = true) => ({ name, enabled, server: server(name) });
  test("the project's servers come first and a same-named user server is replaced", () => {
    expect(mergeMcpEntries([entry("a"), entry("b")], [entry("b"), entry("c")]).map((s) => s.name)).toEqual(["a", "b", "c"]);
    expect(mergeMcpEntries([{ ...entry("b"), server: { ...server("b"), command: "project" } }], [entry("b")])).toEqual([{ ...server("b"), command: "project" }]);
  });
  test("enabled: false in the project hides the user's server of that name", () => {
    expect(mergeMcpEntries([entry("b", false)], [entry("b"), entry("c")]).map((s) => s.name)).toEqual(["c"]);
  });
  test("a disabled user server is not offered", () => {
    expect(mergeMcpEntries([], [entry("x", false)])).toEqual([]);
  });
});

describe("where the files are", () => {
  test("project and default user file", () => {
    expect(mcpFiles("/p", {}, "/h")).toEqual({ project: "/p/.omp/mcp.json", user: "/h/.omp/agent/mcp.json" });
  });
  test("an active profile has its own agent folder", () => {
    expect(mcpFiles("/p", { OMP_PROFILE: "work" }, "/h").user).toBe("/h/.omp/profiles/work/agent/mcp.json");
    expect(mcpFiles("/p", { PI_PROFILE: "default" }, "/h").user).toBe("/h/.omp/agent/mcp.json");
  });
  test("PI_CODING_AGENT_DIR moves the default profile's agent folder", () => {
    expect(mcpFiles("/p", { PI_CODING_AGENT_DIR: "/agent" }, "/h").user).toBe("/agent/mcp.json");
  });
});

describe("the servers of a project", () => {
  test("missing files give no server and present ones are merged", () => {
    const files: Record<string, string> = {
      "/p/.omp/mcp.json": file({ one: { command: "p" } }),
      "/h/.omp/agent/mcp.json": file({ one: { command: "u" }, two: { command: "u2" } }),
    };
    const read = (path: string) => files[path] ?? "";
    expect(readMcpServers("/p", {}, "/h", read).map((server) => ("command" in server ? server.command : ""))).toEqual(["p", "u2"]);
    expect(readMcpServers("/q", {}, "/none", read)).toEqual([]);
  });
});
