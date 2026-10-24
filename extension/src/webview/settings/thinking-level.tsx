import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DEFAULT_LEVEL } from "./logic";

/**
 * The thinking level of a model: `Default`, which lets omp decide, then the levels omp declares for that model, in omp's
 * order. It is shared by the Settings tab, the setup wizard and the Proposal's model window; the caller shows it only when
 * omp declares levels for the model.
 */
export function ThinkingLevelSelect({ label, levels, value, onChange }: { label: string; levels: readonly string[]; value: string; onChange: (level: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-auto shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {[DEFAULT_LEVEL, ...levels].map((level) => (
          <SelectItem key={level} value={level}>
            {level}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
