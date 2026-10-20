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
