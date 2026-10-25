import { afterEach, beforeAll, expect, jest, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ToHost } from "../extension/src/protocol";
import { GitHubBanner, GitHubHeader, GitHubSkeleton, LinkProjectPage } from "../extension/src/webview/team/github";
import { choiceScope, createProjectUrl, fieldsLine, firstUsable, type GitHubMessage, gateOf, ownerOf, staleText, timeAgo, updatedText } from "../extension/src/webview/team/logic";
import { TeamPage } from "../extension/src/webview/team";

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

const ROADMAP = { owner: "acme", number: 1, title: "Roadmap", repository: true, iteration: true, fields: ["Iteration", "Estimate", "Priority"] };
const TRIAGE = { owner: "acme", number: 2, title: "Bug triage", repository: true, iteration: true, fields: ["Sprint", "Priority"] };
const PLATFORM = { owner: "acme", number: 3, title: "Platform Q4", repository: false, iteration: false, fields: ["Status"] };

const message = (extra: Partial<GitHubMessage> = {}): GitHubMessage => ({
  type: "teamGitHub",
  state: "ready",
  reading: false,
  repository: "acme/web",
  linked: { owner: "acme", number: 1, title: "Roadmap" },
  readAt: new Date().toISOString(),
  project: { fields: [], iterations: [] },
  issues: [],
  loads: [],
  signals: {},
  actions: {},
  projects: [ROADMAP, TRIAGE, PLATFORM],
  error: null,
  ...extra,
});

const posting = () => {
  const posted: ToHost[] = [];
  return { posted, post: (m: ToHost) => void posted.push(m) };
};

// ---- The logic ----

test("the time since a read is told as just now, minutes, hours and days", () => {
  const now = Date.parse("2026-10-25T12:00:00Z");
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();
  expect(timeAgo(ago(5), now)).toBe("just now");
  expect(timeAgo(ago(59), now)).toBe("just now");
  expect(timeAgo(ago(120), now)).toBe("2 min ago");
  expect(timeAgo(ago(3600), now)).toBe("1 h ago");
  expect(timeAgo(ago(3 * 86_400), now)).toBe("3 d ago");
  expect(updatedText(ago(120), now)).toBe("Updated 2 min ago");
  expect(updatedText(null, now)).toBe("");
  expect(staleText(ago(3600), now)).toBe("Showing data from 1 h ago.");
  expect(staleText(null, now)).toBeNull();
});

test("the picker names a Project of the repository by it and any other by its owner, and lists the fields Trama uses", () => {
  expect(choiceScope(ROADMAP, "acme/web")).toBe("acme/web");
  expect(choiceScope(PLATFORM, "acme/web")).toBe("acme");
  expect(fieldsLine(ROADMAP)).toBe("Iteration · Estimate · Priority fields");
  expect(fieldsLine({ ...ROADMAP, fields: ["Sprint"] })).toBe("Sprint field");
  expect(firstUsable([PLATFORM, TRIAGE, ROADMAP])).toBe(TRIAGE);
  expect(ownerOf("acme/web")).toBe("acme");
  expect(createProjectUrl("acme")).toBe("https://github.com/acme?tab=projects");
});

test("what stands in place of the tabs that need a Project: the skeleton at the first read, the page without a Project or while choosing another", () => {
  expect(gateOf(null, false)).toBeNull();
  expect(gateOf(message({ state: "loading", linked: null }), false)).toBe("loading");
  expect(gateOf(message({ linked: null }), false)).toBe("link");
  expect(gateOf(message(), false)).toBeNull();
  expect(gateOf(message(), true)).toBe("link");
  // A failure of gh leaves the tabs as they are: the box says what is wrong.
  expect(gateOf(message({ state: "not-logged-in", linked: null }), false)).toBeNull();
  expect(gateOf(message({ state: "read-error" }), true)).toBeNull();
});

// ---- The header ----

test("the header has the Project's button with the repository in monospace, the time of the last read and Refresh", () => {
  const { posted, post } = posting();
  render(<GitHubHeader github={message({ readAt: new Date(Date.now() - 120_000).toISOString() })} post={post} onPickAnother={() => {}} />);
  const button = screen.getByRole("button", { name: "GitHub Project: acme/web · Roadmap" });
  expect(button.querySelector(".font-mono")?.textContent).toBe("acme/web");
  expect(screen.getByText("Updated 2 min ago")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(posted).toEqual([{ type: "refreshTeam" }]);
});

test("while a read runs Refresh is unavailable; the first read says Loading from GitHub… and no button of a Project without one linked", () => {
  const { post } = posting();
  const view = render(<GitHubHeader github={message({ reading: true })} post={post} onPickAnother={() => {}} />);
  expect((screen.getByRole("button", { name: "Refresh" }) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<GitHubHeader github={message({ state: "loading", reading: true, linked: null, readAt: null })} post={post} onPickAnother={() => {}} />);
  expect(screen.getByText("Loading from GitHub…")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /GitHub Project/ })).toBeNull();
});

