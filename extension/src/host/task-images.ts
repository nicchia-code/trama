import type { Project } from "../../../src/core/store";
import type { Snapshot, TaskImageView } from "../../../src/core/snapshot";
import { readTaskImages } from "../../../src/core/task-images";

/**
 * The picture for the panel with the address of every Task image: `uri` is what `toUri` makes of the file's absolute
 * path (`Webview.asWebviewUri`). It covers the Tasks of the Board and the Tasks of the Proposals in the Diagram details.
 */
export function withImageUris(snapshot: Snapshot, toUri: (path: string) => string): Snapshot {
  const addresses = (images: readonly TaskImageView[]): TaskImageView[] => images.map((image) => ({ ...image, uri: toUri(image.path) }));
  return {
    ...snapshot,
    tasks: snapshot.tasks.map((task) => ({ ...task, images: addresses(task.images) })),
    proposals: snapshot.proposals.map((proposal) => ({ ...proposal, tasks: proposal.tasks.map((task) => ({ ...task, images: addresses(task.images) })) })),
  };
}

/** The absolute path of the image file `name` of Task `task`, or undefined when the Task has no such image now. */
export function taskImagePath(project: Project, task: string, name: string): string | undefined {
  return readTaskImages(project, task).find((image) => image.name === name)?.path;
}
