import { describe, expect, test } from "bun:test";
import { barLabel, barTooltip, fetchedText, formatDuration, modelProvider, parseUsageReport, resetText, shortWindow, usageLevel, usagePercent, windowDetail, windowTooltip } from "../src/core/omp-usage";

/** The output of `omp usage --json` of omp 18.12.6 for one Anthropic account, as it came: emails and ids included, to prove they do not come out. */
const claude = {
  generatedAt: 1_792_846_750_918,
  reports: [
    {
      provider: "anthropic",
      fetchedAt: 1_792_846_750_427,
      limits: [
        { id: "anthropic:5h", label: "Claude 5 Hour", scope: { provider: "anthropic", windowId: "5h", shared: true }, window: { id: "5h", label: "5 Hour", durationMs: 18_000_000, resetsAt: 1_792_856_400_331 }, amount: { used: 11, limit: 100, usedFraction: 0.11, unit: "percent" }, status: "ok" },
        { id: "anthropic:7d", label: "Claude 7 Day", scope: { provider: "anthropic", windowId: "7d", shared: true }, window: { id: "7d", label: "7 Day", durationMs: 604_800_000, resetsAt: 1_792_897_200_331 }, amount: { used: 82, limit: 100, usedFraction: 0.82, unit: "percent" }, status: "ok" },
        { id: "anthropic:7d:fable", label: "Claude 7 Day (Fable)", scope: { provider: "anthropic", windowId: "7d", tier: "fable" }, window: { id: "7d", label: "7 Day", durationMs: 604_800_000, resetsAt: 1_792_897_200_331 }, amount: { used: 2, limit: 100, usedFraction: 0.02, unit: "percent" }, status: "ok" },
      ],
      metadata: { endpoint: "https://api.anthropic.com/api/oauth/usage", accountId: "693ae3e4", email: "dev@example.com", orgId: "33a6b12d", orgName: "dev@example.com's Organization" },
      resetCredits: { availableCount: 0, redeemableCount: 0, eligible: false, reason: "not_at_wall", credits: [] },
    },
  ],
  accountsWithoutUsage: [],
  disabledCredentials: [],
  capacity: {
    anthropic: [
      { window: "5h", durationMs: 18_000_000, accounts: 1, usedAccounts: 0.11, remainingAccounts: 0.89 },
      { window: "7d", durationMs: 604_800_000, accounts: 1, usedAccounts: 0.82, remainingAccounts: 0.18 },
      { window: "7d", durationMs: 604_800_000, meter: "fable", accounts: 1, usedAccounts: 0.02, remainingAccounts: 0.98 },
    ],
  },
};

const read = (value: unknown) => parseUsageReport(JSON.stringify(value), 5);

