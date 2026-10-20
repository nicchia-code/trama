import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RequirementsTab, type RequirementsProps } from "../extension/src/webview/requirements";
import type { Snapshot } from "../src/core/snapshot";

afterEach(cleanup);

const section = (ref: string | null, text: string, over: Record<string, unknown> = {}) => ({ ref, text, change: "same", before: null, movedFrom: null, ...over });
const fragment = (id: string, sections: unknown[], over: Record<string, unknown> = {}) => ({ id, title: `Fragment ${id}`, file: `requirements/ui/${id}.md`, description: "", change: "same", sections, ...over });
const area = (fragments: unknown[], over: Record<string, unknown> = {}) => ({ id: "ui", title: "UI", file: "requirements/ui/area.md", description: "", intro: "", change: "same", fragments, ...over });

function tab(areas: unknown[], over: Partial<RequirementsProps> = {}, proposals: unknown[] = []) {
  const calls = { files: [] as string[], focus: [] as unknown[], diagram: [] as unknown[] };
  const snapshot = { areas, proposals, numbers: undefined } as unknown as Snapshot;
  render(
    <RequirementsTab
      snapshot={snapshot}
      proposalId={null}
      focus={null}
      onProposal={() => {}}
      onFocus={(f) => calls.focus.push(f)}
      navigate={(_, o) => calls.diagram.push(o)}
      openFile={(p) => calls.files.push(p)}
      openLink={() => {}}
      {...over}
    />,
  );
  return calls;
}

test("an Area shows its fragments with the file name, General first, and an Area without fragments says so", () => {
  tab([area([fragment("main", [section("panel", "About the panel"), section(null, "General text")])]), area([], { id: "empty", title: "Empty" })]);
  expect(screen.getByText("main.md")).not.toBeNull();
  expect(screen.getByText("No fragments.")).not.toBeNull();
  expect(screen.getByText("General text")).not.toBeNull();
});

test("changes carry their labels, and a moved section names where it came from", () => {
  tab([
    area([
      fragment("a", [section("x", "new text", { change: "changed", before: "old text", movedFrom: "b" })], { change: "added" }),
    ]),
  ]);
  expect(screen.getByText("new fragment")).not.toBeNull();
  expect(screen.getByText("moved from b")).not.toBeNull();
  expect(screen.getByText("changed")).not.toBeNull();
  expect(screen.getByText("old text")).not.toBeNull();
});

test("a section reference opens the Diagram on it, and Open file asks the host for the file", () => {
  const calls = tab([area([fragment("main", [section("panel", "text")])])]);
  fireEvent.click(screen.getByRole("button", { name: "panel" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Open file" })[0] as HTMLElement);
  expect(calls.diagram).toEqual([{ ref: "panel" }]);
  expect(calls.files).toEqual(["requirements/ui/area.md"]);
});

test("every Area stays visible and nothing says a reference filters them", () => {
  tab([area([fragment("main", [section("panel", "text")])]), area([], { id: "empty", title: "Empty" })]);
  expect(screen.queryByText(/Showing/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Show all" })).toBeNull();
  expect(screen.getByText("UI")).not.toBeNull();
  expect(screen.getByText("Empty")).not.toBeNull();
});

test("the Proposal selector is disabled when no Proposal touches the Requirements", () => {
  tab([area([])]);
  expect((screen.getByRole("combobox", { name: "Proposal to draw over the Requirements" }) as HTMLButtonElement).disabled).toBe(true);
});
