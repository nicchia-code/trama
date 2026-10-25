import { Calendar, CircleAlert, Plus, Trash2, X } from "lucide-react";
import { Fragment, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { checkPerson, firstInvalid, LEVEL_LABELS, LEVELS, localDate, MAX_CAPACITY, MIN_CAPACITY, type Level, type PersonErrors, type PersonInput, type PersonView } from "../../../../src/core/people";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DIALOG_DESCRIPTION, draftOf, inputOf, newAbsenceDraft, newDraft, type PersonDraft, withSkills } from "./logic";

type Field = keyof PersonErrors;

/** A host refusal of the last `Save`: `n` tells one from the next. */
export interface Rejection {
  n: number;
  errors: PersonErrors;
}

export interface PersonDialogProps {
  /** The person being edited, or null for a new one. */
  person: PersonView | null;
  /** Every person the Manager knows, for the handle that must be new. */
  everyone: readonly PersonView[];
  /** The refusal of the host, when the last `Save` was refused. */
  rejection: Rejection | null;
  /** A `Save` is under way: the host has not answered yet. */
  saving: boolean;
  onSave(input: PersonInput): void;
  onDelete(id: string): void;
  onClose(): void;
  /** The dialog has closed: the focus goes back to the button that opened it (a dialog with no trigger of its own leaves it nowhere). */
  onCloseFocus(): void;
}

