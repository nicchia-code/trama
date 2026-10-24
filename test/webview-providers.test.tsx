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

function draw(connected: readonly string[] | undefined) {
  const logins: string[] = [];
  render(
    <TooltipProvider>
      <Providers connected={connected} onLogin={(provider) => logins.push(provider)} />
    </TooltipProvider>,
  );
  return { logins, rows: within(screen.getByRole("list", { name: "Providers" })).getAllByRole("listitem") };
}

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
    "Cursor · Cursor subscription",
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
