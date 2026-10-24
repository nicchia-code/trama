import { describe, expect, test } from "bun:test";
import { SCANS_OFF_TOOLTIP, scanButtonLabel } from "../extension/src/webview/scan-label";

describe("scan button labels", () => {
  test("adds singular and plural counts and accessible labels only when positive", () => {
    expect(scanButtonLabel("Scan System", 0, false)).toEqual({
      text: "Scan System",
      tooltip: "",
      ariaLabel: "Scan System",
      disabled: false,
    });
    expect(scanButtonLabel("Scan System", 1, false)).toEqual({
      text: "Scan System · 1",
      tooltip: "1 Task finished since the last scan of the System",
      ariaLabel: "Scan System · 1. 1 Task finished since the last scan of the System",
      disabled: false,
    });
    expect(scanButtonLabel("Scan", 2, false)).toEqual({
      text: "Scan · 2",
      tooltip: "2 Tasks finished since the last scan of the System",
      ariaLabel: "Scan · 2. 2 Tasks finished since the last scan of the System",
      disabled: false,
    });
  });

  test("with the Advisor Scanner on, the button is disabled, keeps its label without the count, and says why", () => {
    expect(SCANS_OFF_TOOLTIP).toBe("Scan is off during Runs.");
    expect(scanButtonLabel("Scan System", 3, true)).toEqual({
      text: "Scan System",
      tooltip: SCANS_OFF_TOOLTIP,
      ariaLabel: `Scan System. ${SCANS_OFF_TOOLTIP}`,
      disabled: true,
    });
    expect(scanButtonLabel("Scan", 0, true).text).toBe("Scan");
  });
});
