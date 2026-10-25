import type { ReactNode } from "react";
import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createShellStore, Shell } from "../extension/src/webview/shell";
import type { ViewName } from "../extension/src/protocol";

afterEach(cleanup);

function setup(initial: Partial<Parameters<typeof createShellStore>[0]> = {}) {
  const views = {} as Record<ViewName, ReactNode>;
  for (const name of ["getstarted", "diagram", "board", "requirements", "specs", "history", "team", "settings"] as const) views[name] = <p data-view={name}>{`view ${name}`}</p>;
  const store = createShellStore({ view: "board", hasProject: true, error: null, diagnostics: [], views, questions: null, githubRepo: null, teamAvailable: false, ...initial });
  const opened: string[] = [];
  const utils = render(<Shell store={store} openModelFile={(path) => opened.push(path)} />);
  return { store, opened, ...utils };
}

const shown = () => [...document.querySelectorAll("[data-view-name]:not([hidden])")].map((node) => node.getAttribute("data-view-name"));
const mountedViews = () => [...document.querySelectorAll("[data-view-name]")].map((node) => node.getAttribute("data-view-name"));

test("the panel has no tab bar, no Settings wheel and no number on the Board", () => {
  setup();
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.queryByRole("tablist")).toBeNull();
  expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
  expect(document.querySelector("[data-badge]")).toBeNull();
});

test("with a project every view but Get Started is mounted; without one only Get Started and Settings", () => {
  const { unmount } = setup();
  expect(mountedViews()).toEqual(["board", "diagram", "requirements", "specs", "history", "settings"]);
  unmount();
  setup({ hasProject: false, view: "getstarted" });
  expect(mountedViews()).toEqual(["getstarted", "settings"]);
});

test("Team is mounted, after History and before Settings, only while it is available", () => {
  const { unmount } = setup({ teamAvailable: true });
  expect(mountedViews()).toEqual(["board", "diagram", "requirements", "specs", "history", "team", "settings"]);
  unmount();
  setup({ teamAvailable: false });
  expect(mountedViews()).not.toContain("team");
  cleanup();
  setup({ hasProject: false, view: "getstarted", teamAvailable: true });
  expect(mountedViews()).toEqual(["getstarted", "settings"]);
});

test("when Team stops being available it goes away and the view shown is the one the host navigates to", () => {
  const { store } = setup({ teamAvailable: true, view: "team" });
  expect(shown()).toEqual(["team"]);
  act(() => store.set({ teamAvailable: false, view: "board" }));
  expect(mountedViews()).not.toContain("team");
  expect(shown()).toEqual(["board"]);
});

test("every view stays mounted with what it drew, and only the current one shows", () => {
  const { store } = setup();
  for (const name of ["board", "diagram", "requirements", "specs", "history", "settings"] as const) expect(document.querySelector(`[data-view="${name}"]`)?.isConnected).toBe(true);
  expect(shown()).toEqual(["board"]);
  act(() => store.set({ view: "history" }));
  expect(shown()).toEqual(["history"]);
  expect(document.querySelector('[data-view="board"]')?.isConnected).toBe(true);
});

test("a view that draws again changes in place", () => {
  const { store } = setup();
  act(() => store.set({ views: { ...store.get().views, diagram: <p data-view="diagram">drawn again</p> } }));
  expect(screen.getByText("drawn again")).not.toBeNull();
});

test("an error shows and can be dismissed; a Model error opens its file", () => {
  const { store, opened } = setup({ error: "Boom", diagnostics: [{ file: "model/a.md", line: 4, message: "bad", severity: "error" } as never] });
  expect(screen.getByRole("alert").textContent).toContain("Boom");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(store.get().error).toBeNull();
  expect(screen.getByText(/1 validation error:/)).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "model/a.md:4" }));
  expect(opened).toEqual(["model/a.md"]);
});
