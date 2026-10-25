import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { MenuState, MergeMenuState, ToMenuHost } from "../extension/src/menu-protocol";
import { MenuApp } from "../extension/src/webview/menu/app";
import { entryName } from "../extension/src/webview/menu/logic";

afterEach(cleanup);

const project = (over: Partial<MenuState> = {}): MenuState => ({ situation: "project", decisions: 0, tasksSinceScan: 0, panelView: null, ...over });

function setup(state: MenuState | null) {
  const posted: ToMenuHost[] = [];
  const utils = render(<MenuApp state={state} post={(message) => void posted.push(message)} />);
  return { posted, ...utils };
}

const names = () => screen.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);

test("before the host's first state nothing is drawn", () => {
  setup(null);
  expect(screen.queryAllByRole("button")).toEqual([]);
});

test("without a folder: the sentence, the primary Open Folder button and Settings at the bottom", () => {
  const { posted } = setup({ ...project(), situation: "noFolder" });
  expect(screen.getByText("Open a folder to use Trama.").className).toContain("text-muted-foreground");
  expect(names()).toEqual(["Open Folder", "Settings"]);
  const open = screen.getByRole("button", { name: "Open Folder" });
  expect(open.className).toContain("bg-primary");
  expect(open.querySelector("svg")?.getAttribute("class")).toContain("size-4");
  fireEvent.click(open);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(posted).toEqual([{ type: "openFolder" }, { type: "show", view: "settings" }]);
  // The sentence comes before the button, which comes before Settings, apart under a line.
  expect(screen.getByRole("button", { name: "Settings" }).parentElement?.className).toContain("border-t");
});

test("in a folder that is no project: Get Started, and Settings at the bottom", () => {
  const { posted } = setup({ ...project(), situation: "notProject" });
  expect(names()).toEqual(["Get Started", "Settings"]);
  fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
  expect(posted).toEqual([{ type: "show", view: "getstarted" }]);
});

test("in a project the entries come in order, then after a line Scan System and Settings at the foot", () => {
  setup(project());
  expect(names()).toEqual(["Board", "Diagram", "Requirements", "Specs", "History", "Scan System", "Settings"]);
  const scan = screen.getByRole("button", { name: "Scan System" });
  expect(scan.className).toContain("justify-start");
  expect(scan.className).not.toContain("bg-primary");
  expect(scan.parentElement?.className).toContain("border-t");
  expect(screen.getByRole("button", { name: "Settings" }).parentElement).toBe(scan.parentElement);
  for (const button of screen.getAllByRole("button")) {
    expect(button.className).toContain("w-full");
    expect(button.querySelector("svg")?.getAttribute("class")).toContain("size-4");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  }
});

test("each entry posts show with its view, and Scan System posts scan", () => {
  const { posted } = setup(project());
  for (const name of ["Board", "Diagram", "Requirements", "Specs", "History", "Settings"]) fireEvent.click(screen.getByRole("button", { name }));
  fireEvent.click(screen.getByRole("button", { name: "Scan System" }));
  expect(posted).toEqual([
    { type: "show", view: "board" },
    { type: "show", view: "diagram" },
    { type: "show", view: "requirements" },
    { type: "show", view: "specs" },
    { type: "show", view: "history" },
    { type: "show", view: "settings" },
    { type: "scan" },
  ]);
});

test("Board shows a badge with N and its name says N are awaiting a decision; with none there is no badge", () => {
  setup(project({ decisions: 3 }));
  const board = screen.getByRole("button", { name: "Board, 3 awaiting a decision" });
  expect(within(board).getByText("3").getAttribute("data-slot")).toBe("badge");
  cleanup();
  setup(project({ decisions: 0 }));
  const plain = screen.getByRole("button", { name: "Board" });
  expect(plain.querySelector('[data-slot="badge"]')).toBeNull();
});

test("Scan System shows the count of Tasks since the last scan, and the count is part of its name", () => {
  setup(project({ tasksSinceScan: 4 }));
  const scan = screen.getByRole("button", { name: /^Scan System · 4/ });
  expect(scan.textContent).toBe("Scan System · 4");
  expect(scan.getAttribute("aria-label")).toBe("Scan System · 4. 4 Tasks finished since the last scan of the System");
  expect((scan as HTMLButtonElement).disabled).toBe(false);
});

