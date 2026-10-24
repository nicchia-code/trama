import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ToHost } from "../extension/src/protocol";
import { createDiagramStore } from "../extension/src/webview/diagram/state";
import { DiagramDetails } from "../extension/src/webview/diagram/panel";
import { TooltipProvider } from "../extension/src/webview/ui/tooltip";
import type { ViewContext } from "../extension/src/webview/types";
import { shopWithProposals } from "./diagram-fixture";

afterEach(cleanup);

const snapshot = shopWithProposals();

function setup() {
  const store = createDiagramStore();
  const posted: ToHost[] = [];
  const navigated: string[] = [];
  const context: ViewContext = { post: (m) => posted.push(m), navigate: (view) => navigated.push(view), openLink: () => {} };
  store.update(snapshot, null, false);
  render(
    <TooltipProvider>
      <DiagramDetails store={store} context={context} />
    </TooltipProvider>,
  );
  return { store, posted, navigated };
}

test("selecting an element shows its details, and selecting nothing shows the level again", () => {
  const { store } = setup();
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(snapshot.system.name);
  act(() => store.navigateRef("order/Paid"));
  expect(store.get().selected).not.toBeNull();
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Paid");
  act(() => store.select(null));
  expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe("Paid");
});

test("an open Drift shows its two sides and Dismiss Drift asks the host to dismiss it", () => {
  const { store, posted } = setup();
  const drift = snapshot.drifts.find((d) => d.refs.includes("order/Shipped"));
  expect(drift).toBeDefined();
  act(() => store.navigateDrift(drift?.id ?? ""));
  expect(screen.getByText("What happens")).not.toBeNull();
  expect(screen.getByText("What should happen")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss Drift" }));
  expect(posted).toEqual([{ type: "dismissDrift", id: drift?.id ?? "" }]);
});

test("a unified Drift shows its badge, a Unifies list and no buttons; a merged Drift shows Unified and where it went", () => {
  const base = snapshot.drifts.find((d) => d.refs.includes("order/Shipped"));
  expect(base).toBeDefined();
  const merged = { ...base!, id: "mergedA1", title: "Merged one", refs: ["order/Shipped"], unifiedInto: { id: "unifiedU1", title: "The unified one" } };
  const unified = { ...base!, id: "unifiedU1", title: "The unified one", refs: ["order/Shipped"], unifies: [{ id: "mergedA1", title: "Merged one" }], previous: [{ id: "p1", title: "Earlier", decision: "fix-code" as const }, { id: "p2", title: "Before", decision: "dismissed" as const }] };
  const store = createDiagramStore();
  store.update({ ...snapshot, drifts: [unified], unifiedDrifts: [merged] }, null, false);
  render(
    <TooltipProvider>
      <DiagramDetails store={store} context={{ post: () => {}, navigate: () => {}, openLink: () => {} }} />
    </TooltipProvider>,
  );
  act(() => store.navigateDrift("unifiedU1"));
  expect(screen.getByLabelText("Unifies 1 Drifts").textContent).toBe("unified");
  expect(screen.getByLabelText("Recurring: follows 2 Drifts").textContent).toBe("recurring");
  expect(screen.getByText("Earlier")).not.toBeNull();
  expect(screen.getByText("Code fixed")).not.toBeNull();
  expect(screen.getByText("Closed, nothing changes")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Merged one/ }));
  expect(screen.getByText("Unified")).not.toBeNull();
  expect(screen.queryByRole("button", { name: "Dismiss Drift" })).toBeNull();
  expect(screen.getByRole("button", { name: /Unified into/ }).textContent).toContain("The unified one");
  fireEvent.click(screen.getByRole("button", { name: /Unified into/ }));
  expect(screen.getByLabelText("Unifies 1 Drifts")).not.toBeNull();
});

