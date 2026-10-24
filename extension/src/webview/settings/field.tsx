import { Info } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { MODEL_ROLE_KEYS, settingValueError, type SettingSchema, type SettingsValues, type SettingValue } from "../../host/settings-schema";
import type { ModelSuggestion } from "../../host/model-lists";
import { cn } from "../lib/utils";
import { InlineMarkdown, Markdown, type OpenLink } from "../markdown";
import { Checkbox } from "../ui/checkbox";
import { ComboboxInput } from "../ui/combobox";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { composeRoleValue, DEFAULT_LEVEL, effectiveValue, modelOptions, numberFromText, splitRoleValue, thinkingLevels, withModel, workspaceOverride } from "./logic";
import { ThinkingLevelSelect } from "./thinking-level";

/** How long the bubble stays open after the pointer leaves the «i» or the bubble, so the pointer can cross the gap. */
const CLOSE_DELAY_MS = 150;

/** The language setting: it keeps its value, but agents write in English for now, so the field is disabled. */
const LANGUAGE_KEY = "trama.language";

/**
 * Text that the developer is typing: `text` is what the field shows, a new `saved` value or a new message from the host
 * replaces it unless it is still unconfirmed, and `error` is the reason it cannot be saved.
 */
function useEditable(saved: string, generation: number) {
  const [text, setText] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);
  useEffect(() => {
    if (dirty.current) return;
    setText(saved);
    setError(null);
  }, [saved, generation]);
  return {
    text,
    error,
    setError,
    dirty,
    edit(next: string) {
      dirty.current = true;
      setText(next);
    },
  };
}

