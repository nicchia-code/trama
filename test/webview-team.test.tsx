import { afterEach, beforeAll, expect, jest, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { PersonView } from "../src/core/people";
import type { ToHost, ToWebview } from "../extension/src/protocol";
import { mountTeam, TeamPage } from "../extension/src/webview/team";
import { absenceText, inputOf, newDraft, peopleCount, withSkills } from "../extension/src/webview/team/logic";
import type { Rejection } from "../extension/src/webview/team/person-dialog";

type TeamMessage = Extract<ToWebview, { type: "team" }>;

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
  jest.useRealTimers();
});

const ADA: PersonView = { id: "aaaaaaa1", name: "Ada Lovelace", handle: "ada", level: "senior", skills: ["Rust", "Go"], capacity: 4.5, absences: [], repositories: ["acme/web"], initials: "AL", nextAbsence: null };
const GRACE: PersonView = { id: "bbbbbbb2", name: "Grace Hopper", handle: "grace", level: "mid", skills: [], capacity: 5, absences: [], repositories: ["acme/web"], initials: "GH", nextAbsence: null };
const LINUS: PersonView = { id: "ccccccc3", name: "Linus Torvalds", handle: "linus", level: "junior", skills: ["C"], capacity: 2, absences: [], repositories: ["acme/api"], initials: "LT", nextAbsence: null };

const team = (members: PersonView[], others: PersonView[] = [], extra: Partial<TeamMessage> = {}): TeamMessage => ({ type: "team", members, others, unreadable: 0, error: null, ...extra });

/** The page on its People tab, which is the one these tests are about. */
function setup(initial: TeamMessage | null, rejection: Rejection | null = null) {
  const posted: ToHost[] = [];
  const post = (message: ToHost) => void posted.push(message);
  const utils = render(<TeamPage team={initial} rejection={rejection} post={post} />);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "People" }));
  const again = (next: TeamMessage | null, nextRejection: Rejection | null = rejection) => utils.rerender(<TeamPage team={next} rejection={nextRejection} post={post} />);
  return { posted, again, ...utils };
}

const click = (name: string | RegExp, role = "button") => fireEvent.click(screen.getByRole(role, { name }));
const field = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const type = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });

// ---- The logic ----

test("the header counts the people, singular for one", () => {
  expect(peopleCount(3)).toBe("3 people in this project's team");
  expect(peopleCount(1)).toBe("1 person in this project's team");
});

test("an absence is told with the days, the month and the year only when it is not this one", () => {
  const off = (from: string, to: string, year = 2026) => absenceText({ from, to }, year);
  expect(off("2026-11-10", "2026-11-12")).toBe("Off 10–12 Nov");
  expect(off("2026-11-02", "2026-11-02")).toBe("Off 2 Nov");
  expect(off("2026-10-30", "2026-11-02")).toBe("Off 30 Oct – 2 Nov");
  expect(off("2027-01-04", "2027-01-08")).toBe("Off 4–8 Jan 2027");
  expect(off("2027-03-02", "2027-03-02")).toBe("Off 2 Mar 2027");
  expect(off("2026-12-30", "2027-01-02")).toBe("Off 30 Dec – 2 Jan 2027");
});

test("the tag input adds each comma-separated part once, without case, and Save counts what waits in it", () => {
  expect(withSkills(["Rust"], "go, RUST , ,Zig")).toEqual(["Rust", "go", "Zig"]);
  const draft = { ...newDraft(), name: "Ada", handle: "ada", skills: ["Rust"], skillText: "Go", capacity: "4.5" };
  expect(inputOf(draft)).toEqual({ name: "Ada", handle: "ada", level: "mid", skills: ["Rust", "Go"], capacity: 4.5, absences: [] });
  expect(inputOf({ ...draft, capacity: "" }).capacity).toBeNaN();
});

// ---- The view ----

