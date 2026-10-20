import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RequirementsTab, type RequirementsProps } from "../extension/src/webview/requirements";
import type { Snapshot } from "../src/core/snapshot";

afterEach(cleanup);

const section = (ref: string | null, text: string, over: Record<string, unknown> = {}) => ({ ref, text, change: "same", before: null, movedFrom: null, ...over });
const fragment = (id: string, sections: unknown[], over: Record<string, unknown> = {}) => ({ id, title: `Fragment ${id}`, file: `requirements/ui/${id}.md`, description: "", change: "same", sections, ...over });
const area = (fragments: unknown[], over: Record<string, unknown> = {}) => ({ id: "ui", title: "UI", file: "requirements/ui/area.md", description: "", intro: "", change: "same", fragments, ...over });

function tab(areas: unknown[], over: Partial<RequirementsProps> = {}, proposals: unknown[] = []) {
  const calls = { files: [] as string[], targets: [] as (string | null)[], diagram: [] as unknown[] };
  const snapshot = { areas, proposals, numbers: undefined } as unknown as Snapshot;
  render(
    <RequirementsTab
      snapshot={snapshot}
      proposalId={null}
      target={null}
      onProposal={() => {}}
      onTarget={(t) => calls.targets.push(t)}
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

test("a focused target filters the Areas, and Show all clears it", () => {
  const calls = tab([area([fragment("main", [section("panel", "text")])])], { target: "requirements/other" });
  expect(screen.getByText("No Requirements for requirements/other.")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show all" }));
  expect(calls.targets).toEqual([null]);
});

test("the Proposal selector is disabled when no Proposal touches the Requirements", () => {
  tab([area([])]);
  expect((screen.getByRole("combobox", { name: "Proposal to draw over the Requirements" }) as HTMLButtonElement).disabled).toBe(true);
});
