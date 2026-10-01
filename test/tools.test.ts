import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProposal, listProposals } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";
import { listTasks } from "../src/core/work";
import { callTool, TOOLS } from "../src/tools/catalog";
import { handleMcp } from "../src/tools/mcp";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-tools-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("no tool lets an agent make the developer's decisions", () => {
  const names = TOOLS.map((t) => t.name);
  for (const forbidden of [/approve/, /reject/, /resolve/]) expect(names.filter((n) => forbidden.test(n))).toEqual([]);
  expect(new Set(names).size).toBe(names.length);
  for (const t of TOOLS) expect(t.name).toMatch(/^trama_[a-z_]+$/);
});

describe("callTool", () => {
  test("a Proposal written through the tools is validated and leaves the Model untouched", () => {
    const before = readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8");
    expect(callTool(p, "trama_proposal_new", { title: "Lost parcels", body: "Couriers lose parcels." })).toEqual({ text: expect.stringContaining("Opened Proposal 0001"), isError: false });
    const good = before.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)");
    expect(callTool(p, "trama_proposal_write", { proposal: "1", path: "checkout/order.md", content: good }).text).toContain("is valid");
    const bad = callTool(p, "trama_proposal_write", { proposal: "1", path: "checkout/order.md", content: good.replace("→ Paid", "→ Nowhere") });
    expect(bad.isError).toBe(false);
    expect(bad.text).toContain('unknown State "Nowhere"');
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toBe(before);
    expect(getProposal(p, "1").data.status).toBe("open");
  });

  test("paths outside the Model are refused", () => {
    callTool(p, "trama_proposal_new", { title: "x" });
    const r = callTool(p, "trama_proposal_write", { proposal: "1", path: "../../escape.md", content: "x" });
    expect(r.isError).toBe(true);
    expect(existsSync(join(dir, "escape.md"))).toBe(false);
  });

  test("bad input and domain errors come back as error results, not exceptions", () => {
    expect(callTool(p, "trama_nope", {}).isError).toBe(true);
    expect(callTool(p, "trama_view", [1, 2]).isError).toBe(true);
    expect(callTool(p, "trama_view", { ref: "ghost" })).toEqual({ text: expect.stringContaining('Cannot resolve "ghost"'), isError: true });
    expect(callTool(p, "trama_task_new", { title: "x", refs: "order" })).toEqual({ text: '"refs" must be a list of strings', isError: true });
    expect(callTool(p, "trama_task_new", { title: "x" }).isError).toBe(true);
    expect(listTasks(p)).toEqual([]);
  });

  test("view resolves every kind of reference", () => {
    for (const ref of [undefined, "checkout", "order", "user", "order/Paid", "order/Paid/user.CANCEL", "user.CANCEL"]) {
      const r = callTool(p, "trama_view", ref === undefined ? {} : { ref });
      expect(r.isError).toBe(false);
      expect(r.text.length).toBeGreaterThan(0);
    }
  });

  test("Tasks and Drifts created by tools appear on the board", () => {
    expect(callTool(p, "trama_task_new", { title: "Refunds", refs: ["order/Refunding"], body: "Money back" }).isError).toBe(false);
    expect(callTool(p, "trama_drift_new", { title: "Late refund", refs: ["order/Shipped"] }).isError).toBe(false);
    const board = callTool(p, "trama_board", {}).text;
    expect(board).toContain("Drift 0001: Late refund");
    expect(board).toContain("0001 Refunds");
  });
});

describe("MCP", () => {
  const ask = (message: unknown) => handleMcp(message, () => p, "9.9.9");

  test("initialize negotiates a supported version and announces tools", () => {
    expect(ask({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } })).toMatchObject({ result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "trama", version: "9.9.9" } } });
    expect(ask({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } })).toMatchObject({ result: { protocolVersion: "2025-06-18" } });
  });

  test("tools/list matches the catalog and marks read-only tools", () => {
    const r = ask({ jsonrpc: "2.0", id: 1, method: "tools/list" }) as { result: { tools: { name: string; annotations: { readOnlyHint: boolean } }[] } };
    expect(r.result.tools.map((t) => t.name)).toEqual(TOOLS.map((t) => t.name));
    expect(r.result.tools.find((t) => t.name === "trama_view")?.annotations.readOnlyHint).toBe(true);
    expect(r.result.tools.find((t) => t.name === "trama_task_new")?.annotations.readOnlyHint).toBe(false);
  });

  test("tools/call returns text content and isError", () => {
    expect(ask({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "trama_view", arguments: { ref: "ghost" } } })).toMatchObject({ id: 3, result: { isError: true, content: [{ type: "text" }] } });
    ask({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "trama_proposal_new", arguments: { title: "Via MCP" } } });
    expect(listProposals(p).map((x) => x.title)).toEqual(["Via MCP"]);
  });

  test("notifications get no answer; unknown methods and malformed requests get JSON-RPC errors", () => {
    expect(ask({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    expect(ask({ jsonrpc: "2.0", id: 5, method: "resources/list" })).toMatchObject({ id: 5, error: { code: -32601 } });
    expect(ask("nope")).toMatchObject({ error: { code: -32600 } });
  });

  test("the CLI serves MCP over stdio", async () => {
    const proc = Bun.spawn(["bun", join(import.meta.dir, "../src/cli/bin.ts"), "--root", dir, "mcp"], { stdin: "pipe", stdout: "pipe" });
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })}\n`);
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "trama_search", arguments: { text: "refund" } } })}\n`);
    proc.stdin.end();
    const lines = (await new Response(proc.stdout).text()).trim().split("\n").map((l) => JSON.parse(l));
    expect(await proc.exited).toBe(0);
    expect(lines.map((l) => l.id)).toEqual([1, 2]);
    expect(lines[1].result.content[0].text).toContain("order/Refunding");
  });
});