// These tests do not wait with Testing Library: bun's fake clock, used by another file of the suite, would not hand the waiting back (see the last test of `webview-team.test.tsx`).
test("the popover Change GitHub Project searches the Projects of the owner, checks the linked one and links another with its owner and number", () => {
  const { posted, post } = posting();
  render(<GitHubHeader github={message()} post={post} onPickAnother={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "GitHub Project: acme/web · Roadmap" }));
  expect(screen.getByText("Change GitHub Project")).not.toBeNull();
  expect(screen.getByPlaceholderText("Search Projects of acme…")).not.toBeNull();
  const items = screen.getAllByRole("option");
  expect(items.map((item) => item.textContent)).toEqual(["acme/web · RoadmapLinked", "acme/web · Bug triage", "acme · Platform Q4No Iteration field — add one on GitHub to use it", "Link another Project…", "Unlink"]);
  expect(items[2]?.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(items[1] as HTMLElement);
  expect(posted).toEqual([{ type: "linkGitHubProject", owner: "acme", number: 2 }]);
  expect(screen.queryByText("Change GitHub Project")).toBeNull();
});

test("Link another Project… opens the picker page and Unlink unlinks, both closing the popover; choosing the linked Project again does nothing", () => {
  const { posted, post } = posting();
  let picked = 0;
  render(<GitHubHeader github={message()} post={post} onPickAnother={() => void picked++} />);
  const open = () => {
    fireEvent.click(screen.getByRole("button", { name: "GitHub Project: acme/web · Roadmap" }));
    expect(screen.getByText("Change GitHub Project")).not.toBeNull();
  };
  open();
  fireEvent.click(screen.getByRole("option", { name: "Link another Project…" }));
  expect(picked).toBe(1);
  expect(screen.queryByText("Change GitHub Project")).toBeNull();
  open();
  fireEvent.click(screen.getAllByRole("option")[0] as HTMLElement);
  expect(posted).toEqual([]);
  expect(screen.queryByText("Change GitHub Project")).toBeNull();
  open();
  fireEvent.click(screen.getByRole("option", { name: "Unlink" }));
  expect(posted).toEqual([{ type: "unlinkGitHubProject" }]);
});

// ---- The boxes ----

test("gh not installed: the box names it, Install gh opens cli.github.com and Refresh reads again", () => {
  const { posted, post } = posting();
  render(<GitHubBanner github={message({ state: "not-installed", linked: null, error: "GitHub CLI is not installed" })} post={post} />);
  expect(screen.getByText("GitHub CLI is not installed")).not.toBeNull();
  expect(screen.getByText(/Install it, then select Refresh\./)).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Install gh" }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(posted).toEqual([{ type: "openLink", url: "https://cli.github.com" }, { type: "refreshTeam" }]);
});

test("not logged in: the box says what Trama will read and Log in to GitHub asks the host for the terminal", () => {
  const { posted, post } = posting();
  render(<GitHubBanner github={message({ state: "not-logged-in", error: "You're not logged in to GitHub" })} post={post} />);
  const box = screen.getByRole("status");
  expect(box.textContent).toContain("You're not logged in to GitHub");
  expect(box.textContent).toContain("Log in so Team can read acme/web · Roadmap and publish approved issues. This runs gh auth login in a terminal.");
  fireEvent.click(screen.getByRole("button", { name: "Log in to GitHub" }));
  expect(posted).toEqual([{ type: "logInGitHub" }]);
});

test("gh without access to Projects: Give access runs the refresh in a terminal", () => {
  const { posted, post } = posting();
  render(<GitHubBanner github={message({ state: "no-project-access", error: "gh returned errors: needs read:project" })} post={post} />);
  expect(screen.getByText("GitHub CLI can't read Projects")).not.toBeNull();
  expect(screen.getByRole("status").textContent).toContain("Give gh access to Projects. This runs gh auth refresh in a terminal.");
  fireEvent.click(screen.getByRole("button", { name: "Give access" }));
  expect(posted).toEqual([{ type: "logInGitHub" }]);
});