/** The «i» and its bubble: the setting's explanation and, for an enum, one entry per value with the chosen one marked. */
function InfoBubble({ id, setting, chosen, open, onOpen, onClose, openLink }: {
  id: string;
  setting: SettingSchema;
  chosen: string | undefined;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  openLink: OpenLink;
}) {
  const timer = useRef<number | undefined>(undefined);
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  /** Esc closed the bubble: the «i» keeps the focus without opening it again. */
  const escaped = useRef(false);
  /** Where the tooltip's reasons are: the pointer is on the «i», or the «i» has the keyboard focus. Nothing else shows it. */
  const [pointerOn, setPointerOn] = useState(false);
  const [focused, setFocused] = useState(false);
  /** Esc was pressed: the tooltip stays away until the pointer and the focus have both left the «i». */
  const [hushed, setHushed] = useState(false);
  useEffect(() => {
    if (!pointerOn && !focused) setHushed(false);
  }, [pointerOn, focused]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = () => {
    clearTimeout(timer.current);
    onOpen();
  };
  const hideLater = () => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(onClose, CLOSE_DELAY_MS);
  };
  const leaving = (related: EventTarget | null) => {
    const node = related as Node | null;
    return !(node !== null && (content.current?.contains(node) || trigger.current?.contains(node)));
  };
  const label = `About ${setting.title}`;

  return (
    <Popover open={open} onOpenChange={(next) => !next && onClose()}>
      <Tooltip open={(pointerOn || focused) && !hushed && !open}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              ref={trigger}
              type="button"
              id={`${id}-info`}
              aria-label={label}
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              // The bubble follows the pointer and the focus, not a click.
              onClick={(event) => event.preventDefault()}
              onPointerEnter={() => {
                setPointerOn(true);
                show();
              }}
              onPointerLeave={() => {
                setPointerOn(false);
                hideLater();
              }}
              onFocus={(event) => {
                // A press that gives the focus is the pointer's: only the keyboard focus shows the tooltip once the pointer has gone.
                setFocused(event.currentTarget.matches(":focus-visible"));
                if (!escaped.current) show();
              }}
              onBlur={(event) => {
                escaped.current = false;
                setFocused(false);
                if (leaving(event.relatedTarget)) onClose();
              }}
            >
              <Info className="size-4" aria-hidden="true" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        ref={content}
        id={`${id}-tip`}
        role="tooltip"
        tabIndex={-1}
        side="bottom"
        align="start"
        collisionPadding={8}
        className="w-auto max-w-[min(420px,calc(100vw-1rem))] p-2 text-sm font-normal wrap-anywhere [&_.md>:first-child]:mt-0 [&_.md>:last-child]:mb-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => {
          escaped.current = true;
          setHushed(true);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (escaped.current) trigger.current?.focus();
        }}
        onPointerEnter={show}
        onPointerLeave={hideLater}
        onBlur={(event) => {
          if (leaving(event.relatedTarget)) onClose();
        }}
      >
        <Markdown source={setting.markdown} openLink={openLink} />
        {setting.values !== undefined && (
          <ul className="mt-1.5 list-none p-0">
            {setting.values.map((value, index) => (
              <li key={value} className={cn("rounded-sm px-1 py-0.5", value === chosen && "bg-accent text-accent-foreground")}>
                <code className="font-mono">{value}</code> <InlineMarkdown source={setting.descriptions?.[index] ?? ""} openLink={openLink} />
                {value === chosen && <span className="italic opacity-85"> (current)</span>}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export interface FieldProps {
  setting: SettingSchema;
  values: SettingsValues | undefined;
  /** Counts the messages of the host: a value the developer chose or typed gives way to the real one when a new one arrives. */
  generation: number;
  models: ModelSuggestion[];
  listError: string | null;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  send: (key: string, value: SettingValue) => void;
  openLink: OpenLink;
  /** The wizard asks to hear whether a whole-number field holds a value that cannot be saved; the field reports it as the developer types and clears it when it goes away. */
  onInvalid?: (key: string, invalid: boolean) => void;
  /**
   * Where the explanation of the setting is read. `bubble` (the Settings tab): behind the «i». `page` (the setup wizard): in the page under the title,
   * linked to the control with `aria-describedby`, with no «i» and no bubble; an enum shows the entry of the chosen value under its `Select`.
   */
  explain?: "bubble" | "page";
  /** A line in bold between the title and the explanation, in `page` mode (the advice of a model role in the wizard). */
  lead?: string;
}

/** One setting: its title with the «i» (or, in `page` mode, its explanation under it), the control that fits it, and the messages under the control. */
export function SettingField({ setting, values, generation, models, listError, openKey, setOpenKey, send, openLink, onInvalid, explain = "bubble", lead }: FieldProps) {
  const id = `st-${setting.key.replace(/\./g, "-")}`;
  const { key } = setting;
  const saved = effectiveValue(setting, values);
  const savedText = typeof values?.user === "string" ? values.user : "";
  const placeholder = typeof setting.default === "string" ? setting.default : "";

  // An enum or a checkbox shows what the developer chose at once, until the host says what is saved.
  const [picked, setPicked] = useState<string | boolean | null>(null);
  useEffect(() => setPicked(null), [generation]);

  const editable = useEditable(setting.control === "integer" ? String(saved) : savedText, generation);
  const reportInvalid = useRef(onInvalid);
  reportInvalid.current = onInvalid;
  useEffect(() => () => reportInvalid.current?.(key, false), [key]);

  const modelRole = setting.control === "text" && MODEL_ROLE_KEYS.includes(key);
  const chosen = setting.control === "enum" ? String(picked ?? saved) : undefined;
  const language = key === LANGUAGE_KEY;
  const override = language ? null : workspaceOverride(setting, values);
  const listNote = modelRole ? listError : null;
  const note = language ? "Disabled for now: agents write in English." : listNote;
  const role = modelRole ? splitRoleValue(savedText, models) : undefined;
  const levels = role === undefined ? [] : thinkingLevels(models, role.model);
  const levelChosen = typeof picked === "string" ? picked : (role?.level ?? DEFAULT_LEVEL);
  const page = explain === "page";

  const describedBy = [
    `${id}-explain`,
    chosen !== undefined && setting.values?.includes(chosen) ? `${id}-value-${setting.values.indexOf(chosen)}` : null,
    editable.error !== null ? `${id}-error` : null,
    note !== null ? `${id}-note` : null,
  ]
    .filter((part) => part !== null)
    .join(" ");

  function commitInteger() {
    if (!editable.dirty.current) return;
    editable.dirty.current = false;
    const text = editable.text.trim();
    if (text === String(saved)) return;
    const value = numberFromText(text);
    const reason = settingValueError(setting, value);
    editable.setError(reason);
    if (reason === null) send(key, value);
  }

  function commitText() {
    if (!editable.dirty.current) return;
    editable.dirty.current = false;
    const text = editable.text.trim();
    if (text !== savedText) send(key, text);
  }

  let control: ReactNode;
  if (setting.control === "enum") {
    control = (
      <Select
        value={chosen}
        onValueChange={(value) => {
          setPicked(value);
          send(key, value);
        }}
      >
        {/* A value that does not fit is cut with an ellipsis; the whole value is in the tooltip. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger id={id} aria-label={setting.title} aria-describedby={describedBy} className="max-w-full justify-self-start">
              <SelectValue className="min-w-0 truncate" />
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent>{chosen}</TooltipContent>
        </Tooltip>
        <SelectContent>
          {(setting.values ?? []).map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (setting.control === "boolean") {
    control = (
      <Checkbox
        id={id}
        aria-label={setting.title}
        aria-describedby={describedBy}
        className="shrink-0"
        checked={(picked ?? saved) === true}
        onCheckedChange={(checked) => {
          setPicked(checked === true);
          send(key, checked === true);
        }}
      />
    );
  } else if (setting.control === "integer") {
    control = (
      <Input
        id={id}
        type="number"
        min={setting.minimum}
        step={1}
        aria-label={setting.title}
        aria-describedby={describedBy}
        aria-invalid={editable.error !== null ? true : undefined}
        className="w-auto max-w-full justify-self-start [field-sizing:content]"
        value={editable.text}
        onChange={(event) => {
          editable.edit(event.target.value);
          // A whole number that is valid again drops its message at once; an invalid one waits for Enter or the end of editing.
          const reason = settingValueError(setting, numberFromText(event.target.value));
          if (reason === null) editable.setError(null);
          onInvalid?.(key, reason !== null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitInteger();
        }}
        onBlur={commitInteger}
      />
    );
  } else if (modelRole) {
    control = (
      <div className={cn("flex min-w-0 items-center gap-2", page && "flex-wrap")}>
        <div className={cn("min-w-0 flex-1", page && "basis-48")}>
          <ComboboxInput
            id={id}
            aria-label={setting.title}
            aria-describedby={describedBy}
            placeholder={placeholder}
            options={modelOptions(models)}
            value={role?.model ?? ""}
            onCommit={(model) => send(key, withModel(savedText, model, models))}
          />
        </div>
        {levels.length > 0 && (
          <ThinkingLevelSelect
            label={`${setting.title} thinking level`}
            levels={levels}
            value={levelChosen}
            onChange={(level) => {
              setPicked(level);
              send(key, composeRoleValue(role?.model ?? "", level === DEFAULT_LEVEL ? undefined : level));
            }}
          />
        )}
      </div>
    );
  } else {
    control = (
      <Input
        id={id}
        type="text"
        aria-label={setting.title}
        aria-describedby={describedBy}
        placeholder={placeholder}
        disabled={language}
        value={editable.text}
        onChange={(event) => editable.edit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitText();
        }}
        onBlur={commitText}
      />
    );
  }

  const checkbox = setting.control === "boolean";
  const hasMessages = editable.error !== null || override !== null || note !== null;
  const messages = (
    <>
      {editable.error !== null && (
        <p id={`${id}-error`} className="m-0 text-sm text-destructive">
          {editable.error}
        </p>
      )}
      {override !== null && (
        <p className="m-0 text-sm text-muted-foreground">
          The workspace setting overrides this: <code className="font-mono">{override}</code>.
        </p>
      )}
      {note !== null && (
        <p id={`${id}-note`} className="m-0 text-sm text-muted-foreground">
          {note}
        </p>
      )}
    </>
  );

  if (page) {
    const chosenIndex = chosen === undefined ? -1 : (setting.values?.indexOf(chosen) ?? -1);
    // One column: the title (a checkbox sits left of it, and what follows lines up with the title), the advice, the explanation, the control, the entry of the chosen value and the messages.
    return (
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 items-start gap-2">
          {checkbox ? <span className="mt-1 flex">{control}</span> : null}
          <label htmlFor={id} className="min-w-0 font-semibold wrap-anywhere">
            {setting.title}
          </label>
        </div>
        <div className={cn("grid min-w-0 gap-1.5", checkbox && "pl-6")}>
          {lead !== undefined ? <p className="m-0 font-semibold wrap-anywhere">{lead}</p> : null}
          <div id={`${id}-explain`} className="text-sm text-muted-foreground wrap-anywhere [&_.md>:first-child]:mt-0 [&_.md>:last-child]:mb-0">
            <Markdown source={setting.markdown} openLink={openLink} />
          </div>
          {checkbox ? null : control}
          {chosenIndex >= 0 ? (
            <p id={`${id}-value-${chosenIndex}`} className="m-0 text-sm text-muted-foreground wrap-anywhere">
              <InlineMarkdown source={setting.descriptions?.[chosenIndex] ?? ""} openLink={openLink} />
            </p>
          ) : null}
          {messages}
        </div>
      </div>
    );
  }

  return (
    <div className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-0">
      <div className="relative row-start-1 flex min-w-0 items-center gap-1.5">
        {/* A checkbox sits left of its title, on the same row; the title is its label, so a click on it changes it. */}
        {checkbox ? control : null}
        <label htmlFor={id} className="font-semibold">
          {setting.title}
        </label>
        <InfoBubble
          id={id}
          setting={setting}
          chosen={chosen}
          open={openKey === key}
          onOpen={() => setOpenKey(key)}
          onClose={() => openKey === key && setOpenKey(null)}
          openLink={openLink}
        />
      </div>
      {/* Below the control, in its column: a message that is absent takes no room. */}
      {checkbox && !hasMessages ? null : (
        <div className="row-start-2 mt-1 grid min-w-0 content-start gap-1">
          {checkbox ? null : control}
          {messages}
        </div>
      )}
      {/* Described to screen readers even while the bubble is closed. */}
      <div id={`${id}-explain`} hidden>
        <Markdown source={setting.markdown} openLink={openLink} />
      </div>
      {setting.values?.map((value, index) => (
        <span key={value} id={`${id}-value-${index}`} hidden>
          <InlineMarkdown source={setting.descriptions?.[index] ?? ""} openLink={openLink} />
        </span>
      ))}
    </div>
  );
}