test("the view has the title Team and the tabs Decisions, Issues, Timeline and People, in this order, and opens on Decisions", () => {
  render(<TeamPage team={null} rejection={null} post={() => {}} />);
  expect(screen.getByRole("heading", { name: "Team" })).not.toBeNull();
  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((tab) => tab.textContent)).toEqual(["Decisions", "Issues", "Timeline", "People"]);
  expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false", "false", "false"]);
  expect(screen.getByRole("tablist", { name: "Team" })).not.toBeNull();
});

test("the tab chosen stays while the page updates", () => {
  const { again } = setup(team([ADA]));
  expect(screen.getByRole("tab", { name: "People" }).getAttribute("aria-selected")).toBe("true");
  again(team([ADA, GRACE]));
  expect(screen.getByRole("tab", { name: "People" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("Grace Hopper")).not.toBeNull();
});

test("mountTeam draws the page, takes the people and then GitHub from the host", () => {
  const posted: ToHost[] = [];
  let node: ReactNode = null;
  const view = mountTeam((next) => void (node = next), { post: (message) => void posted.push(message), navigate: () => {}, openLink: () => {} });
  const shown = render(<>{node}</>);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "People" }));
  expect(screen.queryByText("Ada Lovelace")).toBeNull();
  act(() => view.receive(team([ADA])));
  shown.rerender(<>{node}</>);
  expect(screen.getByText("Ada Lovelace")).not.toBeNull();
  expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
  act(() => view.receiveGitHub({ type: "teamGitHub", state: "not-installed", reading: false, repository: "acme/web", linked: null, readAt: null, project: null, issues: [], loads: [], signals: {}, actions: {}, projects: [], error: "GitHub CLI is not installed" }));
  shown.rerender(<>{node}</>);
  expect(screen.getByText("GitHub CLI is not installed")).not.toBeNull();
  expect(screen.getAllByRole("button", { name: "Refresh" }).length).toBeGreaterThan(0);
  expect(posted).toEqual([]);
});

test("the table lists the people of the team with their data, the avatar with the initials and no photo", () => {
  setup(team([{ ...ADA, nextAbsence: { from: "2026-11-10", to: "2026-11-12" } }, GRACE], [LINUS]));
  expect(screen.getByText("2 people in this project's team")).not.toBeNull();
  expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Person", "Level", "Skills", "Capacity", "Next absence", "Actions"]);
  const rows = screen.getAllByRole("row").slice(1);
  expect(rows).toHaveLength(2);
  const ada = within(rows[0] as HTMLElement);
  expect(ada.getByText("Ada Lovelace")).not.toBeNull();
  expect(ada.getByText("@ada").className).toContain("font-mono");
  expect(ada.getByText("AL")).not.toBeNull();
  expect(ada.getByText("Senior")).not.toBeNull();
  expect(ada.getByText("Rust")).not.toBeNull();
  expect(ada.getByText("Go")).not.toBeNull();
  expect(ada.getByText("4.5 d / sprint")).not.toBeNull();
  expect(ada.getByText(`Off 10–12 Nov${new Date().getFullYear() === 2026 ? "" : " 2026"}`)).not.toBeNull();
  expect(within(rows[1] as HTMLElement).getByText("None planned")).not.toBeNull();
  expect(document.querySelector("img")).toBeNull();
  expect(screen.queryByText("Linus Torvalds")).toBeNull();
  // The icon-only buttons have their tooltip text as the accessible name.
  expect(screen.getByRole("button", { name: "Edit Ada Lovelace" })).not.toBeNull();
  expect(screen.getByRole("button", { name: "Remove Grace Hopper from team" })).not.toBeNull();
});

test("one person: the header says person; saved people that cannot be read are counted under it", () => {
  setup(team([ADA], [], { unreadable: 2 }));
  expect(screen.getByText("1 person in this project's team")).not.toBeNull();
  expect(screen.getByText("2 saved people could not be read and are not shown.")).not.toBeNull();
});

