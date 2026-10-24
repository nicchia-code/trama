import { describe, expect, test } from "bun:test";
import { scanButtonLabel } from "../extension/src/webview/scan-label";

describe("scan button labels", () => {
  test("adds singular and plural counts and accessible labels only when positive", () => {
    expect(scanButtonLabel("Scan System", 0)).toEqual({
      text: "Scan System",
      tooltip: "",
      ariaLabel: "Scan System",
    });
    expect(scanButtonLabel("Scan System", 1)).toEqual({
      text: "Scan System · 1",
      tooltip: "1 Task finished since the last scan of the System",
      ariaLabel: "Scan System · 1. 1 Task finished since the last scan of the System",
    });
    expect(scanButtonLabel("Scan", 2)).toEqual({
      text: "Scan · 2",
      tooltip: "2 Tasks finished since the last scan of the System",
      ariaLabel: "Scan · 2. 2 Tasks finished since the last scan of the System",
    });
  });

  test("the Advisor Scanner does not change the label: Scan System stays enabled with its count", () => {
    expect(scanButtonLabel("Scan System", 3).text).toBe("Scan System · 3");
    expect(scanButtonLabel("Scan", 0).text).toBe("Scan");
  });
});