test("with the Advisor Scanner on Scan System stays enabled, with its count, and asks for the scan of the whole System", () => {
  const { posted } = setup(project({ tasksSinceScan: 4 }));
  const scan = screen.getByRole("button", { name: /^Scan System · 4/ }) as HTMLButtonElement;
  expect(scan.disabled).toBe(false);
  expect(scan.textContent).toBe("Scan System · 4");
  expect(scan.hasAttribute("aria-describedby")).toBe(false);
  fireEvent.click(scan);
  expect(posted).toEqual([{ type: "scan" }]);
  expect(names()).toEqual(["Board", "Diagram", "Requirements", "Specs", "History", "Scan System · 4. 4 Tasks finished since the last scan of the System", "Settings"]);
});

test("the entry of the view the panel shows is highlighted with aria-current, and none is with the panel closed", () => {
  const { rerender } = setup(project({ panelView: "specs" }));
  const current = () => screen.getAllByRole("button").filter((button) => button.getAttribute("aria-current") === "page").map((button) => button.textContent);
  expect(current()).toEqual(["Specs"]);
  expect(screen.getByRole("button", { name: "Specs" }).className).toContain("aria-[current=page]:bg-accent");
  rerender(<MenuApp state={project({ panelView: "board" })} post={() => {}} />);
  expect(current()).toEqual(["Board"]);
  rerender(<MenuApp state={project({ panelView: "settings" })} post={() => {}} />);
  expect(current()).toEqual(["Settings"]);
  rerender(<MenuApp state={project({ panelView: null })} post={() => {}} />);
  expect(current()).toEqual([]);
});

test("Get Started and Settings are highlighted the same way when the panel shows them", () => {
  const { rerender } = setup({ ...project({ panelView: "getstarted" }), situation: "notProject" });
  expect(screen.getByRole("button", { name: "Get Started" }).getAttribute("aria-current")).toBe("page");
  rerender(<MenuApp state={{ ...project({ panelView: "settings" }), situation: "noFolder" }} post={() => {}} />);
  expect(screen.getByRole("button", { name: "Settings" }).getAttribute("aria-current")).toBe("page");
});

test("the entries are native buttons in the order they appear, so Tab, Enter and Space reach them", () => {
  setup(project());
  const buttons = screen.getAllByRole("button");
  expect(buttons.every((button) => button.tagName === "BUTTON" && button.getAttribute("tabindex") === null)).toBe(true);
  expect(buttons.map((button) => button.textContent)).toEqual(["Board", "Diagram", "Requirements", "Specs", "History", "Scan System", "Settings"]);
});

test("the accessible name of an entry is its text, and Board's names the cards awaiting a decision", () => {
  expect(entryName("board", 0)).toBe("Board");
  expect(entryName("board", 2)).toBe("Board, 2 awaiting a decision");
  expect(entryName("diagram", 5)).toBe("Diagram");
});

test("focusing an entry shows no tooltip, and no element of the menu has a title", async () => {
  setup(project());
  const history = screen.getByRole("button", { name: "History" });
  await act(async () => {
    history.focus();
    fireEvent.focus(history);
  });
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(screen.queryByText("Open History in the Trama panel")).toBeNull();
  expect(document.querySelectorAll("[title]").length).toBe(0);
});

test("icon-only mode hides the text, the badge and the count under 56 px, centres the icon and shows no tooltip", async () => {
  setup({ ...project({ decisions: 2, tasksSinceScan: 4 }), situation: "project" });
  const board = screen.getByRole("button", { name: "Board, 2 awaiting a decision" });
  expect(board.className).toContain("@max-[56px]:justify-center");
  expect(within(board).getByText("Board").className).toContain("@max-[56px]:hidden");
  expect(within(board).getByText("2").className).toContain("@max-[56px]:hidden");
  const scan = screen.getByRole("button", { name: /^Scan System · 4/ });
  expect(scan.className).toContain("@max-[56px]:justify-center");
  expect(scan.querySelector("span")?.className).toContain("@max-[56px]:hidden");
  await act(async () => {
    board.focus();
    fireEvent.focus(board);
  });
  expect(screen.queryByRole("tooltip")).toBeNull();
});

