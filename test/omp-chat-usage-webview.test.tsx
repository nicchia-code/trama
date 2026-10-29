import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { GENERAL_ID } from "../src/core/omp-chat-view";
import type { UsageReport } from "../src/core/omp-usage";
import type { ToChatHost, ToChatWebview } from "../extension/src/omp-chat-protocol";
import { ChatApp, createChatController } from "../extension/src/webview/omp-chat/app";
import { createChatStore } from "../extension/src/webview/omp-chat/state";
import { panelId } from "../extension/src/webview/omp-chat/tabs";

afterEach(cleanup);

function setup() {
  const store = createChatStore();
  const posted: ToChatHost[] = [];
  const controller = createChatController(store, (message) => void posted.push(message), () => 1000);
  render(<ChatApp store={store} controller={controller} />);
  const host = (message: ToChatWebview) => act(() => controller.receive(message));
  return { posted, host };
}

const MINUTE = 60_000;
const general = { id: GENERAL_ID, name: "General", state: "idle" as const, general: true as const };
const models = (current: string): ToChatWebview => ({ type: "models", id: GENERAL_ID, available: [{ id: current, name: current }], current });

/** A report made now, so the durations the webview computes from the clock are known: the resets are a little over a whole number of minutes away. */
function report(overrides: { five?: number; seven?: number } = {}): UsageReport {
  const now = Date.now();
  return {
    generatedAt: now,
    providers: [
      {
        id: "anthropic",
        name: "anthropic",
        windows: [
          { short: "5h", label: "Claude 5 Hour", usedFraction: overrides.five ?? 0.09, resetsAt: now + 168 * MINUTE + 30_000 },
          { short: "7d", label: "Claude 7 Day", usedFraction: overrides.seven ?? 0.5, resetsAt: now + (3 * 1440 + 120) * MINUTE + 30_000 },
          { short: "7d Fable", label: "Claude 7 Day (Fable)", usedFraction: 0.02 },
        ],
      },
      { id: "openai", name: "openai", windows: [{ short: "5h", label: "Codex 5 Hour", usedFraction: 0.4, resetsAt: now + 45 * MINUTE + 30_000 }] },
    ],
  };
}

const bar = () => document.querySelector("[data-usage-bar]");

function showGeneral(host: (message: ToChatWebview) => void, model = "anthropic/claude-opus-5-5") {
  host({ type: "conversations", items: [general], selected: GENERAL_ID });
  host(models(model));
}

test("with no report there is no bar, no message and no empty space; a report with no provider is the same", () => {
  const { host } = setup();
  showGeneral(host);
  expect(bar()).toBeNull();
  host({ type: "usage", fetching: true });
  expect(bar()).toBeNull();
  host({ type: "usage", fetching: false, error: "omp exited with code 3" });
  expect(bar()).toBeNull();
  expect(screen.queryByText(/Could not refresh/)).toBeNull();
  host({ type: "usage", fetching: false, report: { generatedAt: Date.now(), providers: [] } });
  expect(bar()).toBeNull();
});

