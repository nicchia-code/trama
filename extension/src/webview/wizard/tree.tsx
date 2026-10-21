import { ChevronDown, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { cn } from "../lib/utils";
import { Checkbox } from "../ui/checkbox";
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
 * The folders and files of the first level, each with a box; a folder opens with its chevron and starts closed. A `tree` for the
 * keyboard: the arrows move and open, Space turns the box. It scrolls inside the step, not the page.
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
    <div>
      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
        {count > 0 ? `${count} excluded` : "Everything is included"}
      </p>
      <div
        role="tree"
        aria-label="Folders and files to import"
        aria-multiselectable="false"
        aria-activedescendant={activePath === null ? undefined : rowId(activePath)}
        tabIndex={0}
        className="max-h-[50vh] overflow-auto rounded-md border p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={onKeyDown}
      >
        {rows.map(({ path, depth, entry }) => {
          const state = checkState(excluded, path);
          const folder = entry.kind === "folder" && entry.hasChildren;
          const expanded = open.has(path);
          return (
            <div
              key={path}
              id={rowId(path)}
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={folder ? expanded : undefined}
              aria-checked={state === "indeterminate" ? "mixed" : state === "checked"}
              aria-label={entry.name}
              style={{ paddingLeft: `${depth * 1.25}rem` }}
              className={cn("flex items-center gap-1.5 rounded-sm px-1 py-0.5", path === activePath && "bg-accent text-accent-foreground")}
              onClick={() => setActive(path)}
            >
              {folder ? (
                <button type="button" tabIndex={-1} aria-hidden="true" className="inline-flex size-4 items-center justify-center" onClick={() => setOpenState(path, !expanded)}>
                  {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              ) : (
                <span className="inline-block size-4" aria-hidden="true" />
              )}
              <Checkbox tabIndex={-1} aria-hidden="true" checked={state === "indeterminate" ? "indeterminate" : state === "checked"} onCheckedChange={() => onToggle(path)} />
              <span className={cn("min-w-0 truncate font-mono", entry.kind === "folder" && "font-semibold")}>{entry.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