test("a read error shows the reason in monospace, how old the data on show is, Retry and Show details", () => {
  const { posted, post } = posting();
  const readAt = new Date(Date.now() - 3_600_000).toISOString();
  render(<GitHubBanner github={message({ state: "read-error", readAt, error: "gh exited with code 1: HTTP 502" })} post={post} />);
  const box = screen.getByRole("alert");
  expect(within(box).getByText("gh exited with code 1: HTTP 502").className).toContain("font-mono");
  expect(within(box).getByText("Showing data from 1 h ago.")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  expect(posted).toEqual([{ type: "refreshTeam" }, { type: "showGitHubDetails" }]);
});

test("a read error without data from before does not say how old it is; Retry waits while a read runs", () => {
  const { post } = posting();
  render(<GitHubBanner github={message({ state: "read-error", readAt: null, reading: true, error: "boom" })} post={post} />);
  expect(screen.queryByText(/Showing data from/)).toBeNull();
  expect((screen.getByRole("button", { name: "Retry" }) as HTMLButtonElement).disabled).toBe(true);
});

test("no box while the first read runs or when all is well", () => {
  const { post } = posting();
  const view = render(<GitHubBanner github={message({ state: "loading", readAt: null })} post={post} />);
  expect(view.container.textContent).toBe("");
  view.rerender(<GitHubBanner github={message()} post={post} />);
  expect(view.container.textContent).toBe("");
  view.rerender(<GitHubBanner github={null} post={post} />);
  expect(view.container.textContent).toBe("");
});

test("the skeleton says Loading from GitHub… to a reader and animates only without motion-reduce", () => {
  const view = render(<GitHubSkeleton />);
  expect(screen.getByText("Loading from GitHub…")).not.toBeNull();
  const blocks = view.container.querySelectorAll(".animate-pulse");
  expect(blocks.length).toBeGreaterThan(0);
  for (const block of blocks) expect(block.className).toContain("motion-reduce:animate-none");
});

// ---- The page to link a Project ----

test("Link a GitHub Project lists the Projects as radio rows, starts on the first usable one and links it", () => {
  const { posted, post } = posting();
  render(<LinkProjectPage github={message({ linked: null })} post={post} />);
  expect(screen.getByRole("heading", { name: "Link a GitHub Project" })).not.toBeNull();
  expect(screen.getByText("Team publishes issues to a Project and reads its sprints from the Iteration field.")).not.toBeNull();
  const radios = screen.getAllByRole("radio");
  expect(radios).toHaveLength(3);
  expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
  expect(screen.getByText("Iteration · Estimate · Priority fields")).not.toBeNull();
  expect((radios[2] as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("No Iteration field — add one on GitHub to use it")).not.toBeNull();
  fireEvent.click(radios[1] as HTMLElement);
  expect(radios[1]?.getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Link Project" }));
  expect(posted).toEqual([{ type: "linkGitHubProject", owner: "acme", number: 2 }]);
});

test("Create a Project on GitHub opens the owner's Projects page; Cancel is there only while another Project is linked", () => {
  const { posted, post } = posting();
  const view = render(<LinkProjectPage github={message({ linked: null })} post={post} />);
  fireEvent.click(screen.getByRole("button", { name: "Create a Project on GitHub" }));
  expect(posted).toEqual([{ type: "openLink", url: "https://github.com/acme?tab=projects" }]);
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  let cancelled = 0;
  view.rerender(<LinkProjectPage github={message()} post={post} onCancel={() => void cancelled++} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(cancelled).toBe(1);
});

test("with no Project of the owner the page says so and Link Project is unavailable; with only Projects without an iteration field too", () => {
  const { post } = posting();
  const view = render(<LinkProjectPage github={message({ linked: null, projects: [] })} post={post} />);
  expect(screen.getByText("No Projects found for acme.")).not.toBeNull();
  expect((screen.getByRole("button", { name: "Link Project" }) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<LinkProjectPage github={message({ linked: null, projects: [PLATFORM] })} post={post} />);
  expect((screen.getByRole("button", { name: "Link Project" }) as HTMLButtonElement).disabled).toBe(true);
});

// ---- In the page ----

test("the Team page puts the Project's button on the title's line and the box above the tabs", () => {
  const { post } = posting();
  render(<TeamPage team={null} rejection={null} post={post} github={message({ state: "read-error", error: "boom" })} />);
  const title = screen.getByRole("heading", { name: "Team" });
  expect(title.parentElement?.contains(screen.getByRole("button", { name: "GitHub Project: acme/web · Roadmap" }))).toBe(true);
  const box = screen.getByRole("alert");
  expect(box.compareDocumentPosition(screen.getByRole("tablist")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
