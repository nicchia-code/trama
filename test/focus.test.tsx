import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { Snapshot, TaskView } from "../src/core/snapshot";
import { EMPTY_SPECS, type Specs } from "../src/core/specs";
import type { FocusRequest } from "../extension/src/protocol";
import { fitView } from "../extension/src/webview/diagram/canvas";
import { createDiagramStore } from "../extension/src/webview/diagram/state";
import { buildScene } from "../extension/src/webview/diagram/scene";
import { FocusBar } from "../extension/src/webview/focus/bar";
import { diagramSteps } from "../extension/src/webview/focus/diagram";
import { type PageFocus, openPageFocus, settle } from "../extension/src/webview/focus/page";
import { requirementSteps } from "../extension/src/webview/focus/requirements";
import { type FocusSpec, focusSpec } from "../extension/src/webview/focus/spec";
import { specsSteps } from "../extension/src/webview/focus/specs";
import { focusStepCount } from "../extension/src/webview/focus/steps";
import { RequirementsTab } from "../extension/src/webview/requirements";
import { SpecsTab } from "../extension/src/webview/specs";
import { shopSnapshot, shopWithProposals } from "./diagram-fixture";

afterEach(cleanup);

const shop = shopSnapshot();
const withTask = (refs: string[], base: Snapshot = shop): Snapshot => ({ ...base, tasks: [{ id: "t1", title: "Do it", refs } as unknown as TaskView] });
const specsWith = (over: Partial<Specs["lists"]>): Specs => ({ lists: { ...EMPTY_SPECS.lists, ...over } as Specs["lists"], notes: "" });
const entry = (name: string) => ({ name, version: null, note: null, chosenByAgent: null });
const spec = (snapshot: Snapshot, request: FocusRequest) => focusSpec(snapshot, request) as FocusSpec;

describe("steps", () => {
  test("the Diagram has a step for each level that shows elements of the focus, in the order of the Model; Areas, General sections and Specs are neither steps nor missing", () => {
    const refs = ["checkout", "order/Paid", "payment/Nope", "requirements/ui#General", "requirements/ui", "specs#ci", "requirements/ui#order/Paid", "user.CANCEL"];
    const { steps, missing } = diagramSteps(buildScene(shop, null), refs);
    expect(steps.map((s) => s.key)).toEqual(["actor:user", "feature:checkout", "machine:order"]);
    expect(steps.map((s) => s.name)).toEqual(["System › user", "checkout", "order"]);
    expect(steps[0]?.refs).toEqual(["user.CANCEL"]);
    expect(steps[1]?.refs).toEqual(["checkout", "cart", "order", "payment"]);
    expect(steps[2]?.refs).toEqual(["order/Paid"]);
    expect(missing).toEqual(["payment/Nope"]);
  });

  test("a Machine and its Events sit at the level of their Feature, a State and its Transitions at the level of their Machine", () => {
    const { steps } = diagramSteps(buildScene(shop, null), ["order", "order/Paid/user.CANCEL", "payment", "order.CONFIRMED"]);
    expect(steps.map((s) => s.key)).toEqual(["feature:checkout", "machine:order"]);
    expect(steps[0]?.refs).toEqual(["order", "payment", "order.CONFIRMED"]);
  });

  test("the Requirements of a Task are the sections it names, the Areas it names, and the sections titled to each element it names or to what it contains, but not to its containers", () => {
    const named = requirementSteps(shop, spec(withTask(["requirements/data#payment", "requirements/ui"]), { kind: "task", id: "t1" }));
    expect(named.steps.map((s) => s.key)).toEqual(["data#payment", "ui"]);
    const element = requirementSteps(shop, spec(withTask(["order"]), { kind: "task", id: "t1" }));
    expect(element.steps.map((s) => s.key)).toEqual(["data#order", "ui#order/paid"]);
    const state = requirementSteps(shop, spec(withTask(["order/Paid"]), { kind: "task", id: "t1" }));
    expect(state.steps.map((s) => s.key)).toEqual(["ui#order/paid"]);
  });

  test("a reference with nothing behind it is missing; an element with no section only adds no step", () => {
    const { steps, missing } = requirementSteps(shop, spec(withTask(["requirements/ui#nope", "requirements/zzz", "ghost", "order/Draft"]), { kind: "task", id: "t1" }));
    expect(steps).toEqual([]);
    expect(missing).toEqual(["requirements/ui#nope", "requirements/zzz", "ghost"]);
  });

  test("the Specs steps are the fields the references name, `specs` meaning every field; an empty field is missing", () => {
    const snapshot = { ...withTask(["specs#languages", "specs#ci", "specs#bogus"]), specs: specsWith({ languages: [entry("TypeScript")] }), specsPresent: true } as Snapshot;
    const result = specsSteps(snapshot, spec(snapshot, { kind: "task", id: "t1" }));
    expect(result.steps.map((s) => s.field)).toEqual(["languages"]);
    expect(result.missing).toEqual(["specs#ci", "specs#bogus"]);
    const all = specsSteps(snapshot, spec(snapshot, { kind: "ref", ref: "specs" }));
    expect(all.steps.map((s) => s.field)).toEqual(["languages"]);
  });

  test("a View button needs at least one step on its tab; a Proposal is counted on the Model drawn with it", () => {
    const task = withTask(["order/Paid"]);
    expect(focusStepCount(task, { kind: "task", id: "t1" }, "diagram")).toBe(1);
    expect(focusStepCount(task, { kind: "task", id: "t1" }, "requirements")).toBe(1);
    expect(focusStepCount(task, { kind: "task", id: "t1" }, "specs")).toBe(0);
    expect(focusStepCount(task, { kind: "task", id: "gone" }, "diagram")).toBe(0);
    const snapshot = shopWithProposals();
    const returns = snapshot.proposals.find((p) => p.title === "Returns after shipping");
    expect(focusStepCount(snapshot, { kind: "proposal", id: returns?.id ?? "" }, "diagram")).toBeGreaterThan(1);
    expect(focusStepCount(snapshot, { kind: "proposal", id: returns?.id ?? "" }, "specs")).toBe(0);
  });
});

