import { cardLabel, noNumbers } from "../../../../src/core/card-names";
import type { AreaView, FragmentView, SectionView, Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import { Markdown } from "../markdown";
import { CHANGE_BORDER, CHANGE_TEXT, ProposalSelect } from "../proposal-select";
import type { MountView } from "../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../lib/utils";
import { areasWith, parseTarget, sectionMatches, visibleSections } from "./logic";

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
  /** A Model reference or `requirements/<area>[#section]` to focus on. */
  target: string | null;
  onProposal(id: string | null): void;
  onTarget(target: string | null): void;
  navigate(view: "diagram", options: NavigateOptions): void;
  openFile(path: string): void;
  openLink(url: string): void;
}

function Section({ area, section, props }: { area: AreaView; section: SectionView; props: RequirementsProps }) {
  const border = section.change === "same" ? "border-l-transparent" : CHANGE_BORDER[section.change];
  return (
    <section data-key={`${area.id}#${section.ref ?? "General"}`} className={cn("mt-2 border-l-[3px] py-1 pl-2.5", border)}>
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

function Fragment({ area, fragment, sections, props }: { area: AreaView; fragment: FragmentView; sections: SectionView[]; props: RequirementsProps }) {
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
        <Section key={s.ref ?? "General"} area={area} section={s} props={props} />
      ))}
    </section>
  );
}

function Area({ area, props }: { area: AreaView; props: RequirementsProps }) {
  const focus = props.target ? parseTarget(props.target) : null;
  if (focus?.area && focus.area !== area.id) return null;
  const fragments = area.fragments
    .map((fragment) => ({ fragment, sections: visibleSections(fragment.sections).filter((s) => !focus?.section || sectionMatches(s.ref, focus.section)) }))
    .filter((f) => !focus?.section || f.sections.length > 0);
  if (focus?.section && fragments.length === 0) return null;
  const border = area.change === "added" ? "border-green-600 dark:border-green-400" : area.change === "removed" ? "border-red-600 opacity-75 dark:border-red-400" : "";
  return (
    <Card data-area={area.id} className={cn("px-0", border)}>
      <CardHeader className="flex-row items-center gap-2">
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
          <Fragment key={f.fragment.id} area={area} fragment={f.fragment} sections={f.sections} props={props} />
        ))}
      </CardContent>
    </Card>
  );
}

/** The Requirement Areas, read-only; a selected Proposal is drawn over them. */
export function RequirementsTab(props: RequirementsProps) {
  const { snapshot, target } = props;
  if (!snapshot) return null;
  const proposal = snapshot.proposals.find((p) => p.id === props.proposalId);
  const numbers = snapshot.numbers ?? noNumbers;
  const options = snapshot.proposals.filter((p) => p.areas.length > 0).map((p) => ({ id: p.id, label: `${cardLabel(numbers, "proposal", p.id)} ${p.title}` }));
  const areas = areasWith(snapshot, proposal);
  const shown = areas.filter((area) => {
    const focus = target ? parseTarget(target) : null;
    if (focus?.area && focus.area !== area.id) return false;
    if (!focus?.section) return true;
    return area.fragments.some((f) => visibleSections(f.sections).some((s) => sectionMatches(s.ref, focus.section ?? "")));
  });
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <ProposalSelect label="Proposal to draw over the Requirements" options={options} value={proposal ? proposal.id : null} onChange={props.onProposal} />
        {target ? (
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">{`Showing ${target}`}</span>
            <Button variant="link" className="h-auto p-0" title="Show every Area" onClick={() => props.onTarget(null)}>
              Show all
            </Button>
          </span>
        ) : null}
      </div>
      <div className="flex max-w-4xl min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        {areas.length === 0 ? (
          <p className="text-muted-foreground">No Requirement Areas in .trama/requirements/. Run “trama project edit” to create the starting ones.</p>
        ) : shown.length === 0 ? (
          <p className="text-muted-foreground">{`No Requirements for ${target}.`}</p>
        ) : (
          areas.map((area) => <Area key={area.id} area={area} props={props} />)
        )}
      </div>
    </div>
  );
}

/** Read-only list of the Requirement Areas. Editing happens in the files; a selected Proposal is drawn over them. */
export const mountRequirements: MountView = (slot, context) => {
  let snapshot: Snapshot | null = null;
  let proposalId: string | null = null;
  let target: string | null = null;

  function render() {
    slot(
      <RequirementsTab
        snapshot={snapshot}
        proposalId={proposalId}
        target={target}
        onProposal={(id) => {
          proposalId = id;
          render();
        }}
        onTarget={(next) => {
          target = next;
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
      render();
    },
    show(options: NavigateOptions) {
      if (options.proposal !== undefined) proposalId = options.proposal;
      if (options.ref !== undefined) target = options.ref;
      render();
    },
  };
};
