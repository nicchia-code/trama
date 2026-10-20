import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover";

export interface ComboboxOption {
  value: string;
  label?: string;
}

/** A field with suggestions: a `Popover` holding a searchable `Command` list, as shadcn/ui composes its combobox. */
function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No match.",
  className,
  disabled,
  ...props
}: {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
} & Omit<React.ComponentProps<typeof Button>, "value" | "onChange">) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button data-slot="combobox" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={cn("w-[200px] justify-between font-normal", className)} {...props}>
          <span className="truncate">{selected ? (selected.label ?? selected.value) : placeholder}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(next) => {
                    onValueChange(next === value ? "" : next);
                    setOpen(false);
                  }}
                >
                  {option.label ?? option.value}
                  <Check className={cn("ml-auto", value === option.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * A text field with suggestions, as shadcn/ui composes a combobox with a free text: the developer types in the field, the
 * `Popover` list (a `Command`) filters while they type, choosing an entry confirms it at once, and a text that is not
 * among the entries is confirmed when the field is left or with Enter. `value` is the confirmed text; a new `value` or new
 * `options` never change what the developer is typing. With no options the field never opens a list.
 */
function ComboboxInput({
  options,
  value,
  onCommit,
  className,
  ...props
}: {
  options: ComboboxOption[];
  value: string;
  /** Called with the confirmed text: an entry chosen, or the typed text trimmed when the field is left or with Enter. */
  onCommit: (value: string) => void;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "onBlur" | "onKeyDown" | "type">) {
  const [text, setText] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  /** Typed but not yet confirmed: a new `value` does not overwrite it. */
  const dirty = React.useRef(false);
  /** The developer moved through the list with the arrows: only then does Enter choose the highlighted entry. */
  const navigated = React.useRef(false);
  const anchor = React.useRef<HTMLDivElement>(null);
  const content = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!dirty.current) setText(value);
  }, [value]);

  const needle = text.trim().toLowerCase();
  const shown = needle === "" ? options : options.filter((option) => option.value.toLowerCase().includes(needle) || (option.label ?? "").toLowerCase().includes(needle));

  function confirm() {
    const typed = text.trim();
    dirty.current = false;
    if (typed !== value) onCommit(typed);
  }

  function choose(chosen: string) {
    dirty.current = false;
    navigated.current = false;
    setText(chosen);
    setOpen(false);
    onCommit(chosen);
  }

  return (
    <Command label={props["aria-label"]} shouldFilter={false} className="h-auto overflow-visible rounded-none bg-transparent">
      <Popover open={open && shown.length > 0} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchor} className="w-full">
            <CommandPrimitive.Input
              data-slot="input"
              className={cn(
                "flex h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors duration-150 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive motion-reduce:transition-none",
                className,
              )}
              {...props}
              value={text}
              onValueChange={(next) => {
                dirty.current = true;
                navigated.current = false;
                setText(next);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  navigated.current = true;
                  setOpen(true);
                } else if (event.key === "Enter" && !(open && navigated.current)) {
                  // A free text: stop the list from choosing its first entry.
                  event.preventDefault();
                  setOpen(false);
                  confirm();
                }
              }}
              onBlur={(event) => {
                if (content.current?.contains(event.relatedTarget as Node | null)) return;
                setOpen(false);
                if (dirty.current) confirm();
              }}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          ref={content}
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (anchor.current?.contains(event.target as Node | null)) event.preventDefault();
          }}
        >
          {/* A press on an entry must not take the focus from the field: the typed text would be confirmed before the entry is. */}
          <CommandList onMouseDown={(event) => event.preventDefault()}>
            <CommandGroup>
              {shown.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={() => choose(option.value)}>
                  <span className="truncate">{option.value}</span>
                  {option.label !== undefined && option.label !== option.value && <span className="truncate text-muted-foreground">· {option.label}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  );
}

export { Combobox, ComboboxInput };
