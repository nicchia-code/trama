/** The tooltip of every Scan button while the Advisor Scanner is on: the code is checked during Runs, so no scan starts. */
export const SCANS_OFF_TOOLTIP = "Scans are off: the Advisor Scanner checks the code during Runs.";

/**
 * The label, tooltip and accessible name of a Scan button. With the Advisor Scanner on the button is disabled, keeps its
 * plain label without the count, and says why in its tooltip.
 */
export function scanButtonLabel(label: string, tasksSinceScan: number, advisorScanner: boolean): { text: string; tooltip: string; ariaLabel: string; disabled: boolean } {
  if (advisorScanner) return { text: label, tooltip: SCANS_OFF_TOOLTIP, ariaLabel: `${label}. ${SCANS_OFF_TOOLTIP}`, disabled: true };
  const text = tasksSinceScan > 0 ? `${label} · ${tasksSinceScan}` : label;
  const tooltip = tasksSinceScan > 0 ? `${tasksSinceScan} Task${tasksSinceScan === 1 ? "" : "s"} finished since the last scan of the System` : "";
  return { text, tooltip, ariaLabel: tooltip ? `${text}. ${tooltip}` : text, disabled: false };
}
