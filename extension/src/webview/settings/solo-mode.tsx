import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { SoloKind } from "../../../../src/core/solo-mode";
import type { ToHost } from "../../protocol";
import { InlineMarkdown, Markdown, type OpenLink } from "../markdown";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SOLO_EXCLUDE_OPTIONS, SOLO_EXPLANATION, SOLO_NEEDS_GIT_TEXT, SOLO_NOTE, SOLO_TRACKED_WARNING, type SoloState, trackedPreview } from "./logic";

/** The title of the row and the accessible name of its `Checkbox`. */
export const SOLO_TITLE = "Solo Mode";

/** The title of the field and the accessible name of its `Select`. */
export const SOLO_EXCLUDE_TITLE = "Exclude";

export interface SoloModeRowProps {
  /** The value the row shows: off, or on with what it keeps out of git. */
  solo: SoloKind;
  /** Whether the folder is in a git repository; without one the `Checkbox` is off and disabled, with its reason under the note. */
  available: boolean;
  /** The files of Trama git still tracks, relative to the project root; the Settings tab lists them, the wizard passes none. */
  tracked?: readonly string[];
  /** A write is under way: the controls are disabled. */
  busy?: boolean;
  onChange: (solo: SoloKind) => void;
  openLink: OpenLink;
}

/**
 * The `Solo Mode` row, as the Settings tab and the wizard's Project step show it: bold title with the `Checkbox` at its left, the explanation, the note that it holds for this workspace only,
 * the reason it is not available outside git, and, with Solo mode on, the `Exclude` field with the description of the chosen value and the warning with the files git still tracks. It has the
 * layout of `SettingField`, and only the messages that are there.
 */
export function SoloModeRow({ solo, available, tracked = [], busy = false, onChange, openLink }: SoloModeRowProps) {
  const id = useId();
  const on = available && solo !== "off";
  const kind = solo === "files" ? "files" : "folders";
  const option = SOLO_EXCLUDE_OPTIONS.find((entry) => entry.value === kind);
  const { shown, more } = trackedPreview(tracked);
  const warning = on && shown.length > 0;
  const checkboxDescribedBy = [`${id}-explain`, `${id}-note`, available ? null : `${id}-git`].filter((part) => part !== null).join(" ");
  const selectDescribedBy = [`${id}-exclude-value`, warning ? `${id}-tracked` : null].filter((part) => part !== null).join(" ");
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-1 flex">
          <Checkbox id={`${id}-solo`} aria-label={SOLO_TITLE} aria-describedby={checkboxDescribedBy} className="shrink-0" checked={on} disabled={busy || !available} onCheckedChange={(checked) => onChange(checked === true ? "folders" : "off")} />
        </span>
        <label htmlFor={`${id}-solo`} className="min-w-0 font-semibold wrap-anywhere">
          {SOLO_TITLE}
        </label>
      </div>
      <div className="grid min-w-0 gap-1.5 pl-6">
        <div id={`${id}-explain`} className="text-sm text-muted-foreground wrap-anywhere [&_.md>:first-child]:mt-0 [&_.md>:last-child]:mb-0">
          <Markdown source={SOLO_EXPLANATION} openLink={openLink} />
        </div>
        <p id={`${id}-note`} className="m-0 text-sm text-muted-foreground">
          {SOLO_NOTE}
        </p>
        {available ? null : (
          <p id={`${id}-git`} className="m-0 text-sm text-muted-foreground wrap-anywhere">
            {SOLO_NEEDS_GIT_TEXT}
          </p>
        )}
        {on ? (
          <div className="grid min-w-0 gap-1.5">
            <label htmlFor={`${id}-exclude`} className="min-w-0 font-semibold wrap-anywhere">
              {SOLO_EXCLUDE_TITLE}
            </label>
            <Select value={kind} disabled={busy} onValueChange={(value) => onChange(value === "files" ? "files" : "folders")}>
              <SelectTrigger id={`${id}-exclude`} aria-label={SOLO_EXCLUDE_TITLE} aria-describedby={selectDescribedBy} className="max-w-full justify-self-start">
                <SelectValue className="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                {SOLO_EXCLUDE_OPTIONS.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id={`${id}-exclude-value`} className="m-0 text-sm text-muted-foreground wrap-anywhere">
              <InlineMarkdown source={option?.description ?? ""} openLink={openLink} />
            </p>
          </div>
        ) : null}
        {warning ? (
          <div id={`${id}-tracked`} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="m-0 wrap-anywhere">{SOLO_TRACKED_WARNING}</p>
              <ul className="m-0 mt-1 list-none p-0 font-mono">
                {shown.map((path) => (
                  <li key={path} className="wrap-anywhere">
                    {path}
                  </li>
                ))}
              </ul>
              {more > 0 ? <p className="m-0 mt-1">and {more} more</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The row of the Settings tab, driven by the host's `soloMode`: a change shows at once, disables the controls and is sent as `setSoloMode`; the host answers with the real value
 * (`generation` counts its messages), which replaces what was chosen, so a failed write puts the controls back.
 */
export function SoloModeSetting({ state, generation, post, openLink }: { state: SoloState; generation: number; post: (message: ToHost) => void; openLink: OpenLink }) {
  const [picked, setPicked] = useState<SoloKind | null>(null);
  useEffect(() => setPicked(null), [generation]);
  return (
    <SoloModeRow
      solo={picked ?? state.solo}
      available={state.available}
      tracked={state.tracked}
      busy={picked !== null}
      openLink={openLink}
      onChange={(solo) => {
        setPicked(solo);
        post({ type: "setSoloMode", solo });
      }}
    />
  );
}
