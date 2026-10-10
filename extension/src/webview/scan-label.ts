export function scanButtonLabel(label: string, tasksSinceScan: number): { text: string; tooltip: string; ariaLabel: string } {
  const text = tasksSinceScan > 0 ? `${label} · ${tasksSinceScan}` : label;
  const tooltip = tasksSinceScan > 0 ? `${tasksSinceScan} Task${tasksSinceScan === 1 ? "" : "s"} finished since the last scan of the System` : "";
  return { text, tooltip, ariaLabel: tooltip ? `${text}. ${tooltip}` : text };
}
