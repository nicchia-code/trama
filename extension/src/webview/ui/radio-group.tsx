import { Circle } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";

interface RadioGroupContext {
  name: string;
  value: string;
  disabled: boolean;
  select: (value: string) => void;
}

const Context = React.createContext<RadioGroupContext | null>(null);

/** The shadcn/ui `RadioGroup`, without a Radix primitive: one `radiogroup` whose `radio` buttons the arrow keys move between. */
function RadioGroup({
  value,
  onValueChange,
  disabled = false,
  className,
  children,
  ...props
}: { value: string; onValueChange: (value: string) => void; disabled?: boolean } & Omit<React.ComponentProps<"div">, "onChange">) {
  const name = React.useId();
  const select = React.useCallback((next: string) => onValueChange(next), [onValueChange]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0 || disabled) return;
    const radios = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)')];
    const at = radios.findIndex((radio) => radio === document.activeElement);
    const next = radios[(at + step + radios.length) % radios.length];
    if (next === undefined) return;
    event.preventDefault();
    next.focus();
    next.click();
  };
  return (
    <Context.Provider value={{ name, value, disabled, select }}>
      <div role="radiogroup" data-slot="radio-group" aria-disabled={disabled || undefined} className={cn("grid gap-2", className)} onKeyDown={onKeyDown} {...props}>
        {children}
      </div>
    </Context.Provider>
  );
}

function RadioGroupItem({ value, className, ...props }: { value: string } & Omit<React.ComponentProps<"button">, "value">) {
  const group = React.useContext(Context);
  const checked = group?.value === value;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      data-slot="radio-group-item"
      tabIndex={checked || group?.value === "" ? 0 : -1}
      disabled={group?.disabled}
      onClick={() => group?.select(value)}
      className={cn(
        "aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {checked ? <Circle className="m-auto size-2 fill-primary" /> : null}
    </button>
  );
}

export { RadioGroup, RadioGroupItem };
