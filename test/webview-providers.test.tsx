import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { OMP_LOGIN_PROVIDERS, providerConnected } from "../extension/src/omp-login";
import { Providers } from "../extension/src/webview/setup-shared";
import { TooltipProvider } from "../extension/src/webview/ui/tooltip";

// Radix uses browser APIs that happy-dom does not have.
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

afterEach(cleanup);

type KeyState = { saved: boolean; changes: number };

function drawWith(connected: readonly string[] | undefined, key: KeyState, loggingOut: readonly string[] = []) {
  const logins: string[] = [];
  const logouts: string[] = [];
  const keys: string[] = [];
  const element = (state: KeyState, running: readonly string[], listed: readonly string[] | undefined) => (
    <TooltipProvider>
      <Providers connected={listed} onLogin={(provider) => logins.push(provider)} onLogout={(provider) => logouts.push(provider)} loggingOut={running} apiKey={{ ...state, onSet: () => keys.push("set"), onRemove: () => keys.push("remove") }} />
    </TooltipProvider>
  );
  const view = render(element(key, loggingOut, connected));
  return {
    logins,
    logouts,
    keys,
    /** Draws again with what the host told since: the key state and, when given, the providers that are logging out and the connected ones. */
    rerender: (state: KeyState, running: readonly string[] = loggingOut, listed: readonly string[] | undefined = connected) => view.rerender(element(state, running, listed)),
    rows: within(screen.getByRole("list", { name: "Providers" })).getAllByRole("listitem"),
  };
}

function draw(connected: readonly string[] | undefined) {
  return drawWith(connected, { saved: false, changes: 0 });
}

/** The row of Cursor. */
const cursorRow = (rows: HTMLElement[]) => rows[5] as HTMLElement;

test("a provider is connected when omp's usable models include it, unknown when the list is absent", () => {
  expect(providerConnected(["anthropic"], "anthropic")).toBe(true);
  expect(providerConnected(["anthropic"], "cursor")).toBe(false);
  expect(providerConnected([], "anthropic")).toBe(false);
  expect(providerConnected(undefined, "anthropic")).toBeUndefined();
});

test("the section has its subtitle, its sentence and one row per provider of the fixed list, in order, with the name and the subscription", () => {
  const { rows } = draw([]);
  expect(screen.getByRole("heading", { level: 3, name: "Providers" })).not.toBeNull();
  expect(screen.getByText("Log in to the model providers you use with omp.")).not.toBeNull();
  expect(rows).toHaveLength(OMP_LOGIN_PROVIDERS.length);
  rows.forEach((row, index) => {
    const provider = OMP_LOGIN_PROVIDERS[index];
    expect(within(row).getByText(provider?.name ?? "")).not.toBeNull();
    expect(within(row).getByText(provider?.plan ?? "")).not.toBeNull();
  });
  expect(OMP_LOGIN_PROVIDERS.map((provider) => `${provider.name} · ${provider.plan}`)).toEqual([
    "ChatGPT · Plus/Pro (Codex)",
    "Anthropic · Claude Pro/Max",
    "GitHub Copilot · Copilot subscription",
    "Google Gemini CLI · Cloud Code Assist",
    "Google Antigravity · Gemini, Claude, GPT-OSS",
    "Cursor · Cursor subscription or API key",
    "xAI Grok · SuperGrok or X Premium+",
  ]);
});

test("a connected provider says Connected with its icon and offers Log in again; the others say Not connected and offer Log in", () => {
  const { rows, logins } = draw(["anthropic", "xai-oauth"]);
  const anthropic = rows[1] as HTMLElement;
  expect(within(anthropic).getByText("Connected")).not.toBeNull();
  expect(anthropic.querySelector("svg.lucide-circle-check")).not.toBeNull();
  expect(within(anthropic).queryByText("Not connected")).toBeNull();
  fireEvent.click(within(anthropic).getByRole("button", { name: "Log in again to Anthropic" }));
  expect(within(anthropic).getByRole("button", { name: "Log in again to Anthropic" }).textContent).toBe("Log in again");
  const chatgpt = rows[0] as HTMLElement;
  expect(within(chatgpt).getByText("Not connected")).not.toBeNull();
  expect(chatgpt.querySelector("svg.lucide-circle-check")).toBeNull();
  expect(within(chatgpt).getByRole("button", { name: "Log in to ChatGPT" }).textContent).toBe("Log in");
  fireEvent.click(within(chatgpt).getByRole("button", { name: "Log in to ChatGPT" }));
  fireEvent.click(within(rows[6] as HTMLElement).getByRole("button", { name: "Log in again to xAI Grok" }));
  expect(logins).toEqual(["anthropic", "openai-codex", "xai-oauth"]);
  expect(screen.getAllByText("Connected")).toHaveLength(2);
  expect(screen.getAllByText("Not connected")).toHaveLength(5);
});

