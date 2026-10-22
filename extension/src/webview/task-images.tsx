import type { TaskImageView } from "../../../src/core/snapshot";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

/** The images of a Task that can be drawn: the host gave them an address. An image that is gone is not in the list. */
export const previewable = (images: readonly TaskImageView[]): TaskImageView[] => images.filter((image) => image.uri !== undefined);

/**
 * The row of previews under the body of a Task, one per image in the order they were tied: thumbnails at most 96 px
 * high that keep their proportions and wrap when the space runs out. Each is a button, `Open image <name>`, that asks
 * the host to open the whole file. Nothing is drawn for a Task without images.
 */
export function TaskImages({ images, open }: { images: readonly TaskImageView[]; open: (name: string) => void }) {
  const shown = previewable(images);
  if (shown.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {shown.map((image) => (
        <li key={image.name}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Open image ${image.name}`}
                className="block cursor-pointer rounded-sm border bg-muted/40 p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => open(image.name)}
              >
                <img src={image.uri} alt="" className="block h-auto max-h-24 w-auto max-w-full rounded-sm object-contain" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{`Open image ${image.name}`}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