test("the bar has an entry for each window of the provider of the model: ring, short name and whole percentage, one button for the lot", () => {
  const { host } = setup();
  showGeneral(host);
  host({ type: "usage", fetching: false, report: report() });
  const button = screen.getByRole("button", { name: "anthropic usage: 5h 9%, 7d 50%, 7d Fable 2%" });
  expect(bar()?.contains(button)).toBe(true);
  const entries = [...button.querySelectorAll("[data-usage-entry]")];
  expect(entries.map((entry) => entry.textContent)).toEqual(["5h9%", "7d50%", "7d Fable2%"]);
  for (const entry of entries) expect(entry.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  expect(entries[0]?.querySelector("svg")?.getAttribute("width")).toBe("14");
  expect(screen.queryByText("openai")).toBeNull();
  expect(screen.queryByRole("button", { name: "Usage" })).toBeNull();
});

test("the bar sits in the row of the model selector of every conversation, right of it and under the message field, with no border, each with the provider of its own model", () => {
  const { host } = setup();
  const job = { id: "job", name: "T3", state: "idle" as const };
  const ask = { id: "ask", name: "Ask more", state: "idle" as const, placeholder: "Ask omp more" };
  host({ type: "conversations", items: [general, job, ask], selected: GENERAL_ID });
  host(models("anthropic/claude-opus-5-5"));
  host({ type: "models", id: "job", available: [{ id: "openai/gpt-5", name: "x" }], current: "openai/gpt-5" });
  host({ type: "models", id: "ask", available: [{ id: "google/gemini-3", name: "y" }], current: "google/gemini-3" });
  const base = report();
  host({ type: "usage", fetching: false, report: { ...base, providers: [...base.providers, { id: "google", name: "google", windows: [{ short: "1d", label: "Gemini 1 Day", usedFraction: 0.3 }] }] } });
  const items = [general, job, ask];
  const expected: [string, string][] = [
    [GENERAL_ID, "anthropic usage: 5h 9%, 7d 50%, 7d Fable 2%"],
    ["job", "openai usage: 5h 40%"],
    ["ask", "google usage: 1d 30%"],
  ];
  for (const [id, name] of expected) {
    // A conversation of a hidden tab draws what changed when its tab is shown.
    host({ type: "conversations", items, selected: id });
    const panel = document.getElementById(panelId(id)) as HTMLElement;
    const own = panel.querySelector("[data-usage-bar]");
    expect(own).not.toBeNull();
    expect(panel.querySelectorAll("[data-usage-bar]")).toHaveLength(1);
    expect(within(panel).getByRole("button", { name, hidden: true })).not.toBeNull();
    expect(panel.firstElementChild?.hasAttribute("data-usage-bar")).toBe(false);
    const selector = within(panel).getByRole("combobox", { name: "Model", hidden: true });
    const field = within(panel).getByRole("textbox", { name: "Message omp", hidden: true });
    expect(selector.parentElement?.contains(own)).toBe(true);
    expect(own?.previousElementSibling).toBe(selector);
    expect(selector.className).toContain("shrink-0");
    expect(field.compareDocumentPosition(selector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(own?.className).not.toMatch(/\bborder|\bp[xy]?-\d/);
  }
});

test("a conversation whose model has not been reported yet shows the bar of the model it started with", () => {
  const { host } = setup();
  host({ type: "conversations", items: [{ id: "job", name: "T3", state: "idle", model: "openai/gpt-5" }], selected: "job" });
  host({ type: "usage", fetching: false, report: report() });
  expect(screen.getByRole("button", { name: "openai usage: 5h 40%" })).not.toBeNull();
});

test("changing the model of one conversation changes only its bar", () => {
  const { host } = setup();
  host({ type: "conversations", items: [general, { id: "job", name: "T3", state: "idle" }], selected: GENERAL_ID });
  host(models("anthropic/claude-opus-5-5"));
  host({ type: "models", id: "job", available: [{ id: "anthropic/claude-opus-5-5", name: "x" }], current: "anthropic/claude-opus-5-5" });
  host({ type: "usage", fetching: false, report: report() });
  const barOf = (id: string) => {
    // A conversation of a hidden tab draws what changed when its tab is shown.
    host({ type: "conversations", items: [general, { id: "job", name: "T3", state: "idle" }], selected: id });
    return document.getElementById(panelId(id))?.querySelector("[data-usage-bar]")?.textContent;
  };
  expect(barOf("job")).toBe("5h9%7d50%7d Fable2%");
  host({ type: "models", id: "job", available: [{ id: "openai/gpt-5", name: "x" }], current: "openai/gpt-5" });
  expect(barOf("job")).toBe("5h40%");
  expect(barOf(GENERAL_ID)).toBe("5h9%7d50%7d Fable2%");
});

test("ring and percentage are secondary below 80 %, warning from 80 % and error at 100 %, on the shown percentage", () => {
  const { host } = setup();
  showGeneral(host);
  const colour = (index: number) => {
    const entry = document.querySelectorAll("[data-usage-entry]")[index];
    return [entry?.querySelector("svg")?.getAttribute("class"), entry?.lastElementChild?.getAttribute("class")];
  };
  host({ type: "usage", fetching: false, report: report({ five: 0.79, seven: 0.795 }) });
  expect(colour(0)).toEqual([expect.stringContaining("text-muted-foreground"), expect.stringContaining("text-muted-foreground")]);
  expect(screen.getByRole("button", { name: /7d 80%/ })).not.toBeNull();
  expect(colour(1)).toEqual([expect.stringContaining("text-amber-500"), expect.stringContaining("text-amber-500")]);
  host({ type: "usage", fetching: false, report: report({ five: 0.996, seven: 1.3 }) });
  expect(colour(0)).toEqual([expect.stringContaining("text-destructive"), expect.stringContaining("text-destructive")]);
  expect(colour(1)).toEqual([expect.stringContaining("text-destructive"), expect.stringContaining("text-destructive")]);
});

test("changing the model changes the bar at once, with the last report and no new request", () => {
  const { host, posted } = setup();
  showGeneral(host);
  host({ type: "usage", fetching: false, report: report() });
  host(models("openai/gpt-5"));
  expect(screen.getByRole("button", { name: "openai usage: 5h 40%" })).not.toBeNull();
  expect(screen.queryByRole("button", { name: /anthropic usage/ })).toBeNull();
  host(models("anthropic/claude-opus-5-5"));
  expect(screen.getByRole("button", { name: /^anthropic usage/ })).not.toBeNull();
  expect(posted.filter((message) => message.type === "refreshUsage")).toEqual([]);
});

test("the tooltips say the click opens every provider, and, over an entry, its omp label, percentage and reset", async () => {
  const { host } = setup();
  showGeneral(host);
  host({ type: "usage", fetching: false, report: report() });
  const button = screen.getByRole("button", { name: /^anthropic usage/ });
  await act(async () => void fireEvent.focus(button));
  expect(screen.getAllByText("anthropic usage – click for every provider").length).toBeGreaterThan(0);
  const entries = document.querySelectorAll("[data-usage-entry]");
  await act(async () => void fireEvent.pointerEnter(entries[0] as Element));
  expect(screen.getAllByText("Claude 5 Hour · 9% used · resets in 2h48m").length).toBeGreaterThan(0);
  await act(async () => void fireEvent.pointerLeave(entries[0] as Element));
  await act(async () => void fireEvent.pointerEnter(entries[1] as Element));
  expect(screen.getAllByText("Claude 7 Day · 50% used · resets in 3d2h").length).toBeGreaterThan(0);
  await act(async () => void fireEvent.pointerLeave(entries[1] as Element));
  await act(async () => void fireEvent.pointerEnter(entries[2] as Element));
  expect(screen.getAllByText("Claude 7 Day (Fable) · 2% used").length).toBeGreaterThan(0);
});

test("a model whose provider has no data leaves only a compact Usage button with the Gauge icon", () => {
  const { host } = setup();
  showGeneral(host, "google/gemini-3");
  host({ type: "usage", fetching: false, report: report() });
  const button = screen.getByRole("button", { name: "Usage" });
  expect(bar()?.contains(button)).toBe(true);
  expect(bar()?.previousElementSibling).toBe(screen.getByRole("combobox", { name: "Model" }));
  expect(button.querySelector("svg")?.getAttribute("class")).toContain("lucide-gauge");
  expect(document.querySelectorAll("[data-usage-entry]")).toHaveLength(0);
  host(models("noprovider"));
  expect(screen.getByRole("button", { name: "Usage" })).not.toBeNull();
});

test("a click on the bar opens the dialog, asks the host for the usage again and shows every provider with the last report meanwhile", () => {
  const { host, posted } = setup();
  showGeneral(host);
  host({ type: "usage", fetching: false, report: report() });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^anthropic usage/ }));
  expect(posted.filter((message) => message.type === "refreshUsage")).toHaveLength(1);
  const dialog = screen.getByRole("dialog", { name: "Usage" });
  expect(within(dialog).getByText("Fetched just now")).not.toBeNull();
  expect(within(dialog).getByRole("heading", { name: "anthropic" })).not.toBeNull();
  expect(within(dialog).getByRole("heading", { name: "openai" })).not.toBeNull();
  expect(within(dialog).getByText("9% used · resets in 2h48m")).not.toBeNull();
  expect(within(dialog).getByText("50% used · resets in 3d2h")).not.toBeNull();
  expect(within(dialog).getByText("2% used")).not.toBeNull();
  expect(within(dialog).getByText("40% used · resets in 45m")).not.toBeNull();
  expect(within(dialog).getByText("7d Fable")).not.toBeNull();
  expect(within(dialog).queryByLabelText("Fetching usage")).toBeNull();
  host({ type: "usage", fetching: true, report: report() });
  const loader = within(screen.getByRole("dialog", { name: "Usage" })).getByLabelText("Fetching usage");
  expect(loader.getAttribute("class")).toContain("animate-spin");
  expect(loader.getAttribute("class")).toContain("motion-reduce:animate-none");
  fireEvent.keyDown(screen.getByRole("dialog", { name: "Usage" }), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("the Usage button opens the same dialog, and the colours of the bar hold in it", () => {
  const { host, posted } = setup();
  showGeneral(host, "google/gemini-3");
  host({ type: "usage", fetching: false, report: report({ five: 0.85, seven: 1 }) });
  fireEvent.click(screen.getByRole("button", { name: "Usage" }));
  expect(posted.at(-1)).toEqual({ type: "refreshUsage" });
  const dialog = screen.getByRole("dialog", { name: "Usage" });
  expect(within(dialog).getByText("85% used · resets in 2h48m").getAttribute("class")).toContain("text-amber-500");
  expect(within(dialog).getByText("100% used · resets in 3d2h").getAttribute("class")).toContain("text-destructive");
  expect(within(dialog).getByText("40% used · resets in 45m").getAttribute("class")).toContain("text-muted-foreground");
});

test("a failed refresh leaves the last report and says why under the title", () => {
  const { host } = setup();
  showGeneral(host);
  host({ type: "usage", fetching: false, report: report() });
  fireEvent.click(screen.getByRole("button", { name: /^anthropic usage/ }));
  host({ type: "usage", fetching: false, report: report(), error: "omp did not answer within 30 s" });
  const dialog = screen.getByRole("dialog", { name: "Usage" });
  expect(within(dialog).getByText("Could not refresh: omp did not answer within 30 s.")).not.toBeNull();
  expect(within(dialog).getByText("9% used · resets in 2h48m")).not.toBeNull();
  host({ type: "usage", fetching: false, report: report() });
  expect(within(screen.getByRole("dialog", { name: "Usage" })).queryByText(/Could not refresh/)).toBeNull();
});

test("a report older than a minute says how long ago, and an empty report closes the dialog and takes the bar away", () => {
  const { host } = setup();
  showGeneral(host);
  host({ type: "usage", fetching: false, report: { ...report(), generatedAt: Date.now() - (125 * MINUTE + 5000) } });
  fireEvent.click(screen.getByRole("button", { name: /^anthropic usage/ }));
  expect(within(screen.getByRole("dialog", { name: "Usage" })).getByText("Fetched 2h5m ago")).not.toBeNull();
  host({ type: "usage", fetching: false, report: { generatedAt: Date.now(), providers: [] } });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(bar()).toBeNull();
});

test("the ring is filled to the used fraction", () => {
  const { host } = setup();
  showGeneral(host);
  host({ type: "usage", fetching: false, report: report() });
  const circles = document.querySelector("[data-usage-entry]")?.querySelectorAll("circle");
  const dashed = circles?.[1]?.getAttribute("stroke-dasharray")?.split(" ").map(Number) ?? [];
  expect((dashed[0] ?? 0) / (dashed[1] ?? 1)).toBeCloseTo(0.09, 5);
});
