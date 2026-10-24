// The usage of the developer's subscription as `omp usage --json` reports it (`rules#omp-chat-general`, `tech#omp-chat-general`). Everything here is pure: the host
// runs the command and the webview draws the bar; this module reads the report, names the windows and gives the percentages, the durations and the thresholds.
// Emails, identities of accounts, `metadata` and `resetCredits` of the report never leave `parseUsageReport`.

/** One limit window of a provider, summed over the accounts of the provider. */
export interface UsageWindow {
  /** `5h`, `7d`, `7d Fable`. */
  short: string;
  /** omp's own label of the first limit of the window (`Claude 5 Hour`). */
  label: string;
  /** The fraction used of the total of the accounts, as omp gives it (1 is the whole limit). */
  usedFraction: number;
  /** The nearest reset among the accounts, in milliseconds since the epoch. */
  resetsAt?: number;
}

export interface UsageProvider {
  id: string;
  name: string;
  windows: UsageWindow[];
}

export interface UsageReport {
  /** The instant omp produced the report, in milliseconds since the epoch. */
  generatedAt: number;
  /** In omp's order; empty when omp reports no subscription limits. */
  providers: UsageProvider[];
}

/** The level a percentage is drawn in: secondary text below 80 %, the colour of warnings from 80 %, the colour of errors from 100 %. */
export type UsageLevel = "ok" | "warning" | "error";

const WARNING_PERCENT = 80;
const ERROR_PERCENT = 100;

type Json = Record<string, unknown>;

const record = (value: unknown): Json | undefined => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : undefined);
const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined);
const finite = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/** The short name of a window: `<N>h` or `<N>d` as omp names it (`5h`, `7d`); from the length of the window when its name is another word. */
export function shortWindow(windowId: string, durationMs?: number): string {
  const named = /^(\d+)\s*([hd])$/i.exec(windowId);
  if (named?.[1] !== undefined && named[2] !== undefined) return `${Number(named[1])}${named[2].toLowerCase()}`;
  if (durationMs !== undefined && durationMs > 0) {
    const hours = durationMs / 3_600_000;
    return hours >= 24 && Number.isInteger(hours / 24) ? `${hours / 24}d` : `${Math.round(hours)}h`;
  }
  return windowId;
}

interface Group {
  windowId: string;
  tier: string;
  label: string;
  durationMs?: number;
  fractions: number[];
  resets: number[];
}

/**
 * Reads `omp usage --json`. Per provider id (the `provider` of each entry of `reports`, the accounts of one provider together) it gives one window for each pair of
 * `scope.windowId` and `scope.tier`, in the order of the limits: omp's label of the first limit, the fraction used of the total of the accounts (`usedAccounts / accounts` of
 * the `capacity` entry with the same window and meter, else the mean of the accounts' own fractions) and the nearest reset. Limits with no numeric `amount.usedFraction` are
 * ignored and an entry with none gives no provider. Undefined when the text is not JSON or is not an object; a report with no provider is an empty report.
 * `now` stands for `generatedAt` when the report has none.
 */
