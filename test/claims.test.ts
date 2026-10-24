import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ADVISOR_AGENT,
  CLAIM_TTL_MS,
  type ClaimWriter,
  claimWrites,
  namedPaths,
  projectPathOf,
  projectRootOf,
  releaseAgentClaims,
  releaseTerminalClaims,
} from "../src/core/claims";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const projectRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), "trama-claims-"));
  roots.push(root);
  mkdirSync(join(root, ".trama"));
  return root;
};

const sub = (agent: string, terminal = "t1", ancestors: string[] = ["main"]): ClaimWriter => ({ role: "sub", agent, terminal, ancestors });
const main: ClaimWriter = { role: "main", agent: "main", terminal: "t1", ancestors: [] };
const advisor: ClaimWriter = { role: "advisor", agent: ADVISOR_AGENT, terminal: "t1", ancestors: ["main"] };

const T0 = new Date("2030-01-01T10:00:00.000Z");
const at = (ms: number): Date => new Date(T0.getTime() + ms);

describe("claims of the files a Run writes", () => {
  test("the first sub-agent to write a file claims it; another sub-agent is stopped and names the holder", () => {
    const root = projectRoot();
    expect(claimWrites(root, ["src/a.ts"], sub("a"), T0)).toBeUndefined();
    const message = claimWrites(root, ["src/a.ts"], sub("b"), T0);
    expect(message).toContain("src/a.ts is claimed by sub-agent a of this run");
    expect(message).toContain("Stop now");
  });

  test("a sub-agent of another terminal is stopped as well, and the message says another run", () => {
    const root = projectRoot();
    claimWrites(root, ["a.ts"], sub("a", "t1"), T0);
    expect(claimWrites(root, ["a.ts"], sub("b", "t2"), T0)).toContain("claimed by sub-agent a of another run");
  });

  test("the holder and its descendants renew the claim; an unrelated sub-agent is still stopped", () => {
    const root = projectRoot();
    claimWrites(root, ["a.ts"], sub("a"), T0);
    expect(claimWrites(root, ["a.ts"], sub("a"), at(60_000))).toBeUndefined();
    expect(claimWrites(root, ["a.ts"], sub("c", "t1", ["a", "main"]), at(120_000))).toBeUndefined();
    expect(claimWrites(root, ["a.ts"], sub("d"), at(180_000))).toContain("sub-agent a");
  });

  test("the main agent is stopped by a live claim and takes no claim of its own", () => {
    const root = projectRoot();
    claimWrites(root, ["a.ts"], sub("a"), T0);
    expect(claimWrites(root, ["a.ts"], main, T0)).toContain("sub-agent a");
    expect(claimWrites(root, ["b.ts"], main, T0)).toBeUndefined();
    expect(claimWrites(root, ["b.ts"], sub("b"), T0)).toBeUndefined();
  });

  test("the advisor neither claims nor is stopped by a claim", () => {
    const root = projectRoot();
    claimWrites(root, ["a.ts"], sub("a"), T0);
    expect(claimWrites(root, ["a.ts"], advisor, T0)).toBeUndefined();
    expect(claimWrites(root, ["new.ts"], advisor, T0)).toBeUndefined();
    expect(claimWrites(root, ["new.ts"], sub("b"), T0)).toBeUndefined();
  });

  test("a claim expires two hours after its last renewal", () => {
    const root = projectRoot();
    claimWrites(root, ["a.ts"], sub("a"), T0);
    expect(claimWrites(root, ["a.ts"], sub("b"), at(CLAIM_TTL_MS - 1))).toContain("sub-agent a");
    expect(claimWrites(root, ["a.ts"], sub("b"), at(CLAIM_TTL_MS + 1000))).toBeUndefined();
    expect(claimWrites(root, ["a.ts"], sub("a"), at(CLAIM_TTL_MS + 2000))).toContain("sub-agent b");
  });

  test("several paths are all-or-nothing: one blocked path stops the call and leaves the others unclaimed", () => {
    const root = projectRoot();
    claimWrites(root, ["b.ts"], sub("a"), T0);
    expect(claimWrites(root, ["c.ts", "b.ts"], sub("x"), T0)).toContain("b.ts is claimed by sub-agent a");
    expect(claimWrites(root, ["c.ts"], sub("y"), T0)).toBeUndefined();
  });

  test("releasing a sub-agent frees only its own claims in its terminal", () => {
    const root = projectRoot();
    claimWrites(root, ["a.ts"], sub("a", "t1"), T0);
    claimWrites(root, ["b.ts"], sub("b", "t1"), T0);
    claimWrites(root, ["c.ts"], sub("a", "t2"), T0);
    releaseAgentClaims(root, "t1", "a");
    expect(claimWrites(root, ["a.ts"], sub("x", "t1"), T0)).toBeUndefined();
    expect(claimWrites(root, ["b.ts"], sub("x", "t1"), T0)).toContain("sub-agent b");
    expect(claimWrites(root, ["c.ts"], sub("x", "t2"), T0)).toContain("sub-agent a");
  });

  test("releasing a terminal frees every claim of that terminal, and a project without claims is not an error", () => {
    const root = projectRoot();
    expect(() => releaseTerminalClaims(root, "t1")).not.toThrow();
    claimWrites(root, ["a.ts"], sub("a", "t1"), T0);
    claimWrites(root, ["b.ts"], sub("b", "t2"), T0);
    releaseTerminalClaims(root, "t1");
    expect(claimWrites(root, ["a.ts"], sub("x", "t2"), T0)).toBeUndefined();
    expect(claimWrites(root, ["b.ts"], sub("x", "t2"), T0)).toContain("sub-agent b");
  });

  test("a malformed claim file stops the write and names the reason", () => {
    const root = projectRoot();
    const hash = createHash("sha256").update("a.ts").digest("hex");
    mkdirSync(join(root, ".trama", "claims"), { recursive: true });
    writeFileSync(join(root, ".trama", "claims", `${hash}.json`), "{ not json");
    const message = claimWrites(root, ["a.ts"], sub("a"), T0);
    expect(message).toContain("could not check the claim of a.ts");
    expect(message).toContain("the claim file is malformed");
  });

  test("a claim store that cannot be written stops the write and names the path and the reason", () => {
    const root = projectRoot();
    writeFileSync(join(root, ".trama", "claims"), "not a folder");
    const message = claimWrites(root, ["src/a.ts"], sub("a"), T0);
    expect(message).toContain("Trama could not check the claim of src/a.ts:");
    expect(message).toEndWith("Stop now and report it to the main agent.");
  });
});