test("with the providers unknown no row has a state, and every button says Log in", () => {
  const { rows } = draw(undefined);
  expect(screen.queryByText("Connected")).toBeNull();
  expect(screen.queryByText("Not connected")).toBeNull();
  for (const [index, row] of rows.entries()) expect(within(row).getByRole("button", { name: `Log in to ${OMP_LOGIN_PROVIDERS[index]?.name}` }).textContent).toBe("Log in");
});

test("the button of a provider shows its tooltip only at the focus, and the two Google ones add their sentence above it, linked with aria-describedby", async () => {
  const { rows } = draw([]);
  expect(screen.queryByRole("tooltip")).toBeNull();

  const anthropic = within(rows[1] as HTMLElement).getByRole("button", { name: "Log in to Anthropic" });
  expect(anthropic.getAttribute("aria-describedby")).toBeNull();
  await act(async () => anthropic.focus());
  expect((await screen.findAllByText("Open a terminal that logs omp in to Anthropic")).length).toBeGreaterThan(0);
  await act(async () => anthropic.blur());

  const gemini = within(rows[3] as HTMLElement).getByRole("button", { name: "Log in to Google Gemini CLI" });
  const sentence = "Gemini models through Google Cloud Code Assist, the Gemini CLI login.";
  expect(document.getElementById(gemini.getAttribute("aria-describedby") ?? "")?.textContent).toBe(sentence);
  const antigravity = within(rows[4] as HTMLElement).getByRole("button", { name: "Log in to Google Antigravity" });
  expect(document.getElementById(antigravity.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Gemini, Claude and GPT-OSS models through Google's Antigravity login.");
  await act(async () => gemini.focus());
  const tip = await screen.findByRole("tooltip");
  expect(tip.textContent).toBe(`${sentence}Open a terminal that logs omp in to Google Gemini CLI`);
});

test("only the Cursor row has an API key: its plan says so, and no other row has a key button or a line about it", () => {
  const { rows } = drawWith([], { saved: true, changes: 1 });
  expect(OMP_LOGIN_PROVIDERS.filter((provider) => provider.apiKey === true).map((provider) => provider.id)).toEqual(["cursor"]);
  expect(within(cursorRow(rows)).getByText("Cursor subscription or API key")).not.toBeNull();
  for (const [index, row] of rows.entries()) {
    if (index === 5) continue;
    expect(within(row).getAllByRole("button")).toHaveLength(1);
    expect(within(row).queryByText(/API key/)).toBeNull();
  }
  expect(screen.getAllByText("API key saved")).toHaveLength(1);
});

test("without a saved key the Cursor row offers Set API key after Log in, with its icon, name and no Remove and no line under the plan", () => {
  const { rows, keys } = draw(["cursor"]);
  const row = cursorRow(rows);
  const buttons = within(row).getAllByRole("button");
  expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(["Log in again to Cursor", "Log out of Cursor", "Set Cursor API key"]);
  const set = buttons[2] as HTMLElement;
  expect(set.textContent).toBe("Set API key");
  expect(set.querySelector("svg.lucide-key-round")).not.toBeNull();
  expect(set.className).toContain("border");
  expect(within(row).queryByText("API key saved")).toBeNull();
  expect(within(row).queryByRole("button", { name: "Remove Cursor API key" })).toBeNull();
  // The plan is the last line under the name: nothing is left where "API key saved" would be.
  expect(row.querySelectorAll("p")).toHaveLength(2);
  fireEvent.click(set);
  expect(keys).toEqual(["set"]);
});

test("with a saved key the row says API key saved under the plan, the button says Change API key and Remove API key follows it, without the key anywhere", () => {
  const { rows, keys } = drawWith(["cursor"], { saved: true, changes: 1 });
  const row = cursorRow(rows);
  const paragraphs = [...row.querySelectorAll("p")].map((p) => p.textContent);
  expect(paragraphs).toEqual(["Cursor", "Cursor subscription or API key", "API key saved"]);
  const buttons = within(row).getAllByRole("button");
  expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(["Log in again to Cursor", "Log out of Cursor", "Change Cursor API key", "Remove Cursor API key"]);
  expect(buttons.map((button) => button.textContent)).toEqual(["Log in again", "Log out", "Change API key", "Remove API key"]);
  expect((buttons[3] as HTMLElement).querySelector("svg.lucide-trash-2")).not.toBeNull();
  expect((buttons[3] as HTMLElement).className).toContain("hover:bg-accent");
  expect((buttons[3] as HTMLElement).className).not.toContain("border ");
  // The group wraps inside the column.
  expect(buttons[0]?.parentElement?.className).toContain("flex-wrap");
  fireEvent.click(buttons[2] as HTMLElement);
  fireEvent.click(buttons[3] as HTMLElement);
  expect(keys).toEqual(["set", "remove"]);
  // Not connected does not change with a key: the state is the one omp's models give.
  expect(within(row).queryByText("Not connected")).toBeNull();
});

test("the Connected state of Cursor does not depend on the key", () => {
  const withKey = drawWith([], { saved: true, changes: 1 });
  expect(within(cursorRow(withKey.rows)).getByText("Not connected")).not.toBeNull();
  cleanup();
  const without = draw(["cursor"]);
  expect(within(cursorRow(without.rows)).getByText("Connected")).not.toBeNull();
});

test("the tooltips of the key buttons say what they do and show only at the focus", async () => {
  const { rows } = drawWith([], { saved: true, changes: 1 });
  expect(screen.queryByRole("tooltip")).toBeNull();
  const change = within(cursorRow(rows)).getByRole("button", { name: "Change Cursor API key" });
  await act(async () => change.focus());
  expect((await screen.findAllByText("Save a Cursor API key that Trama passes to omp")).length).toBeGreaterThan(0);
  await act(async () => change.blur());
  const remove = within(cursorRow(rows)).getByRole("button", { name: "Remove Cursor API key" });
  await act(async () => remove.focus());
  expect((await screen.findAllByText("Remove the Cursor API key saved in Trama")).length).toBeGreaterThan(0);
});

test("after a save or a removal the focus returns to the key button, also when Remove goes away or a new key replaces the old, with no tooltip opening by itself", async () => {
  const { rows, rerender } = drawWith([], { saved: false, changes: 0 });
  const keyButton = () => within(cursorRow(rows)).getByRole("button", { name: /^(Set|Change) Cursor API key$/ });
  // Save: press, the host answers.
  fireEvent.click(keyButton());
  await act(async () => rerender({ saved: true, changes: 1 }));
  expect(document.activeElement).toBe(keyButton());
  expect(keyButton().getAttribute("aria-label")).toBe("Change Cursor API key");
  expect(screen.queryByRole("tooltip")).toBeNull();
  // Replace: the state stays saved, the answer still brings the focus back.
  await act(async () => (document.activeElement as HTMLElement).blur());
  fireEvent.click(keyButton());
  await act(async () => rerender({ saved: true, changes: 2 }));
  expect(document.activeElement).toBe(keyButton());
  expect(screen.queryByRole("tooltip")).toBeNull();
  // Remove: the focused button is the one that goes away; the key button takes the focus.
  const remove = within(cursorRow(rows)).getByRole("button", { name: "Remove Cursor API key" });
  await act(async () => remove.focus());
  fireEvent.click(remove);
  await act(async () => rerender({ saved: false, changes: 3 }));
  expect(document.activeElement).toBe(keyButton());
  expect(keyButton().getAttribute("aria-label")).toBe("Set Cursor API key");
  expect(screen.queryByRole("tooltip")).toBeNull();
});

test("a change that no button of this panel asked for (another window's) does not take the focus", async () => {
  const { rows, rerender } = drawWith([], { saved: false, changes: 0 });
  const login = within(cursorRow(rows)).getByRole("button", { name: "Log in to Cursor" });
  await act(async () => login.focus());
  await act(async () => rerender({ saved: true, changes: 1 }));
  expect(document.activeElement).toBe(login);
});

test("Log out appears only on the Connected rows, as a ghost button with the LogOut icon and the text Log out right after Log in again, and sends the id of its row", () => {
  const { rows, logouts, logins } = draw(["anthropic", "xai-oauth"]);
  expect(screen.getAllByRole("button", { name: /^Log out of / }).map((button) => button.getAttribute("aria-label"))).toEqual(["Log out of Anthropic", "Log out of xAI Grok"]);
  for (const index of [0, 2, 3, 4, 5]) expect(within(rows[index] as HTMLElement).queryByRole("button", { name: /^Log out of / })).toBeNull();
  const anthropic = rows[1] as HTMLElement;
  const buttons = within(anthropic).getAllByRole("button");
  expect(buttons.map((button) => button.textContent)).toEqual(["Log in again", "Log out"]);
  const logout = buttons[1] as HTMLElement;
  expect(logout.querySelector("svg.lucide-log-out")).not.toBeNull();
  expect(logout.querySelector("svg.lucide-loader")).toBeNull();
  expect(logout.className).toContain("hover:bg-accent");
  expect(logout.className).not.toContain("border ");
  expect(logout.className).toContain("h-7");
  expect(logout.getAttribute("disabled")).toBeNull();
  expect(anthropic.getAttribute("aria-busy")).toBeNull();
  fireEvent.click(logout);
  fireEvent.click(within(rows[6] as HTMLElement).getByRole("button", { name: "Log out of xAI Grok" }));
  expect(logouts).toEqual(["anthropic", "xai-oauth"]);
  expect(logins).toEqual([]);
});

test("with the providers unknown or none connected there is no Log out anywhere", () => {
  draw(undefined);
  expect(screen.queryByRole("button", { name: /^Log out of / })).toBeNull();
  cleanup();
  draw([]);
  expect(screen.queryByRole("button", { name: /^Log out of / })).toBeNull();
});

test("the Log out tooltip says what omp forgets and shows only at the focus", async () => {
  const { rows } = draw(["github-copilot"]);
  expect(screen.queryByRole("tooltip")).toBeNull();
  const logout = within(rows[2] as HTMLElement).getByRole("button", { name: "Log out of GitHub Copilot" });
  await act(async () => logout.focus());
  expect((await screen.findAllByText("Make omp forget its accounts of GitHub Copilot")).length).toBeGreaterThan(0);
});

test("while its logout runs, the row is busy, Log out shows the spinner with its text, every button of the row is disabled, and the other rows stay usable", () => {
  const { rows, logouts, logins, keys } = drawWith(["cursor", "anthropic"], { saved: true, changes: 1 }, ["cursor"]);
  const cursor = cursorRow(rows);
  expect(cursor.getAttribute("aria-busy")).toBe("true");
  const buttons = within(cursor).getAllByRole("button");
  expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(["Log in again to Cursor", "Log out of Cursor", "Change Cursor API key", "Remove Cursor API key"]);
  for (const button of buttons) {
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
  }
  expect(logouts).toEqual([]);
  expect(logins).toEqual([]);
  expect(keys).toEqual([]);
  const logout = buttons[1] as HTMLElement;
  expect(logout.textContent).toBe("Log out");
  const spinner = logout.querySelector("svg.lucide-loader");
  expect(spinner).not.toBeNull();
  expect(spinner?.getAttribute("class")).toContain("animate-spin");
  // The spinner turns also with the system's reduced motion.
  expect(spinner?.getAttribute("class")).not.toContain("motion-reduce");
  expect(logout.querySelector("svg.lucide-log-out")).toBeNull();
  // The other rows are not busy and their buttons work.
  const anthropic = rows[1] as HTMLElement;
  expect(anthropic.getAttribute("aria-busy")).toBeNull();
  for (const button of within(anthropic).getAllByRole("button")) {
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBeNull();
  }
  fireEvent.click(within(anthropic).getByRole("button", { name: "Log out of Anthropic" }));
  expect(logouts).toEqual(["anthropic"]);
});

test("when the logout ends, the focus goes back to Log in again of the same row, with no tooltip opening by itself, and the row is free again", async () => {
  const { rows, rerender } = drawWith(["anthropic"], { saved: false, changes: 0 });
  const row = rows[1] as HTMLElement;
  const logout = within(row).getByRole("button", { name: "Log out of Anthropic" });
  await act(async () => logout.focus());
  fireEvent.click(logout);
  await act(async () => rerender({ saved: false, changes: 0 }, ["anthropic"]));
  expect(row.getAttribute("aria-busy")).toBe("true");
  expect(document.activeElement).not.toBe(within(row).getByRole("button", { name: "Log in again to Anthropic" }));
  await act(async () => rerender({ saved: false, changes: 0 }, [], []));
  const login = within(row).getByRole("button", { name: "Log in to Anthropic" });
  expect(document.activeElement).toBe(login);
  expect(login.hasAttribute("disabled")).toBe(false);
  expect(row.getAttribute("aria-busy")).toBeNull();
  expect(within(row).queryByRole("button", { name: "Log out of Anthropic" })).toBeNull();
  expect(screen.queryByRole("tooltip")).toBeNull();
  // The pointer or the keyboard still show the tooltip afterwards.
  await act(async () => login.blur());
  await act(async () => login.focus());
  expect((await screen.findAllByText("Open a terminal that logs omp in to Anthropic")).length).toBeGreaterThan(0);
});

test("a logout that ends with the provider still Connected also brings the focus back to Log in again", async () => {
  const { rows, rerender } = drawWith(["xai-oauth"], { saved: false, changes: 0 }, ["xai-oauth"]);
  const row = rows[6] as HTMLElement;
  await act(async () => rerender({ saved: false, changes: 0 }, []));
  expect(document.activeElement).toBe(within(row).getByRole("button", { name: "Log in again to xAI Grok" }));
  expect(within(row).getByRole("button", { name: "Log out of xAI Grok" }).hasAttribute("disabled")).toBe(false);
});