test("a drawn Proposal shows Approve and Reject on what it changes, and they send the decision", () => {
  const { store, posted } = setup();
  const proposal = snapshot.proposals.find((p) => p.title === "Returns after shipping");
  expect(proposal).toBeDefined();
  act(() => store.chooseProposal(proposal?.id ?? null));
  act(() => store.navigateRef("order/Returned"));
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  expect(posted).toEqual([{ type: "rejectProposal", id: proposal?.id ?? "" }]);
  const approve = screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement;
  expect(approve.disabled).toBe(false);
  fireEvent.click(approve);
  expect(posted.at(-1)).toEqual({ type: "approveProposal", id: proposal?.id ?? "" });
});

test("the arrows of Dismiss Drift and Reject open Rework with feedback in the details", async () => {
  const { store, posted } = setup();
  const drift = snapshot.drifts.find((d) => d.refs.includes("order/Shipped"));
  act(() => store.navigateDrift(drift?.id ?? ""));
  const arrow = screen.getByRole("button", { name: /^More ways to handle / });
  arrow.focus();
  fireEvent.keyDown(arrow, { key: "Enter" });
  const rework = await screen.findByRole("menuitem", { name: "Rework with feedback…" });
  expect([rework.getAttribute("aria-description"), rework.hasAttribute("title")]).toEqual(["Have the agent resolve this Drift following your feedback", false]);
  fireEvent.click(rework);
  expect(posted).toEqual([{ type: "reworkDrift", drift: drift?.id ?? "" }]);
  cleanup();
  const again = setup();
  const proposal = snapshot.proposals.find((p) => p.title === "Returns after shipping");
  act(() => again.store.chooseProposal(proposal?.id ?? null));
  act(() => again.store.navigateRef("order/Returned"));
  const reject = screen.getByRole("button", { name: /^More ways to reject / });
  reject.focus();
  fireEvent.keyDown(reject, { key: "Enter" });
  const reworkProposal = await screen.findByRole("menuitem", { name: "Rework with feedback…" });
  expect([reworkProposal.getAttribute("aria-description"), reworkProposal.hasAttribute("title")]).toEqual(["Reject it and have the agent redo it with your feedback", false]);
  fireEvent.click(reworkProposal);
  expect(again.posted).toEqual([{ type: "reworkProposal", proposal: proposal?.id ?? "" }]);
});

test("the Tasks of a Proposal show their image previews behind Show details, and a click asks the host to open the image", () => {
  const target = snapshot.proposals.find((p) => p.title === "Returns after shipping");
  const withImages = {
    ...snapshot,
    proposals: snapshot.proposals.map((p) =>
      p.id === target?.id
        ? {
            ...p,
            tasks: [
              { id: "aaaaaaaa", title: "Draw it", body: "", technical: true, refs: [], images: [{ name: "a.png", path: "/x/a.png", uri: "https://webview/a.png" }, { name: "gone.png", path: "/x/gone.png" }] },
              { id: "bbbbbbbb", title: "Plain", body: "", technical: true, refs: [], images: [] },
            ],
          }
        : p,
    ),
  };
  const store = createDiagramStore();
  const posted: ToHost[] = [];
  store.update(withImages, null, false);
  render(
    <TooltipProvider>
      <DiagramDetails store={store} context={{ post: (m) => posted.push(m), navigate: () => {}, openLink: () => {} }} />
    </TooltipProvider>,
  );
  act(() => store.chooseProposal(target?.id ?? null));
  act(() => store.navigateRef("order/Returned"));
  // Only the Task with an image has the toggle, even with no body; the image shows after it is opened.
  const toggles = screen.getAllByRole("button", { name: "Show details" });
  expect(toggles).toHaveLength(1);
  expect(screen.queryByRole("button", { name: /^Open image / })).toBeNull();
  fireEvent.click(toggles[0] as HTMLElement);
  const preview = screen.getByRole("button", { name: "Open image a.png" });
  expect(preview.querySelector("img")?.getAttribute("src")).toBe("https://webview/a.png");
  expect(screen.queryByRole("button", { name: "Open image gone.png" })).toBeNull();
  fireEvent.click(preview);
  expect(posted).toEqual([{ type: "openTaskImage", task: "aaaaaaaa", name: "a.png" }]);
});