describe("paths of the write tools", () => {
  test("a path inside the project is project-relative; outside it, or the root itself, is none", () => {
    const root = projectRoot();
    mkdirSync(join(root, "src"));
    expect(projectPathOf(root, root, "src/a.ts")).toBe("src/a.ts");
    expect(projectPathOf(root, join(root, "src"), "a.ts")).toBe("src/a.ts");
    expect(projectPathOf(root, root, join(root, "src", "a.ts"))).toBe("src/a.ts");
    expect(projectPathOf(root, root, "../elsewhere.ts")).toBeUndefined();
    expect(projectPathOf(root, root, ".")).toBeUndefined();
  });

  test("the project of a directory is the nearest folder holding .trama, and none outside every project", () => {
    const root = projectRoot();
    mkdirSync(join(root, "src", "deep"), { recursive: true });
    expect(projectRootOf(join(root, "src", "deep"))).toBe(root);
    const outside = mkdtempSync(join(tmpdir(), "trama-outside-"));
    roots.push(outside);
    expect(projectRootOf(outside)).toBeUndefined();
  });

  test("the paths a write tool names: path, paths, and the headers of an apply_patch", () => {
    expect(namedPaths("write", { path: "a.ts" })).toEqual(["a.ts"]);
    expect(namedPaths("edit", { paths: ["a.ts", "b.ts"] })).toEqual(["a.ts", "b.ts"]);
    const patch = "*** Begin Patch\n*** Update File: a.ts\n*** Add File: b.ts\n*** Delete File: c.ts\n*** Move to: d.ts\n*** End Patch";
    expect(namedPaths("apply_patch", { input: patch })).toEqual(["a.ts", "b.ts", "c.ts", "d.ts"]);
  });
});
