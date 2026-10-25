import { useEffect, useMemo, useRef } from "react";
import { cardLabel, noNumbers } from "../../../../src/core/card-names";
import type { AreaView, FragmentView, SectionView, Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import { FocusBar } from "../focus/bar";
import { type PageFocus, goTo, openPageFocus, scrollToStep, settle } from "../focus/page";
import { areaKey, requirementSteps, sectionKey } from "../focus/requirements";
import { focusSpec, neighbour, stepIndex } from "../focus/spec";
import { Markdown } from "../markdown";
import { CHANGE_BORDER, CHANGE_TEXT, CHANGE_TINT, FOCUS_MARK, ProposalSelect } from "../proposal-select";
import type { MountView } from "../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../lib/utils";
import { areasWith, visibleSections } from "./logic";

const CHANGE_LABEL: Record<SectionView["change"], string> = { added: "added", removed: "removed", changed: "changed", same: "" };
const AREA_LABEL: Record<AreaView["change"], string> = { added: "new Area", removed: "Area removed", modified: "", same: "" };
const FRAGMENT_LABEL: Record<FragmentView["change"], string> = { added: "new fragment", removed: "fragment removed", modified: "", same: "" };

/** The mark of a change: green when added, red when removed, amber when changed or moved. */
function changeTone(change: string): string {
  if (change === "added") return CHANGE_TEXT.added;
  if (change === "removed") return CHANGE_TEXT.removed;
  return CHANGE_TEXT.changed;
}

function ChangeBadge({ change, children }: { change: string; children: string }) {
  return (
    <Badge variant="outline" className={changeTone(change)}>
      {children}
    </Badge>
  );
}

export interface RequirementsProps {
  snapshot: Snapshot | null;
  proposalId: string | null;
  /** The focus of this tab, or null without one; the tab never keeps it itself. */
  focus: PageFocus | null;
  onProposal(id: string | null): void;
  onFocus(focus: PageFocus | null): void;
  navigate(view: "diagram", options: NavigateOptions): void;
  openFile(path: string): void;
  openLink(url: string): void;
}

/** What the page marks: the keys of the steps (sections, or Areas taken whole), the one the page is at, and whether the rest is hidden. */
interface FocusView {
  keys: ReadonlySet<string>;
  current: string | null;
  only: boolean;
}

/** The mark of an element of the focus: the colour of its change when it has one, otherwise cyan; the current step also gets the theme's ring. */
function focusClass(change: "added" | "removed" | "changed" | "same", current: boolean): string {
  return cn(change === "same" ? FOCUS_MARK : cn(CHANGE_BORDER[change], CHANGE_TINT[change]), current && "ring-2 ring-ring");
}

function Section({ area, section, props, view }: { area: AreaView; section: SectionView; props: RequirementsProps; view: FocusView | null }) {
  const key = sectionKey(area.id, section.ref);
  const tone = section.change !== "same" ? section.change : section.movedFrom !== null ? "changed" : "same";
  const marked = view !== null && view.keys.has(key);
  const border = marked ? focusClass(tone, view.current === key) : section.change === "same" ? "border-l-transparent" : CHANGE_BORDER[section.change];
  return (
    <section data-key={`${area.id}#${section.ref ?? "General"}`} data-step={key} data-focus={marked ? "true" : undefined} aria-current={marked && view.current === key ? "step" : undefined} className={cn("mt-2 border-l-[3px] py-1 pl-2.5", border)}>
      <div className="mb-1 flex items-center gap-2 font-semibold">
        {section.ref === null ? (
          <span>General</span>
        ) : (
          <Button variant="link" className="h-auto p-0 font-semibold" title={`Show ${section.ref} on the diagram`} onClick={() => props.navigate("diagram", { ref: section.ref ?? undefined })}>
            {section.ref}
          </Button>
        )}
        {section.movedFrom !== null ? <ChangeBadge change="moved">{`moved from ${section.movedFrom}`}</ChangeBadge> : null}
        {CHANGE_LABEL[section.change] ? <ChangeBadge change={section.change}>{CHANGE_LABEL[section.change]}</ChangeBadge> : null}
      </div>
      {section.change === "changed" && section.before !== null ? (
        <div className="mb-1 line-through opacity-60">
          <Markdown source={section.before} openLink={props.openLink} />
        </div>
      ) : null}
      <div className={section.change === "removed" ? "line-through opacity-70" : undefined}>
        {section.text ? <Markdown source={section.text} openLink={props.openLink} /> : <div>Empty.</div>}
      </div>
    </section>
  );
}

function Fragment({ area, fragment, sections, props, view }: { area: AreaView; fragment: FragmentView; sections: SectionView[]; props: RequirementsProps; view: FocusView | null }) {
  const border = fragment.change === "added" ? "border-t-green-600 dark:border-t-green-400" : fragment.change === "removed" ? "border-t-red-600 dark:border-t-red-400 opacity-75" : "";
  return (
    <section className={cn("mt-2.5 border-t pt-2", border)}>
      <header className="flex items-baseline gap-2">
        <h3 className="font-semibold">{fragment.title || fragment.id}</h3>
        <span className="text-sm text-muted-foreground">{`${fragment.id}.md`}</span>
        {FRAGMENT_LABEL[fragment.change] ? <ChangeBadge change={fragment.change}>{FRAGMENT_LABEL[fragment.change]}</ChangeBadge> : null}
        {fragment.change !== "removed" ? (
          <Button variant="link" className="ml-auto h-auto p-0" title={`Open .trama/${fragment.file}`} onClick={() => props.openFile(fragment.file)}>
            Open file
          </Button>
        ) : null}
      </header>
      {fragment.description ? (
        <div className="my-1 text-muted-foreground italic">
          <Markdown source={fragment.description} openLink={props.openLink} />
        </div>
      ) : null}
      {sections.length === 0 ? <p className="text-muted-foreground">No Requirements in this fragment yet.</p> : null}
      {sections.map((s) => (
        <Section key={s.ref ?? "General"} area={area} section={s} props={props} view={view} />
      ))}
    </section>
  );
}

function Area({ area, props, view }: { area: AreaView; props: RequirementsProps; view: FocusView | null }) {
  const key = areaKey(area.id);
  const whole = view !== null && view.keys.has(key);
  // `Only these` hides the sections out of the focus and the fragments and Areas left with none; an Area taken whole stays entire.
  const hides = view !== null && view.only && !whole;
  const fragments = area.fragments
    .map((fragment) => ({ fragment, sections: visibleSections(fragment.sections).filter((s) => !hides || view.keys.has(sectionKey(area.id, s.ref))) }))
    .filter((f) => !hides || f.sections.length > 0);
  if (hides && fragments.length === 0) return null;
  const border = area.change === "added" ? "border-green-600 dark:border-green-400" : area.change === "removed" ? "border-red-600 opacity-75 dark:border-red-400" : "";
  const tone = area.change === "added" ? "added" : area.change === "removed" ? "removed" : area.change === "modified" ? "changed" : "same";
  return (
    <Card data-area={area.id} data-step={key} data-focus={whole ? "true" : undefined} aria-current={whole && view.current === key ? "step" : undefined} className={cn("px-0", border)}>
      <CardHeader className={cn("flex-row items-center gap-2", whole && cn("border-l-[3px]", focusClass(tone, view.current === key)))}>
        <CardTitle className="text-lg">{area.title || area.id}</CardTitle>
        <code className="text-sm text-muted-foreground">{`requirements/${area.id}`}</code>
        {AREA_LABEL[area.change] ? <ChangeBadge change={area.change}>{AREA_LABEL[area.change]}</ChangeBadge> : null}
        <Button variant="outline" size="sm" className="ml-auto" title={`Open .trama/${area.file}`} onClick={() => props.openFile(area.file)}>
          Open file
        </Button>
      </CardHeader>
      <CardContent>
        {area.description ? (
          <div className="mb-2 text-muted-foreground italic">
            <Markdown source={area.description} openLink={props.openLink} />
          </div>
        ) : null}
        {area.fragments.length === 0 ? <p className="text-muted-foreground">No fragments.</p> : null}
        {area.intro ? <Markdown source={area.intro} openLink={props.openLink} /> : null}
        {fragments.map((f) => (
          <Fragment key={f.fragment.id} area={area} fragment={f.fragment} sections={f.sections} props={props} view={view} />
        ))}
      </CardContent>
    </Card>
  );
}

/** The Requirement Areas, read-only, all of them always; a selected Proposal is drawn over them and a focus marks its sections. */
export function RequirementsTab(props: RequirementsProps) {
  const { snapshot, focus } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const found = useMemo(() => {
    const spec = snapshot && focus ? focusSpec(snapshot, focus.request) : null;
    return snapshot && spec ? { spec, ...requirementSteps(snapshot, spec) } : null;
  }, [snapshot, focus?.request]);
  const nonce = focus?.nonce;
  const step = focus?.step ?? null;
  useEffect(() => {
    if (scroller.current && step !== null) scrollToStep(scroller.current, step);
  }, [nonce]);

  if (!snapshot) return null;
  const proposal = snapshot.proposals.find((p) => p.id === props.proposalId);
  const numbers = snapshot.numbers ?? noNumbers;
  const options = snapshot.proposals.filter((p) => p.areas.length > 0).map((p) => ({ id: p.id, label: `${cardLabel(numbers, "proposal", p.id)} ${p.title}` }));
  const areas = areasWith(snapshot, proposal);
  const at = found && focus ? stepIndex(found.steps, focus.step) : -1;
  const view: FocusView | null = found && focus ? { keys: new Set(found.steps.map((s) => s.key)), current: found.steps[at]?.key ?? null, only: focus.only } : null;
  const move = (delta: -1 | 1) => {
    const next = found && focus ? neighbour(found.steps, focus.step, delta) : null;
    if (focus && next) props.onFocus(goTo(focus, next.key));
  };
  return (
    <div
      tabIndex={-1}
      className="flex h-full min-h-0 flex-col outline-none"
      onKeyDown={(event) => {
        // A modal, drop-down, popover or tooltip that is open takes the Esc first and marks the event handled.
        if (event.key === "Escape" && focus && !event.defaultPrevented) props.onFocus(null);
      }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <ProposalSelect label="Proposal to draw over the Requirements" options={options} value={proposal ? proposal.id : null} focused={focus !== null} onChange={props.onProposal} />
      </div>
      {found && focus ? (
        <FocusBar
          title={found.spec.title}
          stepName={found.steps[at]?.name ?? ""}
          index={at}
          count={found.steps.length}
          missing={found.missing}
          onPrevious={() => move(-1)}
          onNext={() => move(1)}
          onClear={() => props.onFocus(null)}
          only={{ pressed: focus.only, onToggle: () => props.onFocus({ ...focus, only: !focus.only }) }}
        />
      ) : null}
      <div ref={scroller} className="flex max-w-4xl min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        {areas.length === 0 ? (
          <p className="text-muted-foreground">No Requirement Areas in .trama/requirements/. Run “trama project edit” to create the starting ones.</p>
        ) : view?.only && found?.steps.length === 0 ? (
          <p className="text-muted-foreground">Nothing in the focus.</p>
        ) : (
          areas.map((area) => <Area key={area.id} area={area} props={props} view={view} />)
        )}
      </div>
    </div>
  );
}