describe("Diagram focus", () => {
  const snapshot = shopWithProposals();
  const returns = snapshot.proposals.find((p) => p.title === "Returns after shipping");
  const setup = () => {
    const store = createDiagramStore();
    store.update(snapshot, null);
    store.focusOn({ kind: "proposal", id: returns?.id ?? "" });
    return store;
  };

  test("steps go to the previous or the next level, never beyond the first or the last", () => {
    const store = setup();
    const steps = store.get().focus?.steps ?? [];
    expect(steps.length).toBeGreaterThan(1);
    expect(store.get().focus?.index).toBe(0);
    store.stepFocus(-1);
    expect(store.get().focus?.index).toBe(0);
    for (let i = 0; i < steps.length + 2; i++) store.stepFocus(1);
    expect(store.get().focus?.index).toBe(steps.length - 1);
    expect(store.get().level).toEqual(steps.at(-1)?.level ?? { kind: "system" });
    expect(store.get().fitTo?.length).toBeGreaterThan(0);
  });

  test("a step slides the view to its elements; Fit and a link to an element jump, and none of them touches the focus", () => {
    const store = setup();
    store.stepFocus(1);
    expect(store.get().fitSmooth).toBe(true);
    expect(store.get().fitTo?.length).toBeGreaterThan(0);
    const { focus } = store.get();
    store.refit();
    expect(store.get().fitSmooth).toBe(false);
    expect(store.get().fitTo).toBeNull();
    expect(store.get().focus?.index).toBe(focus?.index);
    store.stepFocus(-1);
    expect(store.get().fitSmooth).toBe(true);
    store.navigateRef("order");
    expect(store.get().fitSmooth).toBe(false);
    expect(store.get().focus).not.toBeNull();
  });

  test("the view that contains a step is centred on it and never zooms in beyond the limit of Fit", () => {
    const size = { width: 800, height: 600 };
    const big = fitView({ x1: 0, y1: 0, x2: 1600, y2: 300 }, size, 36);
    expect(big.zoom).toBeCloseTo((800 - 72) / 1600);
    expect(big.pan.x).toBeCloseTo(400 - 800 * big.zoom);
    expect(big.pan.y).toBeCloseTo(300 - 150 * big.zoom);
    const small = fitView({ x1: 100, y1: 100, x2: 140, y2: 120 }, size, 36);
    expect(small.zoom).toBe(1.2);
    expect(small.pan.x).toBeCloseTo(400 - 120 * 1.2);
    expect(small.pan.y).toBeCloseTo(300 - 110 * 1.2);
  });

  test("a level opened by hand with none of the focus has no current step, and Previous and Next go to the first and the last", () => {
    const store = setup();
    const steps = store.get().focus?.steps ?? [];
    store.setLevel({ kind: "machine", machine: "cart" });
    expect(store.get().focus).not.toBeNull();
    expect(store.get().focus?.index).toBe(-1);
    expect(store.get().focus?.highlight).toEqual([]);
    store.stepFocus(1);
    expect(store.get().level).toEqual(steps.at(-1)?.level ?? { kind: "system" });
    store.setLevel({ kind: "machine", machine: "cart" });
    store.stepFocus(-1);
    expect(store.get().level).toEqual(steps[0]?.level ?? { kind: "system" });
  });

  test("Clear keeps the level, the position and the Proposal drawn; choosing a Proposal in the selector is ignored while the focus is on", () => {
    const store = setup();
    store.stepFocus(1);
    const { level, proposalId } = store.get();
    store.clearFocus();
    expect(store.get().focus).toBeNull();
    expect(store.get().level).toEqual(level);
    expect(store.get().proposalId).toBe(proposalId);
    store.focusOn({ kind: "proposal", id: returns?.id ?? "" });
    const { index } = store.get().focus ?? { index: -1 };
    store.chooseProposal(null);
    expect(store.get().proposalId).toBe(returns?.id ?? null);
    expect(store.get().focusRequest).not.toBeNull();
    expect(store.get().focus?.index).toBe(index);
    store.clearFocus();
    store.chooseProposal(null);
    expect(store.get().proposalId).toBeNull();
  });

  test("a new focus replaces the old one and the Proposal drawn; a Task's or a chip's draws none", () => {
    const store = setup();
    expect(store.get().proposalId).toBe(returns?.id ?? null);
    store.focusOn({ kind: "ref", ref: "order/Paid" });
    expect(store.get().proposalId).toBeNull();
    expect(store.get().focus?.title).toBe("order/Paid");
    expect(store.get().selected).not.toBeNull();
  });

  test("when the Proposal is no longer open the focus ends and the tab goes back to the Model without a Proposal", () => {
    const store = setup();
    store.update({ ...snapshot, proposals: snapshot.proposals.filter((p) => p.id !== returns?.id) }, null);
    expect(store.get().focus).toBeNull();
    expect(store.get().proposalId).toBeNull();
  });

  test("a changed picture keeps the focus at the step it was on while that exists", () => {
    const store = setup();
    store.stepFocus(1);
    const level = store.get().level;
    store.update({ ...snapshot }, null);
    expect(store.get().level).toEqual(level);
    expect(store.get().focus?.index).toBe(1);
  });
});

