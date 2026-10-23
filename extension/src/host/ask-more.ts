import type { Project } from "../../../src/core/store";
import { getProposal } from "../../../src/core/proposals";
import { cardName } from "../../../src/core/short-numbers";
import { readTaskImages } from "../../../src/core/task-images";
import { driftSides, getDrift, getTask } from "../../../src/core/work";
import type { AskMoreLink, AskMoreSubject } from "./prompts";

/** The identity and title of a linked card, read from its file; the identity alone when that file is gone, so Ask more still opens. */
function linkOf(id: string, read: () => { id: string; title: string }): AskMoreLink {
  try {
    const card = read();
    return { id: card.id, title: card.title };
  } catch {
    return { id, title: id };
  }
}

const proposalLink = (project: Project, id: string): AskMoreLink => linkOf(id, () => getProposal(project, id));
const driftLink = (project: Project, id: string): AskMoreLink => linkOf(id, () => getDrift(project, id));
const taskLink = (project: Project, id: string): AskMoreLink => linkOf(id, () => getTask(project, id));

/**
 * The thing Ask more is about, read from the files now: the card's text, its references and the cards linked to it, with
 * their identities. Throws when the card does not exist any more, so nothing opens for it.
 */
export function askMoreSubject(project: Project, kind: "task" | "proposal" | "drift", id: string): AskMoreSubject {
  if (kind === "task") {
    const task = getTask(project, id);
    return {
      kind,
      id: task.id,
      number: cardName(project, "task", task.id),
      title: task.title,
      body: task.body,
      refs: task.data.refs,
      images: readTaskImages(project, task.id).map((image) => image.path),
      proposal: task.data.proposal === null ? null : proposalLink(project, task.data.proposal),
      drift: task.data.drift === null ? null : driftLink(project, task.data.drift),
    };
  }
  if (kind === "proposal") {
    const proposal = getProposal(project, id);
    return {
      kind,
      id: proposal.id,
      number: cardName(project, "proposal", proposal.id),
      title: proposal.title,
      status: proposal.data.status,
      proposalKind: proposal.data.kind,
      body: proposal.body,
      tasks: proposal.tasks.map((task) => ({ id: task.id, title: task.title, refs: task.refs })),
      drifts: proposal.data.drifts.map((decision) => ({ ...driftLink(project, decision.drift), decision: decision.decision, option: decision.option ?? null })),
    };
  }
  const drift = getDrift(project, id);
  const sides = driftSides(drift);
  return {
    kind,
    id: drift.id,
    number: cardName(project, "drift", drift.id),
    title: drift.title,
    status: drift.data.status,
    happens: sides?.happens ?? "",
    should: sides?.should ?? "",
    where: sides?.where ?? null,
    refs: drift.data.refs,
    notBlocking: drift.data.notBlocking,
    proposal: drift.data.proposal === null ? null : proposalLink(project, drift.data.proposal),
    task: drift.data.task === null ? null : taskLink(project, drift.data.task),
    previous: drift.data.previous.map((previous) => driftLink(project, previous)),
    unifies: drift.data.unifies.map((unified) => driftLink(project, unified)),
  };
}

/** The name of the terminal Ask more opens with omp: `Ask <short number>` for a card, as the agent terminal names are written. */
export const askMoreTerminalName = (project: Project, kind: "task" | "proposal" | "drift", id: string): string => `Ask ${cardName(project, kind, id)}`;