/** Read-only list of the Requirement Areas. Editing happens in the files; a selected Proposal is drawn over them. */
export const mountRequirements: MountView = (slot, context) => {
  let snapshot: Snapshot | null = null;
  let proposalId: string | null = null;
  let focus: PageFocus | null = null;

  /** A focus whose Proposal is no longer open (or whose Task is gone) ends, the tab back on the Model without a Proposal; any other stays at its step while it exists, else goes to the first. */
  function settleFocus() {
    if (!focus || !snapshot) return;
    const spec = focusSpec(snapshot, focus.request);
    if (!spec) {
      if (focus.request.kind === "proposal") proposalId = null;
      focus = null;
      return;
    }
    focus = settle(focus, requirementSteps(snapshot, spec).steps);
  }

  function render() {
    slot(
      <RequirementsTab
        snapshot={snapshot}
        proposalId={proposalId}
        focus={focus}
        onProposal={(id) => {
          // With a focus on the Proposal drawn stays until Clear or Esc takes the focus off.
          if (focus) return;
          proposalId = id;
          render();
        }}
        onFocus={(next) => {
          focus = next;
          render();
        }}
        navigate={(view, options) => context.navigate(view, options)}
        openFile={(path) => context.post({ type: "openFile", path })}
        openLink={context.openLink}
      />,
    );
  }

  return {
    update(next) {
      snapshot = next;
      settleFocus();
      render();
    },
    show(options: NavigateOptions) {
      if (options.focus) {
        // A new focus replaces the old one and the Proposal drawn: only a Proposal's focus draws one.
        focus = openPageFocus(options.focus);
        proposalId = options.focus.kind === "proposal" ? options.focus.id : null;
        settleFocus();
      } else if (options.proposal !== undefined) proposalId = options.proposal;
      render();
    },
  };
};