describe("reading the report of omp", () => {
  test("one Anthropic account gives its windows in omp's order, with the tier in the short name", () => {
    expect(read(claude)).toEqual({
      generatedAt: 1_792_846_750_918,
      providers: [
        {
          id: "anthropic",
          name: "anthropic",
          windows: [
            { short: "5h", label: "Claude 5 Hour", usedFraction: 0.11, resetsAt: 1_792_856_400_331 },
            { short: "7d", label: "Claude 7 Day", usedFraction: 0.82, resetsAt: 1_792_897_200_331 },
            { short: "7d Fable", label: "Claude 7 Day (Fable)", usedFraction: 0.02, resetsAt: 1_792_897_200_331 },
          ],
        },
      ],
    });
  });

  test("no email, account identity, metadata or reset credits comes out", () => {
    const text = JSON.stringify(read(claude));
    for (const secret of ["dev@example.com", "693ae3e4", "33a6b12d", "metadata", "resetCredits", "Organization"]) expect(text).not.toContain(secret);
  });

  test("two accounts of one provider give the fraction of their total and the nearest reset", () => {
    const second = {
      provider: "anthropic",
      limits: [
        { label: "Claude 5 Hour", scope: { windowId: "5h" }, window: { durationMs: 18_000_000, resetsAt: 1_792_850_000_000 }, amount: { usedFraction: 0.5 } },
        { label: "Claude 7 Day", scope: { windowId: "7d" }, window: { durationMs: 604_800_000, resetsAt: 1_792_990_000_000 }, amount: { usedFraction: 0.1 } },
        { label: "Claude 7 Day (Fable)", scope: { windowId: "7d", tier: "fable" }, window: { durationMs: 604_800_000 }, amount: { usedFraction: 0.1 } },
      ],
    };
    const report = read({
      ...claude,
      reports: [...claude.reports, second],
      capacity: { anthropic: [{ window: "5h", accounts: 2, usedAccounts: 0.61 }, { window: "7d", accounts: 2, usedAccounts: 0.92 }, { window: "7d", meter: "fable", accounts: 2, usedAccounts: 0.12 }] },
    });
    const windows = report?.providers[0]?.windows ?? [];
    expect(report?.providers).toHaveLength(1);
    expect(windows.map((window) => [window.short, window.usedFraction])).toEqual([["5h", 0.305], ["7d", 0.46], ["7d Fable", 0.06]]);
    expect(windows.map((window) => window.resetsAt)).toEqual([1_792_850_000_000, 1_792_897_200_331, 1_792_897_200_331]);
  });

  test("a provider with no capacity takes the mean of its accounts' fractions", () => {
    const account = (fraction: number, resetsAt: number) => ({ provider: "openai", limits: [{ label: "Codex 5 Hour", scope: { windowId: "5h" }, window: { resetsAt }, amount: { usedFraction: fraction } }] });
    const report = read({ reports: [account(0.25, 300), account(0.75, 100)] });
    expect(report?.providers).toEqual([{ id: "openai", name: "openai", windows: [{ short: "5h", label: "Codex 5 Hour", usedFraction: 0.5, resetsAt: 100 }] }]);
  });

  test("providers come in omp's order and a limit with no numeric fraction is left out, with the provider if it has none", () => {
    const report = read({
      generatedAt: 9,
      reports: [
        { provider: "openai", limits: [{ label: "x", scope: { windowId: "5h" }, amount: { usedFraction: "0.4" } }] },
        { provider: "google", limits: [{ label: "G", scope: { windowId: "1d" }, window: { resetsAt: 7 }, amount: { usedFraction: 0.3 } }, { label: "no amount", scope: { windowId: "7d" } }] },
        { provider: "anthropic", limits: claude.reports[0]?.limits.slice(0, 1) },
      ],
    });
    expect(report?.providers.map((provider) => [provider.id, provider.windows.map((window) => window.short)])).toEqual([["google", ["1d"]], ["anthropic", ["5h"]]]);
  });

  test("missing fields do not break it: no reset, no label, no window length", () => {
    const report = read({ reports: [{ provider: "p", limits: [{ scope: { windowId: "weekly" }, amount: { usedFraction: 0.25 } }, { scope: { windowId: "5h" }, amount: { usedFraction: 1.2 } }] }] });
    expect(report).toEqual({
      generatedAt: 5,
      providers: [{ id: "p", name: "p", windows: [{ short: "weekly", label: "weekly", usedFraction: 0.25 }, { short: "5h", label: "5h", usedFraction: 1.2 }] }],
    });
  });

  test("a report with no provider is empty; text that is not an object is unreadable", () => {
    expect(read({ reports: [], capacity: {} })).toEqual({ generatedAt: 5, providers: [] });
    expect(read({})).toEqual({ generatedAt: 5, providers: [] });
    expect(parseUsageReport("not json", 0)).toBeUndefined();
    expect(parseUsageReport("[1]", 0)).toBeUndefined();
    expect(parseUsageReport("", 0)).toBeUndefined();
  });
});

