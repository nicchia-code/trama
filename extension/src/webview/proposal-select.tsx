import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const NONE = "none";

/** The `Select` that picks the Proposal drawn over the Requirements or the Specs; disabled when there is none to pick. */
export function ProposalSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      Proposal
      <Select value={value ?? NONE} onValueChange={(next) => onChange(next === NONE ? null : next)} disabled={options.length === 0}>
        <SelectTrigger aria-label={label} className="min-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

/** The colour of a change mark, from the Tailwind palette with a tone for each theme. */
export const CHANGE_TEXT = {
  added: "text-green-600 dark:text-green-400",
  removed: "text-red-600 dark:text-red-400",
  changed: "text-amber-600 dark:text-amber-400",
} as const;

export const CHANGE_BORDER = {
  added: "border-l-green-600 dark:border-l-green-400",
  removed: "border-l-red-600 dark:border-l-red-400",
  changed: "border-l-amber-600 dark:border-l-amber-400",
} as const;

/** The light background that goes with a change's border when a focus marks the element. */
export const CHANGE_TINT = {
  added: "bg-green-600/10 dark:bg-green-400/10",
  removed: "bg-red-600/10 dark:bg-red-400/10",
  changed: "bg-amber-600/10 dark:bg-amber-400/10",
} as const;

/** The mark of an element of the focus that no change colours: the left border and the light background in cyan, the shade of each theme. */
export const FOCUS_MARK = "border-l-cyan-600 bg-cyan-600/10 dark:border-l-cyan-400 dark:bg-cyan-400/10";