test("an empty team shows the icon, the heading, the text and the two buttons", () => {
  setup(team([], [LINUS]));
  expect(screen.getByRole("heading", { name: "No one in this team yet" })).not.toBeNull();
  expect(screen.getByText("Add the first person so the agent can propose assignees, reviewers and sprints that fit their capacity.")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Add the first person" })).not.toBeNull();
  expect((screen.getByRole("button", { name: "Add from other projects" }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.queryByRole("button", { name: "Add person" })).toBeNull();
});

test("nothing is drawn of the people before the host has sent them", () => {
  setup(null);
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.queryByText("No one in this team yet")).toBeNull();
});

test("Add from other projects is disabled, with its reason, when everyone is already in the team", () => {
  setup(team([ADA], []));
  const button = screen.getByRole("button", { name: "Add from other projects" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(button.getAttribute("aria-describedby")).not.toBeNull();
  expect(document.getElementById(button.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Everyone you know is already in this team");
});

test("Add from other projects searches the people outside the team and adds the chosen one at once", async () => {
  const { posted } = setup(team([ADA], [GRACE, LINUS]));
  click("Add from other projects");
  const search = await screen.findByPlaceholderText("Search people…");
  expect(screen.getByText("Grace Hopper")).not.toBeNull();
  expect(screen.getByText("@linus").className).toContain("font-mono");
  expect(screen.getByText("Junior")).not.toBeNull();
  fireEvent.change(search, { target: { value: "torv" } });
  await waitFor(() => expect(screen.queryByText("Grace Hopper")).toBeNull());
  fireEvent.click(screen.getByText("Linus Torvalds"));
  expect(posted).toEqual([{ type: "addToTeam", id: "ccccccc3" }]);
  await waitFor(() => expect(screen.queryByPlaceholderText("Search people…")).toBeNull());
});

// ---- Remove from team ----

test("Remove from team acts at once, says who left with Undo, and Undo puts them back", () => {
  const { posted } = setup(team([ADA, GRACE]));
  click("Remove Ada Lovelace from team");
  expect(posted).toEqual([{ type: "removeFromTeam", id: "aaaaaaa1" }]);
  expect(screen.getByText("Ada Lovelace left this team.")).not.toBeNull();
  click("Undo");
  expect(posted.at(-1)).toEqual({ type: "undoRemoveFromTeam", id: "aaaaaaa1" });
  expect(screen.queryByText("Ada Lovelace left this team.")).toBeNull();
});

test("a write that failed shows the sentence of the host at the top, with Close", () => {
  const { again } = setup(team([ADA], [], { error: "Trama could not save the team: disk full." }));
  expect(screen.getByText("Trama could not save the team: disk full.")).not.toBeNull();
  click(/^Close the notice/);
  expect(screen.queryByText("Trama could not save the team: disk full.")).toBeNull();
  // The next answer with an error is a new notice.
  again(team([ADA], [], { error: "Trama could not save the team: disk full." }));
  expect(screen.getByText("Trama could not save the team: disk full.")).not.toBeNull();
});

// ---- The dialog ----

test("Add person opens the dialog with its fields and defaults, and Cancel closes it without sending", () => {
  const { posted } = setup(team([ADA]));
  click("Add person");
  const dialog = screen.getByRole("dialog", { name: "Add person" });
  expect(within(dialog).getByText("Trama uses this to propose assignees, reviewers and sprint load.")).not.toBeNull();
  expect(field("Name").value).toBe("");
  expect(within(dialog).getByText("@")).not.toBeNull();
  expect(field("GitHub handle").className).toContain("font-mono");
  expect(within(dialog).getByRole("combobox", { name: "Level" }).textContent).toBe("Mid");
  expect((within(dialog).getByLabelText("Capacity per sprint") as HTMLInputElement).value).toBe("5");
  expect((within(dialog).getByLabelText("Capacity per sprint") as HTMLInputElement).step).toBe("0.5");
  expect(within(dialog).getByText("days")).not.toBeNull();
  expect(within(dialog).getByPlaceholderText("Add a skill…")).not.toBeNull();
  expect(within(dialog).getByRole("button", { name: "Add absence" })).not.toBeNull();
  expect(within(dialog).queryByRole("button", { name: "Delete person" })).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(posted).toEqual([]);
});

test("Save checks every field: the invalid ones are marked, described, the first gets the focus and nothing is sent", () => {
  const { posted } = setup(team([ADA]));
  click("Add person");
  type(field("GitHub handle"), "a b");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  const name = field("Name");
  const handle = field("GitHub handle");
  expect(name.getAttribute("aria-invalid")).toBe("true");
  expect(document.getElementById(name.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Enter a name of 1 to 80 characters.");
  expect(handle.getAttribute("aria-invalid")).toBe("true");
  expect(document.getElementById(handle.getAttribute("aria-describedby") ?? "")?.textContent).toBe("A GitHub handle can't contain spaces.");
  expect(document.activeElement).toBe(name);
  expect(posted).toEqual([]);
  // Writing in a field takes its mark away.
  type(name, "Ada");
  expect(name.getAttribute("aria-invalid")).toBe("false");
  expect(handle.getAttribute("aria-invalid")).toBe("true");
});

test("a handle already in the list is refused by the dialog itself, without case", () => {
  const { posted } = setup(team([ADA], [GRACE]));
  click("Add person");
  type(field("Name"), "Other");
  type(field("GitHub handle"), "@GRACE");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(document.getElementById(field("GitHub handle").getAttribute("aria-describedby") ?? "")?.textContent).toBe("@GRACE is already in your list: add them from other projects.");
  expect(posted).toEqual([]);
});

test("skills: Enter or a comma add a chip, a repeat adds nothing, Backspace in the empty field takes the last off, the X removes one", () => {
  setup(team([ADA]));
  click("Add person");
  const skills = screen.getByPlaceholderText("Add a skill…");
  type(skills, "Rust");
  fireEvent.keyDown(skills, { key: "Enter" });
  type(skills, "go");
  fireEvent.keyDown(skills, { key: "," });
  type(skills, "RUST");
  fireEvent.keyDown(skills, { key: "Enter" });
  expect(screen.getByRole("button", { name: "Remove Rust" })).not.toBeNull();
  expect(screen.getByRole("button", { name: "Remove go" })).not.toBeNull();
  expect(screen.getAllByRole("button", { name: /^Remove (Rust|go)$/ })).toHaveLength(2);
  expect((skills as HTMLInputElement).value).toBe("");
  fireEvent.keyDown(skills, { key: "Backspace" });
  expect(screen.queryByRole("button", { name: "Remove go" })).toBeNull();
  click("Remove Rust");
  expect(screen.queryByRole("button", { name: "Remove Rust" })).toBeNull();
});

test("absences: rows with From and To, removable, and an invalid one is marked", () => {
  const { posted } = setup(team([ADA]));
  click("Add person");
  type(field("Name"), "Linus");
  type(field("GitHub handle"), "linus");
  click("Add absence");
  click("Add absence");
  expect(screen.getAllByLabelText("From")).toHaveLength(2);
  expect(screen.getAllByLabelText("To")).toHaveLength(2);
  fireEvent.change(screen.getAllByLabelText("From")[0] as HTMLElement, { target: { value: "2099-02-10" } });
  fireEvent.change(screen.getAllByLabelText("To")[0] as HTMLElement, { target: { value: "2099-02-01" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Remove absence" })[1] as HTMLElement);
  expect(screen.getAllByLabelText("From")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByText("The end of an absence can't be before its start.")).not.toBeNull();
  expect(screen.getAllByLabelText("From")[0]?.getAttribute("aria-invalid")).toBe("true");
  expect(posted).toEqual([]);
});

test("Save of a valid person sends it, keeps the dialog open until the host answers and closes it with the answer", () => {
  const { posted, again } = setup(team([ADA]));
  click("Add person");
  type(field("Name"), "  Linus Torvalds ");
  type(field("GitHub handle"), "@linus");
  const skills = screen.getByPlaceholderText("Add a skill…");
  type(skills, "C");
  fireEvent.keyDown(skills, { key: "Enter" });
  type(screen.getByLabelText("Capacity per sprint"), "2.5");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(posted).toEqual([{ type: "savePerson", person: { name: "  Linus Torvalds ", handle: "@linus", level: "mid", skills: ["C"], capacity: 2.5, absences: [] } }]);
  expect(screen.getByRole("dialog")).not.toBeNull();
  expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  again(team([ADA, { ...LINUS, repositories: ["acme/web"] }]));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("Linus Torvalds")).not.toBeNull();
});

test("a person the host refused marks its fields in the dialog, which stays open", () => {
  const sent = team([ADA]);
  const { posted, again } = setup(sent);
  click("Add person");
  type(field("Name"), "Linus");
  type(field("GitHub handle"), "linus");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(posted).toHaveLength(1);
  again(sent, { n: 1, errors: { handle: "@linus is already in your list: add them from other projects." } });
  expect(screen.getByRole("dialog")).not.toBeNull();
  expect(field("GitHub handle").getAttribute("aria-invalid")).toBe("true");
  expect(document.activeElement).toBe(field("GitHub handle"));
  expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false);
});

test("Edit person fills the dialog with the person, sorted absences included, and has Delete person", () => {
  const { posted, again } = setup(team([{ ...ADA, absences: [{ from: "2099-03-01", to: "2099-03-02" }, { from: "2099-01-01", to: "2099-01-02" }] }]));
  click("Edit Ada Lovelace");
  const dialog = screen.getByRole("dialog", { name: "Edit person" });
  expect(field("Name").value).toBe("Ada Lovelace");
  expect(field("GitHub handle").value).toBe("ada");
  expect(within(dialog).getByRole("combobox", { name: "Level" }).textContent).toBe("Senior");
  expect((within(dialog).getByLabelText("Capacity per sprint") as HTMLInputElement).value).toBe("4.5");
  expect(within(dialog).getByRole("button", { name: "Remove Rust" })).not.toBeNull();
  expect(within(dialog).getAllByLabelText("From").map((input) => (input as HTMLInputElement).value)).toEqual(["2099-01-01", "2099-03-01"]);
  // Her own handle is not "taken".
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  expect(posted).toHaveLength(1);
  expect(posted[0]).toMatchObject({ type: "savePerson", person: { id: "aaaaaaa1", handle: "ada" } });
  again(team([ADA]));
  click("Edit Ada Lovelace");
  fireEvent.click(screen.getByRole("button", { name: "Delete person" }));
  expect(posted.at(-1)).toEqual({ type: "deletePerson", id: "aaaaaaa1" });
  // Cancelling the editor's dialog changes nothing: the dialog stays until the person is gone.
  expect(screen.getByRole("dialog")).not.toBeNull();
  again(team([GRACE]));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("Esc closes the dialog without saving, and the focus goes back to the button that opened it", async () => {
  const { posted } = setup(team([ADA]));
  const opener = screen.getByRole("button", { name: "Add person" });
  opener.focus();
  fireEvent.click(opener);
  expect(screen.getByRole("dialog")).not.toBeNull();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(opener));
  expect(posted).toEqual([]);
});

// Last in the file: the fake clock of bun does not hand back to the waiting of Testing Library once it is used.
test("the notice of a removal goes away after 10 seconds, or with the next change", () => {
  jest.useFakeTimers();
  setup(team([ADA, GRACE]));
  click("Remove Ada Lovelace from team");
  act(() => void jest.advanceTimersByTime(9_900));
  expect(screen.queryByText("Ada Lovelace left this team.")).not.toBeNull();
  act(() => void jest.advanceTimersByTime(200));
  expect(screen.queryByText("Ada Lovelace left this team.")).toBeNull();
  click("Remove Grace Hopper from team");
  expect(screen.getByText("Grace Hopper left this team.")).not.toBeNull();
  click("Add person");
  expect(screen.queryByText("Grace Hopper left this team.")).toBeNull();
});