export function parseUsageReport(output: string, now: number): UsageReport | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return undefined;
  }
  const root = record(parsed);
  if (root === undefined) return undefined;
  const capacity = record(root["capacity"]);
  const byProvider = new Map<string, Map<string, Group>>();
  const entries = Array.isArray(root["reports"]) ? root["reports"] : [];
  for (const entry of entries) {
    const providerId = text(record(entry)?.["provider"]);
    const limits = record(entry)?.["limits"];
    if (providerId === undefined || !Array.isArray(limits)) continue;
    for (const limit of limits) {
      const fraction = finite(record(record(limit)?.["amount"])?.["usedFraction"]);
      if (fraction === undefined) continue;
      const scope = record(record(limit)?.["scope"]);
      const window = record(record(limit)?.["window"]);
      const windowId = text(scope?.["windowId"]) ?? text(window?.["id"]);
      if (windowId === undefined) continue;
      const tier = text(scope?.["tier"]) ?? "";
      const key = `${windowId}\u0000${tier}`;
      const groups = byProvider.get(providerId) ?? new Map<string, Group>();
      byProvider.set(providerId, groups);
      const group: Group = groups.get(key) ?? { windowId, tier, label: text(record(limit)?.["label"]) ?? shortWindow(windowId, finite(window?.["durationMs"])), fractions: [], resets: [] };
      const durationMs = finite(window?.["durationMs"]);
      if (group.durationMs === undefined && durationMs !== undefined) group.durationMs = durationMs;
      group.fractions.push(fraction);
      const resetsAt = finite(window?.["resetsAt"]);
      if (resetsAt !== undefined) group.resets.push(resetsAt);
      groups.set(key, group);
    }
  }
  const providers: UsageProvider[] = [];
  for (const [id, groups] of byProvider) {
    const totals = Array.isArray(capacity?.[id]) ? (capacity?.[id] as unknown[]) : [];
    const windows: UsageWindow[] = [];
    for (const group of groups.values()) {
      const total = totals.map(record).find((each) => each !== undefined && text(each["window"]) === group.windowId && (text(each["meter"]) ?? "") === group.tier);
      const accounts = finite(total?.["accounts"]);
      const used = finite(total?.["usedAccounts"]);
      const mean = group.fractions.reduce((sum, value) => sum + value, 0) / group.fractions.length;
      const short = shortWindow(group.windowId, group.durationMs);
      windows.push({
        short: group.tier === "" ? short : `${short} ${group.tier.charAt(0).toUpperCase()}${group.tier.slice(1)}`,
        label: group.label,
        usedFraction: accounts !== undefined && accounts > 0 && used !== undefined ? used / accounts : mean,
        ...(group.resets.length === 0 ? {} : { resetsAt: Math.min(...group.resets) }),
      });
    }
    providers.push({ id, name: id, windows });
  }
  return { generatedAt: finite(root["generatedAt"]) ?? now, providers };
}

/** The whole percentage shown for a fraction: the fraction times 100, rounded to the nearest integer, never below 0. */
export const usagePercent = (fraction: number): number => Math.max(0, Math.round(fraction * 100));

/** The level of a shown percentage: warning from 80 % included, error from 100 % included. */
export function usageLevel(percent: number): UsageLevel {
  if (percent >= ERROR_PERCENT) return "error";
  return percent >= WARNING_PERCENT ? "warning" : "ok";
}

/** A span of time as omp writes it: `<d>d<h>h` from a day, `<h>h<m>m` from an hour, `<m>m` below; `now` when it is not positive. Minutes are cut, never below 1m. */
export function formatDuration(ms: number): string {
  if (!(ms > 0)) return "now";
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return `${hours}h${minutes % 60}m`;
  return `${minutes}m`;
}

/** `resets in <duration>` for a window that has a reset instant, undefined for one that has none. */
export const resetText = (resetsAt: number | undefined, now: number): string | undefined => (resetsAt === undefined ? undefined : `resets in ${formatDuration(resetsAt - now)}`);

/** The tooltip of a window: `<omp's label> · <N>% used · resets in <duration>`, without the last part when there is no reset instant. */
export function windowTooltip(window: UsageWindow, now: number): string {
  const reset = resetText(window.resetsAt, now);
  return [window.label, `${usagePercent(window.usedFraction)}% used`, ...(reset === undefined ? [] : [reset])].join(" · ");
}

/** `<N>% used · resets in <duration>`: a window's line in the dialog. */
export function windowDetail(window: UsageWindow, now: number): string {
  const reset = resetText(window.resetsAt, now);
  return [`${usagePercent(window.usedFraction)}% used`, ...(reset === undefined ? [] : [reset])].join(" · ");
}

/** `Fetched just now` below a minute, `Fetched <duration> ago` after. */
export function fetchedText(generatedAt: number, now: number): string {
  const age = now - generatedAt;
  return age < 60_000 ? "Fetched just now" : `Fetched ${formatDuration(age)} ago`;
}

/** The accessible name of the bar: `<provider> usage: <short> <N>%, …`. */
export const barLabel = (provider: UsageProvider): string => `${provider.name} usage: ${provider.windows.map((window) => `${window.short} ${usagePercent(window.usedFraction)}%`).join(", ")}`;

/** The tooltip of the bar. */
export const barTooltip = (provider: UsageProvider): string => `${provider.name} usage – click for every provider`;

/** The provider of a model identity: what is before its first `/`; a model with no `/`, or none, has no provider. */
export function modelProvider(model: string | undefined): string | undefined {
  if (model === undefined) return undefined;
  const slash = model.indexOf("/");
  return slash > 0 ? model.slice(0, slash) : undefined;
}
