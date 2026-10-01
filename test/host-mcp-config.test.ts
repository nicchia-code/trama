import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureCursorMcp } from "../extension/src/host/mcp-config";
import { projectAt } from "../src/core/store";

let root: string;
beforeEach(() => (root = mkdtempSync(join(tmpdir(), "trama-cursor-"))));
afterEach(() => rmSync(root, { recursive: true, force: true }));

const file = () => join(root, ".cursor", "mcp.json");
const read = () => JSON.parse(readFileSync(file(), "utf8"));

test("creates the file, then leaves it alone while it is right", () => {
  expect(ensureCursorMcp(projectAt(root), "/opt/trama")).toBe("written");
  expect(read()).toEqual({ mcpServers: { trama: { command: "/opt/trama", args: ["--root", root, "mcp"] } } });
  expect(ensureCursorMcp(projectAt(root), "/opt/trama")).toBe("unchanged");
});

test("keeps the developer's other servers and keys, and updates a stale Trama entry", () => {
  mkdirSync(join(root, ".cursor"));
  writeFileSync(file(), JSON.stringify({ mcpServers: { github: { url: "https://x" }, trama: { command: "old" } }, other: 1 }));
  expect(ensureCursorMcp(projectAt(root), "trama")).toBe("written");
  expect(read()).toEqual({ mcpServers: { github: { url: "https://x" }, trama: { command: "trama", args: ["--root", root, "mcp"] } }, other: 1 });
});

test("never overwrites a file it cannot read", () => {
  mkdirSync(join(root, ".cursor"));
  writeFileSync(file(), "{ broken");
  expect(ensureCursorMcp(projectAt(root), "trama")).toBe("unreadable");
  expect(readFileSync(file(), "utf8")).toBe("{ broken");
});
