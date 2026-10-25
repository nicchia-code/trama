import { Calendar, Pencil, UserMinus, UserPlus, Users, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { LEVEL_LABELS, type PersonView } from "../../../../src/core/people";
import type { ToHost, ToWebview } from "../../protocol";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { absenceText, capacityText, EMPTY_TEXT, EMPTY_TITLE, EVERYONE_IS_IN, leftText, NARROW_PEOPLE, peopleCount, personSearchValue, UNDO_MS, unreadableText } from "./logic";
import { PersonDialog, type Rejection } from "./person-dialog";

export type TeamMessage = Extract<ToWebview, { type: "team" }>;

export interface PeopleTabProps {
  /** What the host sent last; null until it has sent anything. */
  team: TeamMessage | null;
  /** The host's refusal of the last `Save`. */
  rejection: Rejection | null;
  post(message: ToHost): void;
}

const Avatar = ({ person }: { person: PersonView }) => (
  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
    {person.initials}
  </span>
);

/** Whether the element is narrower than the width under which the table becomes a list; unknown (no observer, or the view hidden) keeps what was. */
function useNarrow() {
  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setNarrow(width < NARROW_PEOPLE);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, narrow };
}

function IconAction({ label, onClick, children }: { label: string; onClick: (button: HTMLElement) => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={(event) => onClick(event.currentTarget)}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** `Add from other projects`: a popover with a search of the people outside this team; choosing one adds them at once. Without anyone to add it is disabled, and says why. */
function AddFromOthers({ others, onAdd }: { others: readonly PersonView[]; onAdd: (person: PersonView) => void }) {
  const [open, setOpen] = useState(false);
  if (others.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* A disabled button gets no pointer or focus events: the wrapper carries the tooltip. */}
          <span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Button type="button" variant="outline" disabled aria-describedby="everyone-is-in">
              <Users aria-hidden="true" />
              Add from other projects
            </Button>
            <span id="everyone-is-in" className="sr-only">
              {EVERYONE_IS_IN}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{EVERYONE_IS_IN}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline">
          <Users aria-hidden="true" />
          Add from other projects
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No one found.</CommandEmpty>
            <CommandGroup>
              {others.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`${personSearchValue(person)} ${person.id}`}
                  onSelect={() => {
                    setOpen(false);
                    onAdd(person);
                  }}
                >
                  <Avatar person={person} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{person.name}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground">@{person.handle}</span>
                  </span>
                  <Badge variant="outline">{LEVEL_LABELS[person.level]}</Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const NextAbsence = ({ person, year }: { person: PersonView; year: number }) =>
  person.nextAbsence === null ? (
    <span className="text-muted-foreground">None planned</span>
  ) : (
    <span className="inline-flex items-center gap-1.5">
      <Calendar aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      {absenceText(person.nextAbsence, year)}
    </span>
  );

const Skills = ({ person }: { person: PersonView }) => (
  <span className="flex flex-wrap gap-1">
    {person.skills.map((skill) => (
      <Badge key={skill} variant="secondary">
        {skill}
      </Badge>
    ))}
  </span>
);

const Identity = ({ person }: { person: PersonView }) => (
  <span className="flex min-w-0 items-center gap-3">
    <Avatar person={person} />
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-medium">{person.name}</span>
      <span className="truncate font-mono text-xs text-muted-foreground">@{person.handle}</span>
    </span>
  </span>
);

interface Actions {
  /** `opener` is the button that was pressed: the focus goes back to it when the dialog closes. */
  edit(person: PersonView, opener: HTMLElement): void;
  remove(person: PersonView): void;
}

const ActionButtons = ({ person, actions }: { person: PersonView; actions: Actions }) => (
  <span className="flex items-center justify-end gap-1">
    <IconAction label={`Edit ${person.name}`} onClick={(button) => actions.edit(person, button)}>
      <Pencil aria-hidden="true" />
    </IconAction>
    <IconAction label={`Remove ${person.name} from team`} onClick={() => actions.remove(person)}>
      <UserMinus aria-hidden="true" />
    </IconAction>
  </span>
);

function PeopleTable({ members, actions, year }: { members: readonly PersonView[]; actions: Actions; year: number }) {
  const head = "px-3 py-2 text-left text-xs font-medium text-muted-foreground";
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b">
          <th scope="col" className={head}>
            Person
          </th>
          <th scope="col" className={head}>
            Level
          </th>
          <th scope="col" className={head}>
            Skills
          </th>
          <th scope="col" className={head}>
            Capacity
          </th>
          <th scope="col" className={head}>
            Next absence
          </th>
          <th scope="col" className={`${head} text-right`}>
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {members.map((person) => (
          <tr key={person.id} className="border-b last:border-b-0">
            <td className="px-3 py-2">
              <Identity person={person} />
            </td>
            <td className="px-3 py-2">
              <Badge variant="outline">{LEVEL_LABELS[person.level]}</Badge>
            </td>
            <td className="px-3 py-2">
              <Skills person={person} />
            </td>
            <td className="px-3 py-2 whitespace-nowrap">{capacityText(person.capacity)}</td>
            <td className="px-3 py-2 whitespace-nowrap">
              <NextAbsence person={person} year={year} />
            </td>
            <td className="px-3 py-2">
              <ActionButtons person={person} actions={actions} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PeopleList({ members, actions, year }: { members: readonly PersonView[]; actions: Actions; year: number }) {
  return (
    <ul className="flex flex-col">
      {members.map((person) => (
        <li key={person.id} className="flex flex-col gap-1.5 border-b px-3 py-2 last:border-b-0">
          <div className="flex items-center justify-between gap-2">
            <Identity person={person} />
            <ActionButtons person={person} actions={actions} />
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
            <Badge variant="outline">{LEVEL_LABELS[person.level]}</Badge>
            <span aria-hidden="true">·</span>
            <span>{capacityText(person.capacity)}</span>
            <span aria-hidden="true">·</span>
            <NextAbsence person={person} year={year} />
          </div>
          {person.skills.length > 0 ? <Skills person={person} /> : null}
        </li>
      ))}
    </ul>
  );
}

/** A notice at the top of the tab, in the style of the Board's: its text and a button. */
function Notice({ children, action }: { children: ReactNode; action: ReactNode }) {
  return (
    <div role="status" className="flex items-center justify-between gap-2 rounded-md border border-amber-600 bg-amber-600/10 px-2 py-1 dark:border-amber-400 dark:bg-amber-400/15">
      <span className="break-words">{children}</span>
      <div className="flex shrink-0 items-center gap-1">{action}</div>
    </div>
  );
}

/**
 * The People tab (`ui#person`): the people of this project's team in a table (a list when narrow), with the dialog that adds and edits them, `Remove from team` with its
 * `Undo`, and `Add from other projects`. The people themselves live in the editor: everything written here goes to the host, which answers with the people as stored.
 */
export function PeopleTab({ team, rejection, post }: PeopleTabProps) {
  const [dialog, setDialog] = useState<{ person: PersonView | null } | null>(null);
  /** The button that opened the dialog, and the one the focus falls back to when that one is gone (the person it edited was deleted). */
  const opener = useRef<HTMLElement | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);
  const [left, setLeft] = useState<PersonView | null>(null);
  const [closedError, setClosedError] = useState<TeamMessage | null>(null);
  const { ref, narrow } = useNarrow();

  // An answer of the host after `Save` closes the dialog; so does an answer without the person being edited (they were deleted).
  useEffect(() => {
    if (team === null) return;
    setDialog((current) => {
      if (current === null) return current;
      if (saving) return null;
      const everyone = [...team.members, ...team.others];
      return current.person !== null && !everyone.some((person) => person.id === current.person?.id) ? null : current;
    });
    setSaving(false);
    // Only a new message of the host matters here: `saving` is read as it was when the message arrived.
  }, [team]);

  // A refused `Save` leaves the dialog open.
  useEffect(() => {
    if (rejection !== null) setSaving(false);
  }, [rejection]);

  // The `Undo` of a removal lasts 10 seconds, or until the next change.
  useEffect(() => {
    if (left === null) return;
    const timer = setTimeout(() => setLeft(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [left]);

  if (team === null) return <div ref={ref} />;
  const { members, others } = team;
  const year = new Date().getFullYear();
  const everyone = [...members, ...others];
  const actions: Actions = {
    edit: (person, button) => {
      setLeft(null);
      opener.current = button;
      setDialog({ person });
    },
    remove: (person) => {
      setLeft(person);
      post({ type: "removeFromTeam", id: person.id });
    },
  };
  const addNew = (button: HTMLElement) => {
    setLeft(null);
    opener.current = button;
    setDialog({ person: null });
  };
  const addFrom = (person: PersonView) => {
    setLeft(null);
    post({ type: "addToTeam", id: person.id });
  };
  const add = (
    <Button type="button" ref={addButton} onClick={(event) => addNew(event.currentTarget)}>
      <UserPlus aria-hidden="true" />
      Add person
    </Button>
  );

  return (
    <div ref={ref} className="flex flex-col gap-3">
      {team.error !== null && closedError !== team ? (
        <Notice
          action={
            <Button type="button" variant="outline" size="sm" aria-label={`Close the notice: ${team.error}`} onClick={() => setClosedError(team)}>
              <X aria-hidden="true" />
              Close
            </Button>
          }
        >
          {team.error}
        </Notice>
      ) : null}
      {left !== null ? (
        <Notice
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                post({ type: "undoRemoveFromTeam", id: left.id });
                setLeft(null);
              }}
            >
              Undo
            </Button>
          }
        >
          {leftText(left.name)}
        </Notice>
      ) : null}
      {members.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{peopleCount(members.length)}</p>
          <div className="flex items-center gap-2">
            <AddFromOthers others={others} onAdd={addFrom} />
            {add}
          </div>
        </div>
      ) : null}
      {team.unreadable > 0 ? <p className="text-sm text-muted-foreground">{unreadableText(team.unreadable)}</p> : null}
      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-6" />
          </span>
          <h3 className="text-base font-semibold">{EMPTY_TITLE}</h3>
          <p className="max-w-sm text-sm text-muted-foreground">{EMPTY_TEXT}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" ref={addButton} onClick={(event) => addNew(event.currentTarget)}>
              <UserPlus aria-hidden="true" />
              Add the first person
            </Button>
            <AddFromOthers others={others} onAdd={addFrom} />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">{narrow ? <PeopleList members={members} actions={actions} year={year} /> : <PeopleTable members={members} actions={actions} year={year} />}</div>
      )}
      {dialog !== null ? (
        <PersonDialog
          key={dialog.person?.id ?? "new"}
          person={dialog.person}
          everyone={everyone}
          rejection={rejection}
          saving={saving}
          onSave={(input) => {
            setLeft(null);
            setSaving(true);
            post({ type: "savePerson", person: input });
          }}
          onDelete={(id) => {
            setLeft(null);
            post({ type: "deletePerson", id });
          }}
          onClose={() => {
            setDialog(null);
            setSaving(false);
          }}
          onCloseFocus={() => (opener.current?.isConnected === true ? opener.current : addButton.current)?.focus()}
        />
      ) : null}
    </div>
  );
}
