import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ManifestPackage, type SettingsValues, settingsSchema } from "../extension/src/host/settings-schema";
import type { ToHost } from "../extension/src/protocol";
import { mountSettings } from "../extension/src/webview/settings";
import { testNotificationBlock, testNotificationLine } from "../extension/src/webview/settings/logic";
import { startTheme } from "../extension/src/webview/theme";

const manifest: ManifestPackage = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
const schema = settingsSchema(manifest);

// Radix and cmdk use browser APIs that happy-dom does not have.
beforeAll(() => {
  const proto = globalThis.Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
  (globalThis as unknown as Record<string, unknown>).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  document.body.className = "";
  document.documentElement.className = "";
});

/** The Settings tab with the values the user settings hold, and what the host says of the token and the test. */
function mounted(values: Record<string, SettingsValues> = {}) {
  const posted: ToHost[] = [];
  const page = render(<></>);
  const view = mountSettings((node) => page.rerender(<>{node}</>), { post: (m) => posted.push(m), navigate: () => {}, openLink: () => {} }, startTheme());
  act(() => view.receive({ type: "settings", schema, values }));
  const token = (saved: boolean) => act(() => view.receiveNtfyToken({ type: "ntfyToken", saved }));
  const test = (message: { state: "sending" | "sent" | "failed"; reason?: string }) => act(() => view.receiveTestNotification({ type: "testNotification", ...message }));
  return { posted, view, token, test, settings: (next: Record<string, SettingsValues>) => act(() => view.receive({ type: "settings", schema, values: next })) };
}

const TOPIC: Record<string, SettingsValues> = { "trama.ntfyTopic": { user: "my-topic" } };
const notifications = () => document.querySelector('section[aria-label="Notifications"]') as HTMLElement;
const sendButton = () => within(notifications()).getByRole("button", { name: "Send test notification" });

test("the Notifications subgroup is the last of Advanced, with ntfy Server and ntfy Topic as text fields and their descriptions", () => {
  mounted();
  const advanced = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent === "Advanced")?.closest("section") as HTMLElement;
  expect(Array.from(advanced.querySelectorAll("h3")).map((h) => h.textContent).at(-1)).toBe("Notifications");
  const group = within(notifications());
  const server = group.getByRole("textbox", { name: "ntfy Server" });
  const topic = group.getByRole("textbox", { name: "ntfy Topic" });
  expect(server.getAttribute("type")).toBe("text");
  expect(topic.getAttribute("type")).toBe("text");
  expect(group.getByText("Server that receives Trama's notifications. The default is the public ntfy.sh.")).not.toBeNull();
  expect(group.getByText("Topic for a notification when omp Chat jobs finish or wait for you. Empty (the default) sends nothing; on ntfy.sh anyone who knows it can read them.")).not.toBeNull();
  expect((server as HTMLInputElement).placeholder).toBe("https://ntfy.sh");
  expect((topic as HTMLInputElement).value).toBe("");
});

test("a valid value is saved when the developer confirms it; an invalid one is not sent and the field says why", () => {
  const { posted } = mounted();
  const group = within(notifications());
  const topic = group.getByRole("textbox", { name: "ntfy Topic" });
  fireEvent.change(topic, { target: { value: "bad topic" } });
  fireEvent.blur(topic);
  expect(group.getByText("Use 1 to 64 letters, digits, - or _.")).not.toBeNull();
  expect(topic.getAttribute("aria-describedby")).toContain("st-trama-ntfyTopic-error");
  expect(posted.filter((m) => m.type === "setSetting")).toEqual([]);
  fireEvent.change(topic, { target: { value: "good-topic" } });
  expect(group.queryByText("Use 1 to 64 letters, digits, - or _.")).toBeNull();
  fireEvent.keyDown(topic, { key: "Enter" });
  expect(posted.filter((m) => m.type === "setSetting")).toEqual([{ type: "setSetting", key: "trama.ntfyTopic", value: "good-topic" }]);

  const server = group.getByRole("textbox", { name: "ntfy Server" });
  for (const bad of ["ntfy.sh", "ftp://ntfy.sh", "https://me:secret@ntfy.sh", "https://ntfy.sh?x=1"]) {
    fireEvent.change(server, { target: { value: bad } });
    fireEvent.blur(server);
    expect(group.getByText("Enter an http or https address without user name or password.")).not.toBeNull();
  }
  expect(posted.filter((m) => m.type === "setSetting")).toHaveLength(1);
  fireEvent.change(server, { target: { value: "https://ntfy.example.org" } });
  fireEvent.blur(server);
  expect(posted.filter((m) => m.type === "setSetting").at(-1)).toEqual({ type: "setSetting", key: "trama.ntfyServer", value: "https://ntfy.example.org" });
});

