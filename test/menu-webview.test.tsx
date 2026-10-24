import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { MenuState, ToMenuHost } from "../extension/src/menu-protocol";
import { MenuApp } from "../extension/src/webview/menu/app";
import { entryName, entryTooltip } from "../extension/src/webview/menu/logic";

afterEach(cleanup);

const project = (over: Partial<MenuState> = {}): MenuState => ({ situation: "project", decisions: 0, tasksSinceScan: 0, advisorScanner: false, panelView: null, ...over });

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

test("with the Advisor Scanner on Scan System stays in its place, disabled, with no number, and says why", () => {
  const { posted } = setup(project({ tasksSinceScan: 4, advisorScanner: true }));
  const scan = screen.getByRole("button", { name: /^Scan System/ }) as HTMLButtonElement;
  expect(scan.disabled).toBe(true);
  expect(scan.textContent).toBe("Scan System");
  expect(scan.getAttribute("aria-description")).toBe("Scans are off: the Advisor Scanner checks the code during Runs.");
  fireEvent.click(scan);
  expect(posted).toEqual([]);
  expect(names()).toEqual(["Board", "Diagram", "Requirements", "Specs", "History", "Scan System. Scans are off: the Advisor Scanner checks the code during Runs.", "Settings"]);
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

test("the tooltip of an entry names it and the panel; its accessible name is its text", () => {
  expect(entryTooltip("board")).toBe("Open Board in the Trama panel");
  expect(entryTooltip("getstarted")).toBe("Open Get Started in the Trama panel");
  expect(entryName("board", 0)).toBe("Board");
  expect(entryName("board", 2)).toBe("Board, 2 awaiting a decision");
  expect(entryName("diagram", 5)).toBe("Diagram");
});

test("focusing an entry shows its tooltip", async () => {
  setup(project());
  const history = screen.getByRole("button", { name: "History" });
  await act(async () => {
    history.focus();
    fireEvent.focus(history);
  });
  expect((await screen.findAllByText("Open History in the Trama panel")).length).toBeGreaterThan(0);
});

test("icon-only mode hides the text, the badge and the count under 200 px, centres the icon and keeps every tooltip", async () => {
  setup({ ...project({ decisions: 2, tasksSinceScan: 4 }), situation: "project" });
  const board = screen.getByRole("button", { name: "Board, 2 awaiting a decision" });
  expect(board.className).toContain("@max-[200px]:justify-center");
  expect(within(board).getByText("Board").className).toContain("@max-[200px]:hidden");
  expect(within(board).getByText("2").className).toContain("@max-[200px]:hidden");
  const scan = screen.getByRole("button", { name: /^Scan System · 4/ });
  expect(scan.className).toContain("@max-[200px]:justify-center");
  expect(scan.querySelector("span")?.className).toContain("@max-[200px]:hidden");
  await act(async () => {
    board.focus();
    fireEvent.focus(board);
  });
  expect((await screen.findAllByText("Open Board in the Trama panel")).length).toBeGreaterThan(0);
});

test("the Scan System tooltip shows its count after ` · `", async () => {
  setup(project({ tasksSinceScan: 4 }));
  const scan = screen.getByRole("button", { name: /^Scan System · 4/ });
  await act(async () => {
    scan.focus();
    fireEvent.focus(scan);
  });
  expect((await screen.findAllByText("Scan System · 4 Tasks finished since the last scan of the System")).length).toBeGreaterThan(0);
});

test("without a folder the sentence is hidden in icon-only mode, and Open Folder keeps its tooltip", async () => {
  setup({ ...project(), situation: "noFolder" });
  expect(screen.getByText("Open a folder to use Trama.").className).toContain("@max-[200px]:hidden");
  const open = screen.getByRole("button", { name: "Open Folder" });
  await act(async () => {
    open.focus();
    fireEvent.focus(open);
  });
  expect((await screen.findAllByText("Open a folder to use Trama.")).length).toBeGreaterThan(0);
});
