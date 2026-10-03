import type { AreaView, SectionView, Snapshot } from "../../../../src/core/snapshot";
import type { NavigateOptions } from "../../protocol";
import type { MountView } from "../types";
import { areasWith, parseTarget, sectionMatches, visibleSections } from "./logic";
import css from "./requirements.css" with { type: "text" };

const CHANGE_LABEL: Record<SectionView["change"], string> = { added: "added", removed: "removed", changed: "changed", same: "" };
const AREA_LABEL: Record<AreaView["change"], string> = { added: "new Area", removed: "Area removed", modified: "", same: "" };

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
  toolbar.append(label, filterBox, el("span", "rq-spacer"), button("Design…", "trama-btn", "Ask an agent to design a change", () => context.post({ type: "launch", action: { kind: "design" } })), button("Fix…", "trama-btn", "Describe a problem; an agent turns it into Tasks", () => context.post({ type: "launch", action: { kind: "fix" } })));
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
    for (const p of snapshot.proposals.filter((x) => x.areas.length > 0)) select.append(new Option(`${p.id} ${p.title}`, p.id));
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
    if (CHANGE_LABEL[section.change]) head.append(el("span", `rq-badge ${section.change}`, CHANGE_LABEL[section.change]));
    node.append(head);
    if (section.change === "changed" && section.before !== null) node.append(el("div", "rq-text rq-before", section.before));
    node.append(el("div", "rq-text", section.text || "Empty."));
    node.dataset["key"] = `${area.id}#${section.ref ?? "General"}`;
    return node;
  }

  function areaNode(area: AreaView): HTMLElement | null {
    const focus = target ? parseTarget(target) : null;
    if (focus?.area && focus.area !== area.id) return null;
    const sections = visibleSections(area).filter((s) => !focus?.section || sectionMatches(s.ref, focus.section));
    if (focus?.section && sections.length === 0) return null;

    const card = el("article", `rq-area ${area.change}`);
    const head = el("header", "rq-area-head");
    const title = el("h2", "rq-area-title", area.title || area.id);
    head.append(title, el("code", "rq-area-id", `requirements/${area.id}`));
    if (AREA_LABEL[area.change]) head.append(el("span", `rq-badge ${area.change}`, AREA_LABEL[area.change]));
    head.append(el("span", "rq-spacer"), button("Open file", "trama-btn", `Open .trama/${area.file}`, () => context.post({ type: "openFile", path: area.file })));
    card.append(head);
    if (area.description) card.append(el("p", "rq-when", area.description));
    if (area.intro) card.append(el("div", "rq-text", area.intro));
    if (sections.length === 0) card.append(el("p", "rq-muted", "No Requirements yet. Write them in the file, or ask an agent with Design…"));
    for (const s of sections) card.append(sectionNode(area, s));
    return card;
  }

  function render() {
    if (!snapshot) return;
    if (proposalId && !snapshot.proposals.some((p) => p.id === proposalId)) proposalId = null;
    renderToolbar();
    const areas = areasWith(snapshot, snapshot.proposals.find((p) => p.id === proposalId));
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
