import { describe, expect, test } from "bun:test";
import { dismissBlocker } from "../extension/src/webview/dismiss";
import type { ProposalView } from "../src/core/snapshot";

const resolution = (drifts: string[]) => ({ kind: "resolution", resolves: drifts.map((drift) => ({ drift })) }) as unknown as ProposalView;
const change = { kind: "change", resolves: [] } as unknown as ProposalView;

describe("Dismiss Drift blocker", () => {
  test("a Drift listed in a resolution is disabled, pointing at the resolution", () => {
    expect(dismissBlocker("0003", [change, resolution(["0003"])], null)).toBe("This Drift is part of a resolution: decide it there");
  });

  test("an agent resolving Drifts disables it, read from the resolve blocker", () => {
    expect(dismissBlocker("0003", [change], "Drifts are being resolved")).toBe("An agent is resolving Drifts");
    expect(dismissBlocker("0003", [change], "A run is in progress")).toBeNull();
  });

  test("otherwise it works", () => {
    expect(dismissBlocker("0003", [change, resolution(["0009"])], null)).toBeNull();
  });
});