describe("names, percentages, durations and thresholds", () => {
  test("a window is named by its hours or its days, from its id or its length", () => {
    expect(shortWindow("5h")).toBe("5h");
    expect(shortWindow("7d", 1)).toBe("7d");
    expect(shortWindow("weekly", 604_800_000)).toBe("7d");
    expect(shortWindow("session", 18_000_000)).toBe("5h");
    expect(shortWindow("odd", 90 * 60_000)).toBe("2h");
    expect(shortWindow("odd")).toBe("odd");
  });

  test("the percentage is the fraction times 100, rounded to the nearest integer, never below 0", () => {
    expect(usagePercent(0.09)).toBe(9);
    expect(usagePercent(0.094)).toBe(9);
    expect(usagePercent(0.095)).toBe(10);
    expect(usagePercent(0.999)).toBe(100);
    expect(usagePercent(-0.2)).toBe(0);
    expect(usagePercent(1.2)).toBe(120);
  });

  test("the warning starts at 80 % included and the error at 100 % included, on the shown percentage", () => {
    expect(usageLevel(usagePercent(0.794))).toBe("ok");
    expect(usageLevel(usagePercent(0.795))).toBe("warning");
    expect(usageLevel(80)).toBe("warning");
    expect(usageLevel(usagePercent(0.994))).toBe("warning");
    expect(usageLevel(usagePercent(0.996))).toBe("error");
    expect(usageLevel(100)).toBe("error");
    expect(usageLevel(0)).toBe("ok");
  });

  test("a duration is written as omp writes it, and `now` once the reset has passed", () => {
    const minutes = (value: number) => value * 60_000;
    expect(formatDuration(minutes(168))).toBe("2h48m");
    expect(formatDuration(minutes(14 * 60 + 8))).toBe("14h8m");
    expect(formatDuration(minutes(3 * 1440 + 2 * 60))).toBe("3d2h");
    expect(formatDuration(minutes(45))).toBe("45m");
    expect(formatDuration(minutes(60))).toBe("1h0m");
    expect(formatDuration(minutes(1440))).toBe("1d0h");
    expect(formatDuration(minutes(2) + 59_000)).toBe("2m");
    expect(formatDuration(30_000)).toBe("1m");
    expect(formatDuration(0)).toBe("now");
    expect(formatDuration(-5)).toBe("now");
  });

  test("the reset text, the tooltip and the dialog line say the same, with no reset part without a reset instant", () => {
    const window = { short: "5h", label: "Claude 5 Hour", usedFraction: 0.09, resetsAt: 1_000_000 + 168 * 60_000 };
    expect(resetText(window.resetsAt, 1_000_000)).toBe("resets in 2h48m");
    expect(resetText(undefined, 1)).toBeUndefined();
    expect(windowTooltip(window, 1_000_000)).toBe("Claude 5 Hour · 9% used · resets in 2h48m");
    expect(windowDetail(window, 1_000_000)).toBe("9% used · resets in 2h48m");
    expect(windowTooltip({ ...window, resetsAt: 999 }, 1_000_000)).toBe("Claude 5 Hour · 9% used · resets in now");
    const none = { short: "5h", label: "Claude 5 Hour", usedFraction: 0.09 };
    expect(windowTooltip(none, 1)).toBe("Claude 5 Hour · 9% used");
    expect(windowDetail(none, 1)).toBe("9% used");
  });

  test("Fetched says just now under a minute and the duration after", () => {
    expect(fetchedText(1000, 1000)).toBe("Fetched just now");
    expect(fetchedText(1000, 1000 + 59_999)).toBe("Fetched just now");
    expect(fetchedText(1000, 1000 - 5)).toBe("Fetched just now");
    expect(fetchedText(0, 5 * 60_000)).toBe("Fetched 5m ago");
    expect(fetchedText(0, 125 * 60_000)).toBe("Fetched 2h5m ago");
  });

  test("the bar's accessible name and tooltip name the provider", () => {
    const provider = read(claude)?.providers[0];
    if (provider === undefined) throw new Error("no provider");
    expect(barLabel(provider)).toBe("anthropic usage: 5h 11%, 7d 82%, 7d Fable 2%");
    expect(barTooltip(provider)).toBe("anthropic usage – click for every provider");
  });

  test("the provider of a model is what comes before its first slash", () => {
    expect(modelProvider("anthropic/claude-opus-5-5")).toBe("anthropic");
    expect(modelProvider("openrouter/anthropic/claude-x")).toBe("openrouter");
    expect(modelProvider("claude")).toBeUndefined();
    expect(modelProvider("/odd")).toBeUndefined();
    expect(modelProvider(undefined)).toBeUndefined();
  });
});