test("Scan System shows no tooltip when focused, and no line about the Advisor Scanner", async () => {
  setup(project({ tasksSinceScan: 4 }));
  const scan = screen.getByRole("button", { name: /^Scan System · 4/ });
  await act(async () => {
    scan.focus();
    fireEvent.focus(scan);
  });
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(screen.queryByText(/Scan is off during Runs/)).toBeNull();
  expect(scan.hasAttribute("aria-describedby")).toBe(false);
});

test("without a folder the sentence is hidden in icon-only mode, and Open Folder has no tooltip", async () => {
  setup({ ...project(), situation: "noFolder" });
  expect(screen.getByText("Open a folder to use Trama.").className).toContain("@max-[56px]:hidden");
  const open = screen.getByRole("button", { name: "Open Folder" });
  await act(async () => {
    open.focus();
    fireEvent.focus(open);
  });
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(screen.getAllByText("Open a folder to use Trama.").length).toBe(1);
});

test("Open Folder keeps its accessible name in icon-only mode, where its text is hidden", () => {
  setup({ ...project(), situation: "noFolder" });
  const open = screen.getByRole("button", { name: "Open Folder" });
  expect(within(open).getByText("Open Folder").className).toContain("@max-[56px]:hidden");
  expect(open.getAttribute("aria-label")).toBe("Open Folder");
});

// Merge of Solo mode (`ui#solo-merge`).
const withMerge = (merge: MergeMenuState, over: Partial<MenuState> = {}): MenuState => project({ merge, ...over });
const TRACKED = "Some Trama files are tracked by git: their changes enter your commits.";

test("without merge in the state (Solo mode off) there is no Merge button and no line", () => {
  setup(project());
  expect(screen.queryByRole("button", { name: /^Merge/ })).toBeNull();
  expect(screen.queryByText(TRACKED)).toBeNull();
});

test("Merge comes first at the foot, before Scan System and Settings, as the only primary button, as wide as the view, icon and text to the left", () => {
  const { posted } = setup(withMerge({ available: true, trackedTrama: false }));
  expect(names()).toEqual(["Board", "Diagram", "Requirements", "Specs", "History", "Merge", "Scan System", "Settings"]);
  const merge = screen.getByRole("button", { name: "Merge" });
  expect(merge.className).toContain("bg-primary");
  expect(merge.className).toContain("w-full");
  expect(merge.className).toContain("justify-start");
  expect((merge as HTMLButtonElement).disabled).toBe(false);
  expect(merge.hasAttribute("aria-disabled")).toBe(false);
  expect(merge.hasAttribute("title")).toBe(false);
  expect(merge.querySelector("svg")?.getAttribute("class")).toContain("lucide-git-merge");
  expect(merge.parentElement).toBe(screen.getByRole("button", { name: "Scan System" }).parentElement);
  expect(merge.parentElement?.className).toContain("border-t");
  // No other button of the menu is primary.
  expect(screen.getAllByRole("button").filter((button) => button.className.includes("bg-primary"))).toEqual([merge]);
  fireEvent.click(merge);
  expect(posted).toEqual([{ type: "merge" }]);
});