describe("FocusBar", () => {
  const bar = (over: Partial<Parameters<typeof FocusBar>[0]> = {}) => {
    const calls: string[] = [];
    render(<FocusBar title="Task T3 – Do it" stepName="order" index={0} count={3} missing={[]} onPrevious={() => calls.push("previous")} onNext={() => calls.push("next")} onClear={() => calls.push("clear")} {...over} />);
    return calls;
  };

  test("shows the focus, the step, the counter, arrows disabled at the ends, and Clear", () => {
    const calls = bar();
    expect(screen.getByText("Task T3 – Do it")).not.toBeNull();
    expect(screen.getByText("order")).not.toBeNull();
    expect(screen.getByText("1 of 3")).not.toBeNull();
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(calls).toEqual(["next", "clear"]);
  });

  test("a single step has neither counter nor arrows; a level with none of the focus counts `– of N`", () => {
    bar({ count: 1 });
    expect(screen.queryByText(/ of /)).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    cleanup();
    bar({ index: -1, stepName: "" });
    expect(screen.getByText("– of 3")).not.toBeNull();
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  });

  test("says how many references are not found and offers Only these only where it applies", () => {
    bar({ missing: ["a", "b"], only: { pressed: true, onToggle: () => {} } });
    expect(screen.getByText("2 not found")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Only these" }).getAttribute("aria-pressed")).toBe("true");
    cleanup();
    bar();
    expect(screen.queryByRole("button", { name: "Only these" })).toBeNull();
  });
});

describe("Requirements focus", () => {
  const snapshot = withTask(["requirements/data#order", "requirements/data#payment", "requirements/ui#order/Paid"]);
  const request: FocusRequest = { kind: "task", id: "t1" };

  function Harness({ initial }: { initial: PageFocus | null }) {
    const [focus, setFocus] = useState<PageFocus | null>(initial);
    return <RequirementsTab snapshot={snapshot} proposalId={null} focus={focus} onProposal={() => {}} onFocus={setFocus} navigate={() => {}} openFile={() => {}} openLink={() => {}} />;
  }
  const open = () => settle(openPageFocus(request), requirementSteps(snapshot, spec(snapshot, request)).steps);

  test("every Area stays visible, the sections of the focus are marked and the current one is the step", () => {
    const { container } = render(<Harness initial={open()} />);
    expect(container.querySelectorAll("[data-area]").length).toBe(2);
    expect([...container.querySelectorAll("[data-focus]")].map((el) => el.getAttribute("data-step"))).toEqual(["data#order", "data#payment", "ui#order/paid"]);
    expect(container.querySelector("[aria-current='step']")?.getAttribute("data-step")).toBe("data#order");
    expect(screen.getByText("1 of 3")).not.toBeNull();
    expect(screen.getByText("Task t1 – Do it")).not.toBeNull();
  });

  test("Next and Previous move the current step and stop at the ends", () => {
    const { container } = render(<Harness initial={open()} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("3 of 3")).not.toBeNull();
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector("[aria-current='step']")?.getAttribute("data-step")).toBe("ui#order/paid");
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("2 of 3")).not.toBeNull();
  });

  test("Only these hides the sections outside the focus and the Areas and fragments left with none, and shows them again when pressed again", () => {
    const { container } = render(<Harness initial={open()} />);
    const pressed = () => screen.getByRole("button", { name: "Only these" });
    expect(pressed().getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(pressed());
    expect(pressed().getAttribute("aria-pressed")).toBe("true");
    expect([...container.querySelectorAll("section[data-step]")].map((el) => el.getAttribute("data-step"))).toEqual(["data#order", "data#payment", "ui#order/paid"]);
    fireEvent.click(pressed());
    expect(container.querySelectorAll("section[data-step]").length).toBeGreaterThan(3);
  });

  test("Clear and Esc take the focus off, and an Esc already used by a popup does not", () => {
    const { container } = render(<Harness initial={open()} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(container.querySelector("[data-focus]")).toBeNull();
    expect(screen.queryByRole("region", { name: "Focus" })).toBeNull();
    cleanup();
    render(<Harness initial={open()} />);
    const button = screen.getByRole("button", { name: "Next" });
    // A popup that is open handles Esc in the capture phase and marks the event as handled.
    document.addEventListener("keydown", (e) => e.preventDefault(), { once: true, capture: true });
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Focus" })).not.toBeNull();
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Focus" })).toBeNull();
  });
});

describe("the Proposal selector during a focus", () => {
  const drawn = shopWithProposals();
  // Only a Proposal that touches the Requirements is offered by their selector.
  const withProposals = withTask(["requirements/data#order"], { ...drawn, proposals: drawn.proposals.map((p) => ({ ...p, areas: drawn.areas.filter((a) => a.id === "data") })) });
  const request: FocusRequest = { kind: "task", id: "t1" };
  const requirementsSelector = () => screen.getByRole("combobox", { name: "Proposal to draw over the Requirements" }) as HTMLButtonElement;
  const specsSelector = () => screen.getByRole("combobox", { name: "Proposal to draw over the Specs" }) as HTMLButtonElement;

  test("Requirements: disabled while a focus is on, enabled again after Clear", () => {
    function Harness() {
      const [focus, setFocus] = useState<PageFocus | null>(settle(openPageFocus(request), requirementSteps(withProposals, spec(withProposals, request)).steps));
      return <RequirementsTab snapshot={withProposals} proposalId={null} focus={focus} onProposal={() => {}} onFocus={setFocus} navigate={() => {}} openFile={() => {}} openLink={() => {}} />;
    }
    render(<Harness />);
    expect(requirementsSelector().disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(requirementsSelector().disabled).toBe(false);
  });

  test("Specs: disabled while a focus is on, enabled without one", () => {
    const snapshot = { ...withTask(["specs#ci"], shopWithProposals()), specs: specsWith({ ci: [entry("GitHub Actions")] }), specsPresent: true } as Snapshot;
    const focus = settle(openPageFocus(request), specsSteps(snapshot, spec(snapshot, request)).steps);
    render(<SpecsTab snapshot={snapshot} proposalId={null} focus={focus} onProposal={() => {}} onFocus={() => {}} openLink={() => {}} />);
    expect(specsSelector().disabled).toBe(true);
    cleanup();
    render(<SpecsTab snapshot={snapshot} proposalId={null} focus={null} onProposal={() => {}} onFocus={() => {}} openLink={() => {}} />);
    expect(specsSelector().disabled).toBe(false);
  });
});

describe("Specs focus", () => {
  test("the field of the focus is marked with the bar above the page", () => {
    const snapshot = { ...withTask(["specs#ci"]), specs: specsWith({ languages: [entry("TypeScript")], ci: [entry("GitHub Actions")] }), specsPresent: true } as Snapshot;
    const request: FocusRequest = { kind: "task", id: "t1" };
    const focus = settle(openPageFocus(request), specsSteps(snapshot, spec(snapshot, request)).steps);
    const { container } = render(<SpecsTab snapshot={snapshot} proposalId={null} focus={focus} onProposal={() => {}} onFocus={() => {}} openLink={() => {}} />);
    expect([...container.querySelectorAll("[data-focus]")].map((el) => el.getAttribute("data-step"))).toEqual(["ci"]);
    expect(container.querySelector("[aria-current='step']")?.getAttribute("data-step")).toBe("ci");
    expect(screen.queryByText(/ of /)).toBeNull();
  });
});
