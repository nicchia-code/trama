import { describe, expect, test } from "bun:test";
import { dismissBlocker } from "../extension/src/webview/dismiss";
describe("Dismiss Drift blocker", () => {
  test("a Drift listed in a resolution, being written or open, is disabled, pointing at the resolution", () => {
    expect(dismissBlocker("0003", ["0009", "0003"], null)).toBe("This Drift is part of a resolution: decide it there");
  });

  test("an agent resolving Drifts disables it, read from the resolve blocker", () => {
    expect(dismissBlocker("0003", [], "Drifts are being resolved")).toBe("An agent is resolving Drifts");
    expect(dismissBlocker("0003", [], "A run is in progress")).toBeNull();
  });

  test("otherwise it works", () => {
    expect(dismissBlocker("0003", ["0009"], null)).toBeNull();
  });
});