test("an unavailable Merge is disabled, marked so for assistive technologies, with the reason in a line below in secondary text and in its name", () => {
  const reasons = {
    inProgress: "A merge is in progress.",
    detached: "Check out a branch to merge.",
    changes: "Commit or stash your changes to merge.",
    agent: "Wait for the agent to finish.",
  } as const;
  for (const [reason, text] of Object.entries(reasons)) {
    const { posted } = setup(withMerge({ available: false, reason: reason as keyof typeof reasons, trackedTrama: false }));
    const merge = screen.getByRole("button", { name: `Merge. ${text}` });
    expect((merge as HTMLButtonElement).disabled).toBe(true);
    expect(merge.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(text).className).toContain("text-muted-foreground");
    expect(merge.compareDocumentPosition(screen.getByText(text)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(merge);
    expect(posted).toEqual([]);
    cleanup();
  }
});

test("Trama files tracked by git add a line in the warning colour after the reason, and Merge stays enabled without one", () => {
  setup(withMerge({ available: true, trackedTrama: true }));
  const merge = screen.getByRole("button", { name: `Merge. ${TRACKED}` });
  expect((merge as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByText(TRACKED).className).toContain("text-amber-700");
  cleanup();
  setup(withMerge({ available: false, reason: "changes", trackedTrama: true }));
  const lines = screen.getAllByText(/\./).map((line) => line.textContent);
  expect(lines).toEqual(["Commit or stash your changes to merge.", TRACKED]);
  expect(screen.getByRole("button", { name: `Merge. Commit or stash your changes to merge. ${TRACKED}` })).toBeTruthy();
});

test("during a merge Trama started: Merge disabled with the Merging line, and below the ghost buttons of the conflict and Abort Merge", () => {
  const { posted } = setup(withMerge({ available: false, reason: "inProgress", trackedTrama: false, open: { branch: "origin/main", conflict: true } }));
  const line = "Merging origin/main: resolve the conflicts, then commit.";
  expect((screen.getByRole("button", { name: `Merge. ${line}` }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText("A merge is in progress.")).toBeNull();
  expect(names()).toEqual(["Board", "Diagram", "Requirements", "Specs", "History", `Merge. ${line}`, "Open Merge Editor", "Reconcile with Agent", "Abort Merge", "Scan System", "Settings"]);
  for (const [name, icon] of [["Open Merge Editor", "lucide-git-compare"], ["Reconcile with Agent", "lucide-bot"], ["Abort Merge", "lucide-x"]] as const) {
    const button = screen.getByRole("button", { name });
    expect(button.className).toContain("w-full");
    expect(button.className).toContain("justify-start");
    expect(button.className).not.toContain("bg-primary");
    expect(button.querySelector("svg")?.getAttribute("class")).toContain(icon);
    expect(button.hasAttribute("title")).toBe(false);
    fireEvent.click(button);
  }
  expect(posted).toEqual([{ type: "openMergeEditor" }, { type: "reconcileMerge" }, { type: "abortMerge" }]);
});

test("an open merge without conflicts left offers only Abort Merge", () => {
  setup(withMerge({ available: false, reason: "inProgress", trackedTrama: false, open: { branch: "feature", conflict: false } }));
  expect(screen.queryByRole("button", { name: "Open Merge Editor" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Reconcile with Agent" })).toBeNull();
  expect(screen.getByRole("button", { name: "Abort Merge" })).toBeTruthy();
});

test("icon-only mode: Merge and the buttons below it show only their icon, their lines are hidden and their names stay; no tooltip anywhere", async () => {
  setup(withMerge({ available: false, reason: "inProgress", trackedTrama: true, open: { branch: "feature", conflict: true } }));
  for (const name of ["Open Merge Editor", "Reconcile with Agent", "Abort Merge"]) {
    const button = screen.getByRole("button", { name });
    expect(button.className).toContain("@max-[56px]:justify-center");
    expect(button.querySelector("span")?.className).toContain("@max-[56px]:hidden");
  }
  const merge = screen.getByRole("button", { name: /^Merge\. Merging feature/ });
  expect(merge.className).toContain("@max-[56px]:justify-center");
  expect(within(merge).getByText("Merge").className).toContain("@max-[56px]:hidden");
  for (const text of ["Merging feature: resolve the conflicts, then commit.", TRACKED]) expect(screen.getByText(text).className).toContain("@max-[56px]:hidden");
  await act(async () => {
    merge.focus();
    fireEvent.focus(merge);
  });
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(document.querySelectorAll("[title]").length).toBe(0);
});

test("Merge is not drawn outside a project, whatever the state says", () => {
  setup({ ...project({ merge: { available: true, trackedTrama: false } }), situation: "notProject" });
  expect(screen.queryByRole("button", { name: /^Merge/ })).toBeNull();
});