test("without a token the line is not there and the button says Set access token; with one, Access token saved, Change access token and Remove access token", () => {
  const { token } = mounted();
  const group = within(notifications());
  expect(group.queryByText("Access token saved")).toBeNull();
  expect(group.getByRole("button", { name: "Set ntfy access token" }).textContent).toBe("Set access token");
  expect(group.queryByRole("button", { name: "Remove ntfy access token" })).toBeNull();
  token(true);
  expect(group.getByText("Access token saved")).not.toBeNull();
  expect(group.getByRole("button", { name: "Change ntfy access token" }).textContent).toBe("Change access token");
  expect(group.getByRole("button", { name: "Remove ntfy access token" }).textContent).toBe("Remove access token");
  token(false);
  expect(group.queryByText("Access token saved")).toBeNull();
  expect(group.queryByRole("button", { name: "Remove ntfy access token" })).toBeNull();
});

test("Set, Change and Remove send setNtfyToken and removeNtfyToken with no field, ask no confirmation and the token is in no message", () => {
  const { posted, token } = mounted();
  const group = within(notifications());
  fireEvent.click(group.getByRole("button", { name: "Set ntfy access token" }));
  token(true);
  fireEvent.click(group.getByRole("button", { name: "Change ntfy access token" }));
  fireEvent.click(group.getByRole("button", { name: "Remove ntfy access token" }));
  expect(posted.filter((m) => m.type === "setNtfyToken" || m.type === "removeNtfyToken")).toEqual([{ type: "setNtfyToken" }, { type: "setNtfyToken" }, { type: "removeNtfyToken" }]);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

test("the focus returns to the token button after the host answers, with no tooltip", async () => {
  const { token } = mounted();
  const group = within(notifications());
  fireEvent.click(group.getByRole("button", { name: "Set ntfy access token" }));
  token(true);
  await act(async () => undefined);
  expect(document.activeElement).toBe(group.getByRole("button", { name: "Change ntfy access token" }));
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.click(group.getByRole("button", { name: "Remove ntfy access token" }));
  token(false);
  await act(async () => undefined);
  expect(document.activeElement).toBe(group.getByRole("button", { name: "Set ntfy access token" }));
});

test("Send test notification is on its own row after the token buttons, and unavailable with the reason in its description: an empty topic, then an invalid value", () => {
  const { settings } = mounted();
  const button = sendButton();
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(button.getAttribute("aria-disabled")).toBe("true");
  const reason = () => document.getElementById(button.getAttribute("aria-describedby") ?? "")?.textContent;
  expect(reason()).toBe("Set an ntfy topic first.");
  // The button follows the token buttons in the DOM, and shares no row with them.
  const tokenButton = within(notifications()).getByRole("button", { name: "Set ntfy access token" });
  expect(tokenButton.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(button.parentElement?.contains(tokenButton)).toBe(false);
  settings({ "trama.ntfyTopic": { user: "bad topic" } });
  expect(reason()).toBe("Fix the ntfy server or topic first.");
  settings({ "trama.ntfyTopic": { user: "my-topic" }, "trama.ntfyServer": { user: "ftp://nope" } });
  expect(reason()).toBe("Fix the ntfy server or topic first.");
  settings(TOPIC);
  expect((sendButton() as HTMLButtonElement).disabled).toBe(false);
  expect(sendButton().getAttribute("aria-describedby")).toBeNull();
});

test("an unavailable Send test notification shows its reason as a tooltip on the keyboard focus", async () => {
  mounted();
  const wrapper = sendButton().closest("span") as HTMLElement;
  expect(wrapper.tabIndex).toBe(0);
  await act(async () => wrapper.focus());
  expect((await screen.findAllByText("Set an ntfy topic first.")).length).toBeGreaterThan(0);
});

test("pressing Send test notification sends sendTestNotification; while it is sent the icon is a spinning Loader and the button is unavailable", () => {
  const { posted, test } = mounted(TOPIC);
  fireEvent.click(sendButton());
  expect(posted.filter((m) => m.type === "sendTestNotification")).toEqual([{ type: "sendTestNotification" }]);
  test({ state: "sending" });
  const button = sendButton() as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(button.querySelector("svg.animate-spin")).not.toBeNull();
  fireEvent.click(button);
  expect(posted.filter((m) => m.type === "sendTestNotification")).toHaveLength(1);
  test({ state: "sent" });
  expect((sendButton() as HTMLButtonElement).disabled).toBe(false);
  expect(sendButton().querySelector("svg.animate-spin")).toBeNull();
});

test("the outcome is a polite live region under the button: sent in secondary text, not sent with its reason in the error colour, until the next test", () => {
  const { test } = mounted(TOPIC);
  const live = () => notifications().querySelector('[aria-live="polite"]') as HTMLElement;
  expect(live().textContent).toBe("");
  test({ state: "sending" });
  expect(live().textContent).toBe("");
  test({ state: "sent" });
  expect(live().textContent).toBe("Test notification sent.");
  expect(within(live()).getByText("Test notification sent.").className).toContain("text-muted-foreground");
  test({ state: "failed", reason: "HTTP 401" });
  expect(live().textContent).toBe("Test notification not sent: HTTP 401.");
  expect(within(live()).getByText("Test notification not sent: HTTP 401.").className).toContain("text-destructive");
  test({ state: "failed", reason: "no response within 10 seconds" });
  expect(live().textContent).toBe("Test notification not sent: no response within 10 seconds.");
  test({ state: "sending" });
  expect(live().textContent).toBe("");
});

test("the unavailability of the test and its line are decided by pure functions of the saved settings and the host's message", () => {
  expect(testNotificationBlock({})).toBe("Set an ntfy topic first.");
  expect(testNotificationBlock({ "trama.ntfyTopic": { user: "  " } })).toBe("Set an ntfy topic first.");
  expect(testNotificationBlock({ "trama.ntfyTopic": { user: "a b" } })).toBe("Fix the ntfy server or topic first.");
  expect(testNotificationBlock({ "trama.ntfyTopic": { user: "ab" }, "trama.ntfyServer": { user: "http://x?y" } })).toBe("Fix the ntfy server or topic first.");
  expect(testNotificationBlock({ "trama.ntfyTopic": { user: "ab" } })).toBeNull();
  expect(testNotificationBlock({ "trama.ntfyTopic": { user: "ab" }, "trama.ntfyServer": { user: "https://ntfy.example.org" } })).toBeNull();
  expect(testNotificationLine(null)).toBeNull();
  expect(testNotificationLine({ state: "sending" })).toBeNull();
  expect(testNotificationLine({ state: "sent" })).toEqual({ tone: "sent", text: "Test notification sent." });
  expect(testNotificationLine({ state: "failed", reason: "the server redirected the request" })).toEqual({ tone: "failed", text: "Test notification not sent: the server redirected the request." });
});
