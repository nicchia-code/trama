import type { ReactNode } from "react";
import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createShellStore, Shell } from "../extension/src/webview/shell";
import type { ViewName } from "../extension/src/protocol";

afterEach(cleanup);

function setup(initial: Partial<Parameters<typeof createShellStore>[0]> = {}) {
  const views = {} as Record<ViewName, ReactNode>;
  for (const name of ["getstarted", "diagram", "board", "requirements", "specs", "settings"] as const) views[name] = <p data-view={name}>{`view ${name}`}</p>;
  const store = createShellStore({ view: "diagram", hasProject: true, decisions: 0, error: null, diagnostics: [], views, questions: null, ...initial });
  const visited: string[] = [];
  const opened: string[] = [];
  const utils = render(<Shell store={store} navigate={(view) => { visited.push(view); store.set({ view }); }} openModelFile={(path) => opened.push(path)} />);
  return { store, visited, opened, ...utils };
}

test("with a project the tabs are every one but Get Started, and Settings is an icon-only tab", () => {
  setup();
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Board", "Diagram", "Requirements", "Specs", ""]);
  const settings = screen.getByRole("tab", { name: "Settings" });
  expect(settings.textContent).toBe("");
  expect(settings.querySelector("svg")).not.toBeNull();
});

test("without a project the tabs are Get Started and Settings", () => {
  setup({ hasProject: false, view: "getstarted" });
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Get Started", ""]);
});

test("every tab stays mounted with what its view drew, and only the current one shows", () => {
  setup();
  const tab = (name: ViewName) => document.querySelector(`[data-view="${name}"]`) as HTMLElement;
  for (const name of ["board", "diagram", "requirements", "specs", "settings"] as const) expect(tab(name).isConnected).toBe(true);
  const visible = (name: ViewName) => !(tab(name).closest("[hidden]") ?? tab(name).closest('[data-state="inactive"]'));
  expect(visible("diagram")).toBe(true);
  expect(visible("board")).toBe(false);
});

test("a view that draws again changes its tab in place", () => {
  const { store } = setup();
  act(() => store.set({ views: { ...store.get().views, diagram: <p data-view="diagram">drawn again</p> } }));
  expect(screen.getByText("drawn again")).not.toBeNull();
});

test("choosing a tab navigates, and the Board tab shows its decision count", () => {
  const { store, visited } = setup({ decisions: 3 });
  expect(screen.getByRole("tab", { name: /Board/ }).textContent).toBe("Board3");
  fireEvent.mouseDown(screen.getByRole("tab", { name: /Requirements/ }), { button: 0, ctrlKey: false });
  expect(new Set(visited)).toEqual(new Set(["requirements"]));
  expect(store.get().view).toBe("requirements");
  act(() => store.set({ decisions: 0 }));
  expect(screen.getByRole("tab", { name: /Board/ }).textContent).toBe("Board");
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
