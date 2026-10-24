import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, useState } from "react";
import { cn } from "../lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { checkState, exclusions, type Tree, visibleRows } from "./logic";

export interface FolderTreeProps {
  tree: Tree;
  excluded: readonly string[];
  /** A folder was opened for the first time: the host reads it. */
  onOpen(path: string): void;
  onToggle(path: string): void;
}

const rowId = (path: string): string => `wz-tree-${path.replace(/[^A-Za-z0-9_-]/g, "_")}`;

/**
 * The folders and files of the first level, each with a box and an icon; a folder opens with its chevron and starts closed. A `tree` for the
 * keyboard: the arrows move and open, Space turns the box. It scrolls inside the step, not the page, and its height leaves it all above the
 * bar of buttons. A name that does not fit is cut with an ellipsis and whole in the tooltip of the entry.
 */
export function FolderTree({ tree, excluded, onOpen, onToggle }: FolderTreeProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const rows = visibleRows(tree, open);
  const activePath = rows.some((row) => row.path === active) ? active : (rows[0]?.path ?? null);
  const count = exclusions(excluded).length;

  const setOpenState = (path: string, value: boolean) => {
    if (value) onOpen(path);
    setOpen((previous) => {
      const next = new Set(previous);
      if (value) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = rows.findIndex((row) => row.path === activePath);
    const row = rows[index];
    if (row === undefined) return;
    const folder = row.entry.kind === "folder" && row.entry.hasChildren;
    switch (event.key) {
      case "ArrowDown":
        setActive(rows[Math.min(rows.length - 1, index + 1)]?.path ?? activePath);
        break;
      case "ArrowUp":
        setActive(rows[Math.max(0, index - 1)]?.path ?? activePath);
        break;
      case "Home":
        setActive(rows[0]?.path ?? activePath);
        break;
      case "End":
        setActive(rows[rows.length - 1]?.path ?? activePath);
        break;
      case "ArrowRight":
        if (folder && !open.has(row.path)) setOpenState(row.path, true);
        else if (folder) setActive(rows[index + 1]?.path ?? activePath);
        break;
      case "ArrowLeft":
        if (folder && open.has(row.path)) setOpenState(row.path, false);
        else {
          const parent = row.path.includes("/") ? row.path.slice(0, row.path.lastIndexOf("/")) : null;
          if (parent !== null) setActive(parent);
        }
        break;
      case " ":
        onToggle(row.path);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div className="min-w-0">
      <p className="m-0 mb-2 text-sm text-muted-foreground" aria-live="polite">
        {count > 0 ? `${count} excluded` : "Everything is included"}
      </p>
      <div
        role="tree"
        aria-label="Folders and files to import"
        aria-multiselectable="false"
        aria-activedescendant={activePath === null ? undefined : rowId(activePath)}
        tabIndex={0}
        className="max-h-[max(10rem,calc(100dvh-26rem))] min-w-0 overflow-x-hidden overflow-y-auto rounded-md border p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={onKeyDown}
      >
        {rows.map(({ path, depth, entry }) => {
          const state = checkState(excluded, path);
          const folder = entry.kind === "folder" && entry.hasChildren;
          const expanded = open.has(path);
          const Icon = entry.kind === "folder" ? (expanded ? FolderOpen : Folder) : File;
          return (
            <div
              key={path}
              id={rowId(path)}
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={folder ? expanded : undefined}
              aria-checked={state === "indeterminate" ? "mixed" : state === "checked"}
              aria-label={entry.name}
              style={{ "--depth": depth } as CSSProperties}
              // Each level indents by about 16px, about 10px in the narrow panels.
              className={cn("flex min-w-0 items-center gap-1.5 rounded-sm py-0.5 pr-1 pl-[calc(var(--depth)_*_10px_+_4px)] min-[480px]:pl-[calc(var(--depth)_*_16px_+_4px)]", path === activePath && "bg-accent text-accent-foreground")}
              onClick={() => setActive(path)}
            >
              {folder ? (
                <button type="button" tabIndex={-1} aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center" onClick={() => setOpenState(path, !expanded)}>
                  {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              ) : (
                <span className="inline-block size-4 shrink-0" aria-hidden="true" />
              )}
              <Checkbox tabIndex={-1} aria-hidden="true" checked={state === "indeterminate" ? "indeterminate" : state === "checked"} onCheckedChange={() => onToggle(path)} />
              <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn("min-w-0 flex-1 truncate font-mono", entry.kind === "folder" && "font-semibold")}>{entry.name}</span>
                </TooltipTrigger>
                <TooltipContent>{entry.name}</TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}