/** One field of the dialog: its label above, the control and, when invalid, the message with the `CircleAlert` linked to the control. */
function FieldRow({ id, label, error, children }: { id: string; label: string; error: string | undefined; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-xs text-destructive">
      <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/**
 * The dialog of a person (`ui#person`): `Add person` or `Edit person`. `Save` checks every field with `rules#person`; an invalid field is marked and gets the focus and nothing
 * is sent. The host checks again, and a refusal it sends back (`rejection`) marks the fields the same way.
 */
export function PersonDialog({ person, everyone, rejection, saving, onSave, onDelete, onClose, onCloseFocus }: PersonDialogProps) {
  const ids = useId();
  const id = (name: string) => `${ids}-${name}`;
  const [draft, setDraft] = useState<PersonDraft>(() => (person === null ? newDraft() : draftOf(person)));
  const [errors, setErrors] = useState<PersonErrors>({});
  const focusAfter = useRef<Field | undefined>(undefined);
  const seen = useRef(rejection?.n ?? 0);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    handle: useRef<HTMLInputElement>(null),
    level: useRef<HTMLButtonElement>(null),
    capacity: useRef<HTMLInputElement>(null),
    skills: useRef<HTMLInputElement>(null),
    absences: useRef<HTMLInputElement>(null),
  };
  const set = (patch: Partial<PersonDraft>, field?: Field) => {
    setDraft((current) => ({ ...current, ...patch }));
    if (field !== undefined && errors[field] !== undefined) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  // The focus goes to the first invalid field once the marks are drawn.
  useEffect(() => {
    const field = focusAfter.current;
    if (field === undefined) return;
    focusAfter.current = undefined;
    refs[field].current?.focus();
  });

  // A refusal that arrives while the dialog is open marks its fields, as the dialog's own check does.
  useEffect(() => {
    if (rejection === null || rejection.n === seen.current) return;
    seen.current = rejection.n;
    setErrors(rejection.errors);
    focusAfter.current = firstInvalid(rejection.errors);
  }, [rejection]);

  const save = () => {
    const input = inputOf(draft);
    const checked = checkPerson(input, everyone, localDate(new Date()));
    if (!checked.ok) {
      setErrors(checked.errors);
      const first = firstInvalid(checked.errors);
      if (first !== undefined) refs[first].current?.focus();
      return;
    }
    setErrors({});
    onSave(input);
  };

  const addSkill = () => {
    if (draft.skillText.trim() === "") return;
    set({ skills: withSkills(draft.skills, draft.skillText), skillText: "" }, "skills");
  };
  const skillKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill();
    } else if (event.key === "Backspace" && draft.skillText === "" && draft.skills.length > 0) {
      set({ skills: draft.skills.slice(0, -1) });
    }
  };

  const absenceError = errors.absences;
  const describe = (name: Field) => (errors[name] === undefined ? undefined : `${id(name)}-error`);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[480px]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{person === null ? "Add person" : "Edit person"}</DialogTitle>
          <DialogDescription>{DIALOG_DESCRIPTION}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldRow id={id("name")} label="Name" error={errors.name}>
            <Input id={id("name")} ref={refs.name} value={draft.name} aria-invalid={errors.name !== undefined} aria-describedby={describe("name")} onChange={(event) => set({ name: event.target.value }, "name")} />
          </FieldRow>
          <FieldRow id={id("handle")} label="GitHub handle" error={errors.handle}>
            <div className={`flex h-8 items-center rounded-md border bg-transparent px-3 shadow-xs focus-within:ring-2 focus-within:ring-ring ${errors.handle === undefined ? "border-input" : "border-destructive"}`}>
              <span aria-hidden="true" className="font-mono text-sm text-muted-foreground">
                @
              </span>
              <input
                id={id("handle")}
                ref={refs.handle}
                value={draft.handle}
                aria-invalid={errors.handle !== undefined}
                aria-describedby={describe("handle")}
                onChange={(event) => set({ handle: event.target.value }, "handle")}
                className="h-full min-w-0 flex-1 bg-transparent pl-0.5 font-mono text-sm outline-none"
              />
            </div>
          </FieldRow>
          <div className="flex items-start gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor={id("level")} className="text-sm font-medium">
                Level
              </label>
              <Select value={draft.level} onValueChange={(value) => set({ level: value as Level }, "level")}>
                <SelectTrigger id={id("level")} ref={refs.level} aria-invalid={errors.level !== undefined} aria-describedby={describe("level")} className="w-full aria-invalid:border-destructive">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {LEVEL_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id={`${id("level")}-error`} message={errors.level} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor={id("capacity")} className="text-sm font-medium">
                Capacity per sprint
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id={id("capacity")}
                  ref={refs.capacity}
                  type="number"
                  step={0.5}
                  min={MIN_CAPACITY}
                  max={MAX_CAPACITY}
                  value={draft.capacity}
                  aria-invalid={errors.capacity !== undefined}
                  aria-describedby={describe("capacity")}
                  onChange={(event) => set({ capacity: event.target.value }, "capacity")}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <FieldError id={`${id("capacity")}-error`} message={errors.capacity} />
            </div>
          </div>
          <FieldRow id={id("skills")} label="Skills" error={errors.skills}>
            <div
              className={`flex min-h-8 flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1 shadow-xs focus-within:ring-2 focus-within:ring-ring ${errors.skills === undefined ? "border-input" : "border-destructive"}`}
            >
              {draft.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                  {skill}
                  <button
                    type="button"
                    aria-label={`Remove ${skill}`}
                    onClick={() => set({ skills: draft.skills.filter((s) => s !== skill) }, "skills")}
                    className="rounded-sm outline-none hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X aria-hidden="true" />
                  </button>
                </Badge>
              ))}
              <input
                id={id("skills")}
                ref={refs.skills}
                value={draft.skillText}
                placeholder="Add a skill…"
                aria-invalid={errors.skills !== undefined}
                aria-describedby={describe("skills")}
                onChange={(event) => set({ skillText: event.target.value }, "skills")}
                onKeyDown={skillKey}
                className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </FieldRow>
          <div role="group" aria-labelledby={id("absences-label")} aria-describedby={describe("absences")} className="flex flex-col gap-1.5">
            <span id={id("absences-label")} className="text-sm font-medium">
              Absences
            </span>
            {draft.absences.map((absence, at) => {
              const invalid = absenceError?.rows.includes(at) === true;
              return (
                <div key={absence.key} className="flex items-center gap-2">
                  <Calendar aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  {(["from", "to"] as const).map((side, index) => (
                    <Fragment key={side}>
                      {index === 1 ? <span aria-hidden="true">–</span> : null}
                      <Input
                        type="date"
                        aria-label={side === "from" ? "From" : "To"}
                        aria-invalid={invalid}
                        aria-describedby={invalid ? `${id("absences")}-error` : undefined}
                        ref={at === (absenceError?.rows[0] ?? 0) && side === "from" ? refs.absences : undefined}
                        value={absence[side]}
                        onChange={(event) => set({ absences: draft.absences.map((row) => (row.key === absence.key ? { ...row, [side]: event.target.value } : row)) }, "absences")}
                        className="min-w-0 flex-1"
                      />
                    </Fragment>
                  ))}
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove absence" title="Remove absence" onClick={() => set({ absences: draft.absences.filter((row) => row.key !== absence.key) }, "absences")}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
            <FieldError id={`${id("absences")}-error`} message={absenceError?.message} />
            <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => set({ absences: [...draft.absences, newAbsenceDraft()] })}>
              <Plus aria-hidden="true" />
              Add absence
            </Button>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {person !== null ? (
            <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(person.id)}>
              <Trash2 aria-hidden="true" />
              Delete person
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={save}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
