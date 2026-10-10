import { cardLabel, noNumbers } from "../../../../src/core/card-names";
import type { AreaView, FragmentView, SectionView, Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import { renderMarkdown } from "../markdown";
import type { MountView } from "../types";
import { areasWith, parseTarget, sectionMatches, visibleSections } from "./logic";
import css from "./requirements.css" with { type: "text" };

const CHANGE_LABEL: Record<SectionView["change"], string> = { added: "added", removed: "removed", changed: "changed", same: "" };
const AREA_LABEL: Record<AreaView["change"], string> = { added: "new Area", removed: "Area removed", modified: "", same: "" };
const FRAGMENT_LABEL: Record<FragmentView["change"], string> = { added: "new fragment", removed: "fragment removed", modified: "", same: "" };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, className: string, title: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", className, label);
  node.type = "button";
  node.title = title;
  node.addEventListener("click", onClick);
  return node;
}

/** Markdown text with the given classes. */
function markdown(source: string, openLink: (url: string) => void, className: string): HTMLElement {
  const node = renderMarkdown(source, openLink);
  node.classList.add(...className.split(" "));
  return node;
}

/** Read-only list of the Requirement Areas. Editing happens in the files; a selected Proposal is drawn over them. */
export const mountRequirements: MountView = (root, context) => {
  const style = document.createElement("style");
  style.textContent = css;
  root.append(style);

  const page = el("div", "rq");
  const toolbar = el("div", "rq-toolbar");
  const label = el("label", "rq-field", "Proposal ");
  const select = el("select", "rq-select");
  select.setAttribute("aria-label", "Proposal to draw over the Requirements");
  label.append(select);
  const filterBox = el("span", "rq-filter");
  toolbar.append(label, filterBox, el("span", "rq-spacer"), button("Quick request…", "trama-btn", "Ask an agent to design a change in one line", () => context.post({ type: "launch", action: { kind: "design" } })), button("Design…", "trama-btn", "Write a design request in Markdown and send it to an agent", () => context.post({ type: "writeDesignRequest" })));
  const list = el("div", "rq-list");
  page.append(toolbar, list);
  root.append(page);

  let snapshot: Snapshot | null = null;
  let proposalId: string | null = null;
  /** A Model reference or `requirements/<area>[#section]` to focus on. */
  let target: string | null = null;

  select.addEventListener("change", () => {
    proposalId = select.value || null;
    render();
  });

  function renderToolbar() {
    if (!snapshot) return;
    select.replaceChildren(new Option("None", ""));
    for (const p of snapshot.proposals.filter((x) => x.areas.length > 0))
      select.append(new Option(`${cardLabel(snapshot.numbers ?? noNumbers, "proposal", p.id)} ${p.title}`, p.id));
    select.value = proposalId ?? "";
    select.disabled = select.options.length === 1;
    filterBox.replaceChildren();
    if (target) {
      filterBox.append(el("span", "rq-muted", `Showing ${target}`), button("Show all", "rq-link", "Show every Area", () => {
        target = null;
        render();
      }));
    }
  }

  function sectionNode(area: AreaView, section: SectionView): HTMLElement {
    const node = el("section", `rq-section ${section.change}`);
    const head = el("div", "rq-section-head");
    if (section.ref === null) head.append(el("span", "rq-section-title", "General"));
    else head.append(button(section.ref, "rq-ref", `Show ${section.ref} on the diagram`, () => context.navigate("diagram", { ref: section.ref ?? undefined })));
    if (section.movedFrom !== null) head.append(el("span", "rq-badge moved", `moved from ${section.movedFrom}`));
    if (CHANGE_LABEL[section.change]) head.append(el("span", `rq-badge ${section.change}`, CHANGE_LABEL[section.change]));
    node.append(head);
    if (section.change === "changed" && section.before !== null) node.append(markdown(section.before, context.openLink, "rq-text rq-before"));
    node.append(section.text ? markdown(section.text, context.openLink, "rq-text") : el("div", "rq-text", "Empty."));
    node.dataset["key"] = `${area.id}#${section.ref ?? "General"}`;
    return node;
  }

  function fragmentNode(area: AreaView, fragment: FragmentView, sections: SectionView[]): HTMLElement {
    const group = el("section", `rq-fragment ${fragment.change}`);
    const head = el("header", "rq-fragment-head");
    head.append(el("h3", "rq-fragment-title", fragment.title || fragment.id), el("span", "rq-fragment-file", `${fragment.id}.md`));
    if (FRAGMENT_LABEL[fragment.change]) head.append(el("span", `rq-badge ${fragment.change}`, FRAGMENT_LABEL[fragment.change]));
    if (fragment.change !== "removed") head.append(el("span", "rq-spacer"), button("Open file", "rq-link", `Open .trama/${fragment.file}`, () => context.post({ type: "openFile", path: fragment.file })));
    group.append(head);
    if (fragment.description) group.append(markdown(fragment.description, context.openLink, "rq-text rq-when"));
    if (sections.length === 0) group.append(el("p", "rq-muted", "No Requirements in this fragment yet."));
    for (const s of sections) group.append(sectionNode(area, s));
    return group;
  }

  function areaNode(area: AreaView): HTMLElement | null {
    const focus = target ? parseTarget(target) : null;
    if (focus?.area && focus.area !== area.id) return null;
    const fragments = area.fragments
      .map((f) => ({ fragment: f, sections: visibleSections(f.sections).filter((s) => !focus?.section || sectionMatches(s.ref, focus.section)) }))
      .filter((f) => !focus?.section || f.sections.length > 0);
    if (focus?.section && fragments.length === 0) return null;

    const card = el("article", `rq-area ${area.change}`);
    const head = el("header", "rq-area-head");
    const title = el("h2", "rq-area-title", area.title || area.id);
    head.append(title, el("code", "rq-area-id", `requirements/${area.id}`));
    if (AREA_LABEL[area.change]) head.append(el("span", `rq-badge ${area.change}`, AREA_LABEL[area.change]));
    head.append(el("span", "rq-spacer"), button("Open file", "trama-btn", `Open .trama/${area.file}`, () => context.post({ type: "openFile", path: area.file })));
    card.append(head);
    if (area.description) card.append(markdown(area.description, context.openLink, "rq-text rq-when"));
    if (area.fragments.length === 0) card.append(el("p", "rq-muted", "No fragments."));
    if (area.intro) card.append(markdown(area.intro, context.openLink, "rq-text"));
    for (const f of fragments) card.append(fragmentNode(area, f.fragment, f.sections));
    return card;
  }

  function render() {
    if (!snapshot) return;
    const proposal = snapshot.proposals.find((p) => p.id === proposalId);
    if (!proposal) proposalId = null;
    renderToolbar();
    const areas = areasWith(snapshot, proposal);
    const cards = areas.map(areaNode).filter((n): n is HTMLElement => n !== null);
    if (areas.length === 0) list.replaceChildren(el("p", "rq-muted", "No Requirement Areas in .trama/requirements/. Run “trama skills update” to create the starting ones."));
    else if (cards.length === 0) list.replaceChildren(el("p", "rq-muted", `No Requirements for ${target}.`));
    else list.replaceChildren(...cards);
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
