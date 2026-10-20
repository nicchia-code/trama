import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REGISTRY } from "../src/cli/commands";
import { run } from "../src/cli/main";
import { TramaError } from "../src/core/errors";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-model-commands-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const trama = (...argv: string[]) => run(["--root", dir, ...argv], dir, {});
const show = (ref?: string, input?: object) => trama("model", "show", ...(ref === undefined ? [] : [ref]), ...(input === undefined ? [] : ["--input", JSON.stringify(input)]));
const json = (out: string): unknown => JSON.parse(out);

/** Every `--json` output fits the output schema its command declares. */
const output = (name: string) => REGISTRY.find("model", name)!.output;

test("model show without a reference is the System: description, Actors and Features", () => {
  const out = show().out;
  expect(out).toStartWith("# Shop");
  expect(out).toContain("## Actors");
  expect(out).toContain("- **user**");
  expect(out).toContain("## Features");
  expect(out).toContain("- **checkout**");
  expect(() => output("show").parse(json(trama("--json", "model", "show").out))).not.toThrow();
});

test("model show gives the view of a Feature, a Machine, an Actor, a State, a Transition and an Event, each followed by its Requirements", () => {
  const views: [string, string][] = [
    ["checkout", "# Checkout (feature `checkout`)"],
    ["order", "# Order (machine `order`, feature `checkout`)"],
    ["user", "# User (actor `user`)"],
    ["order/Paid", "# order/Paid"],
    ["order/Paid/user.CANCEL", "# `order/Paid/user.CANCEL`"],
    ["user.CANCEL", "# `user.CANCEL` (emitted by Actor `user`)"],
  ];
  for (const [ref, heading] of views) {
    const result = show(ref);
    expect(result.exit).toBe(0);
    expect(result.out).toContain(heading);
    expect(() => output("show").parse(json(trama("--json", "model", "show", ref).out))).not.toThrow();
  }
  expect(show("order/Paid/user.CANCEL").out).toContain("→ Cancelled: only if nothing has been prepared yet");
  expect(show("user").out).toContain("`user.CANCEL`");
  expect(show("order/Paid").out).toContain("## Outgoing Transitions");
  expect(() => show("ghost")).toThrow(TramaError);
  expect(() => show("order/Nowhere")).toThrow(/Cannot resolve/);
});

test("model show requirements lists the Areas and requirements/<area> shows one in full", () => {
  const list = show("requirements").out;
  expect(list).toStartWith("# Requirements");
  expect(list).toContain("`requirements/ui`");
  expect(list).toContain("`requirements/data`");
  expect(show("requirements/ui").out).toStartWith("# ");
  expect(show("requirements/ui").out).toContain("requirements/ui");
  expect(() => show("requirements/nope")).toThrow(/no Area "nope"/);
  expect(() => output("show").parse(json(trama("--json", "model", "show", "requirements").out))).not.toThrow();
  expect(() => output("show").parse(json(trama("--json", "model", "show", "requirements/ui").out))).not.toThrow();
});

test("model show on a State with to gives the simple paths, shortest first, at most max of them", () => {
  const paths = show("order/Paid", { to: "Shipped" });
  expect(paths.out).toContain("# Paths in `order`: Paid → Shipped");
  expect(paths.out).toMatch(/1\. Ready to ship → Shipped/);
  expect(paths.out).toMatch(/2\. Preparing → Ready to ship → Shipped/);
  const one = show("order/Paid", { to: "Shipped", max: 1 });
  expect(one.out).toContain("Stopped after 1 path(s)");
  expect(one.out).not.toMatch(/\n2\. /);
  expect(() => output("show").parse(json(trama("--json", "model", "show", "order/Paid", "--input", '{"to":"Shipped"}').out))).not.toThrow();
  expect(() => show("order/Paid", { to: "Nowhere" })).toThrow(/Unknown State "Nowhere"/);
});

test("to and max are refused where they mean nothing, before anything is read", () => {
  expect(() => show("order/Paid", { max: 3 })).toThrow(/- max: max applies only with to/);
  expect(() => show("order", { to: "Shipped" })).toThrow(/to applies only to a State/);
  expect(() => show(undefined, { to: "Shipped" })).toThrow(/to applies only to a State/);
  expect(() => show("requirements", { to: "Shipped" })).toThrow(/to applies only to a State/);
  expect(() => show("order/Paid", { max: 0, to: "Shipped" })).toThrow(/- max: /);
});

test("model list searches the names and the prose of the Model and its Requirements", () => {
  const out = trama("model", "list", "--input", '{"text":"refund"}').out;
  expect(out).toStartWith("# Search: refund");
  expect(out).toContain("`order/Refunding`");
  expect(trama("model", "list", "--input", '{"text":"zzzz-nothing"}').out).toContain("_No matches._");
  expect(() => trama("model", "list", "--input", '{"text":""}')).toThrow(/- text: /);
  expect(() => output("list").parse(json(trama("--json", "model", "list", "--input", '{"text":"refund"}').out))).not.toThrow();
});

test("model check reports the errors, which fail it, and apart the warnings, which never do", () => {
  const clean = trama("model", "check");
  expect(clean.out).toBe("The Model and its Requirements are valid.");
  expect(clean.exit).toBe(0);

  // A State nothing enters is a warning, and only for its own Machine.
  const file = join(dir, ".trama", "model", "checkout", "order.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("## Events", "### Lost\n- `payment.SUCCEEDED` → Paid\n\n## Events"));
  const warned = trama("model", "check");
  expect(warned.exit).toBe(0);
  expect(warned.out).toContain("1 warning(s), which never fail the check:");
  expect(warned.out).toContain("[unreachable-state]");
  expect(trama("model", "check", "cart").out).toBe("The Model and its Requirements are valid.");
  expect(trama("model", "check", "order").out).toContain("warning(s) of `order`");
  expect(() => trama("model", "check", "ghost")).toThrow(/Unknown Machine "ghost"/);
  const data = output("check").parse(json(trama("--json", "model", "check").out));
  expect(data).toMatchObject({ valid: true, warnings: [{ kind: "unreachable-state" }] });
  writeFileSync(file, readFileSync(file, "utf8").replace("## Events", "### Broken\n- `payment.SUCCEEDED` → Nowhere at all\n\n## Events"));
  const broken = trama("model", "check");
  expect(broken.exit).toBe(1);
  expect(broken.out).toContain("error(s)");
  expect(output("check").parse(json(trama("--json", "model", "check").out))).toMatchObject({ valid: false });
});
