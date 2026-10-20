import { Check, Minus, SkipForward, TriangleAlert, X } from "lucide-react";
import { type ReactNode, type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Question } from "../../../../src/core/questions";
import type { QuestionRoundView } from "../../host/question-session";
import type { QuestionAction, QuestionRoundState } from "../../host/question-state";
import type { ToHost } from "../../protocol";
import { cn } from "../lib/utils";
import { Markdown, type OpenLink } from "../markdown";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { Slot } from "../types";
import { barText, isMissing, missingLine, optionKey, primaryLabel, questionStatus, type QuestionStatus, stepTitle, summaryAnswer } from "./logic";

/** How long typing waits before the text goes to the host, so a closed panel loses at most this much. */
const TEXT_DELAY_MS = 300;
const MAX_TEXT_ROWS = 10;

type Act = (action: QuestionAction) => void;

const STATUS_ICON: Record<QuestionStatus, typeof Check> = { Answered: Check, Skipped: SkipForward, Missing: TriangleAlert };

/** The status in text and with an icon: never only a colour. */
function StatusTag({ status, className }: { status: QuestionStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", status === "Missing" && "text-amber-600 dark:text-amber-400", className)}>
      <Icon aria-hidden="true" className="size-3" />
      {status}
    </span>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Index({ state, act }: { state: QuestionRoundState; act: Act }) {
  const summaryCurrent = state.view === "summary";
  return (
    <>
      <nav aria-label="Questions" className="flex w-60 shrink-0 flex-col gap-0.5 overflow-auto border-r p-2 max-[600px]:hidden">
        {state.questions.map((q, i) => {
          const current = state.view === "question" && state.current === i;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => act({ type: "openQuestion", index: i })}
                  className={cn(
                    "grid grid-cols-[auto_1fr] gap-x-2 rounded-md border-l-2 border-transparent px-1.5 py-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    current && "border-primary bg-accent",
                  )}
                >
                  <span className="row-span-2 tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="truncate">{q.question}</span>
                  <StatusTag status={questionStatus(state, i)} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{q.question}</TooltipContent>
            </Tooltip>
          );
        })}
        <button
          type="button"
          aria-current={summaryCurrent ? "step" : undefined}
          onClick={() => act({ type: "openSummary" })}
          className={cn(
            "mt-1 rounded-md border-l-2 border-transparent px-1.5 py-1 text-left font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            summaryCurrent && "border-primary bg-accent",
          )}
        >
          Summary
        </button>
      </nav>
      <nav aria-label="Questions" className="hidden flex-wrap gap-1 px-4 pt-3 max-[600px]:flex">
        {state.questions.map((q, i) => {
          const status = questionStatus(state, i);
          const current = state.view === "question" && state.current === i;
          const name = `Question ${i + 1}: ${status}`;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={name}
                  aria-current={current ? "step" : undefined}
                  onClick={() => act({ type: "openQuestion", index: i })}
                  className={cn(
                    "h-6.5 min-w-6.5 rounded-full border text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    status === "Answered" && "bg-secondary text-secondary-foreground",
                    status === "Skipped" && "border-dashed",
                    status === "Missing" && "border-amber-500",
                    current && "ring-2 ring-primary",
                  )}
                >
                  {i + 1}
                </button>
              </TooltipTrigger>
              <TooltipContent>{`${name}. ${q.question}`}</TooltipContent>
            </Tooltip>
          );
        })}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Summary"
              aria-current={summaryCurrent ? "step" : undefined}
              onClick={() => act({ type: "openSummary" })}
              className={cn("h-6.5 min-w-6.5 rounded-full border text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring", summaryCurrent && "ring-2 ring-primary")}
            >
              Σ
            </button>
          </TooltipTrigger>
          <TooltipContent>Summary</TooltipContent>
        </Tooltip>
      </nav>
    </>
  );
}

function OptionRow({
  question,
  n,
  selected,
  open,
  toggleDetails,
  act,
  openLink,
}: {
  question: Question;
  n: number;
  selected: boolean;
  open: boolean;
  toggleDetails: () => void;
  act: Act;
  openLink: OpenLink;
}) {
  const option = question.options[n] as Question["options"][number];
  const labelId = `qo-option-label-${n}`;
  const detailsId = `qo-details-${n}`;
  return (
    <div
      data-selected={selected}
      className={cn(
        "grid cursor-pointer grid-cols-[auto_auto_1fr] items-start gap-x-2 rounded-md border px-2.5 py-2 transition-colors duration-150 hover:bg-accent motion-reduce:transition-none",
        selected && "border-primary bg-accent",
      )}
      // The host decides what is selected; the row only reports the click.
      onClick={(e) => {
        if (e.target instanceof Element && e.target.closest("a, [data-details]")) return;
        act({ type: "toggleOption", option: n });
      }}
    >
      {question.multi ? (
        <Checkbox checked={selected} aria-labelledby={labelId} className="mt-0.5" />
      ) : (
        <input type="radio" name="qo-option" checked={selected} onChange={() => {}} aria-labelledby={labelId} className="mt-1 size-3.5 accent-primary" />
      )}
      <kbd aria-hidden="true" className="min-w-[1.4em] rounded border px-1 text-center text-[11px] text-muted-foreground">
        {n < 9 ? n + 1 : ""}
      </kbd>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <strong id={labelId}>{option.label}</strong>
          {n === question.recommended ? <Badge variant="secondary">Recommended</Badge> : null}
        </div>
        <div className="text-muted-foreground">
          <Markdown source={option.description} openLink={openLink} />
        </div>
        {option.details !== undefined ? (
          <>
            <Button
              variant="link"
              size="sm"
              className="mt-1 h-auto p-0 text-xs"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={(e) => {
                e.stopPropagation();
                toggleDetails();
              }}
            >
              {open ? "Hide details" : "Show details"}
            </Button>
            <div id={detailsId} data-details hidden={!open} className="mt-1.5 cursor-auto border-l-2 py-1 pl-2">
              <Markdown source={option.details} openLink={openLink} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function QuestionView({
  state,
  act,
  onText,
  openLink,
  focusRef,
}: {
  state: QuestionRoundState;
  act: Act;
  onText: (text: string) => void;
  openLink: OpenLink;
  focusRef: RefObject<HTMLElement | null>;
}) {
  const question = state.questions[state.current] as Question;
  const draft = state.drafts[state.current] ?? { selected: [question.recommended], text: "" };
  // What is typed lives here, so the host's echo of it never overwrites the text area while the developer types.
  const [text, setText] = useState(draft.text);
  const [openDetails, setOpenDetails] = useState<ReadonlySet<number>>(new Set());
  const area = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    const line = parseFloat(getComputedStyle(el).lineHeight) || 18;
    const max = line * MAX_TEXT_ROWS + 12;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [text]);
  const can = draft.selected.length > 0 || text.trim() !== "";
  const reason = "Choose an option or write an answer first";
  return (
    <div className="flex flex-col">
      <div
        ref={focusRef as RefObject<HTMLDivElement>}
        id="qo-question"
        role="heading"
        aria-level={3}
        tabIndex={-1}
        className="mb-1.5 text-base font-semibold outline-none [overflow-wrap:anywhere]"
      >
        <Markdown source={question.question} openLink={openLink} />
      </div>
      {question.context !== undefined ? (
        <div className="mb-2.5 text-muted-foreground">
          <Markdown source={question.context} openLink={openLink} />
        </div>
      ) : null}
      <div role={question.multi ? "group" : "radiogroup"} aria-labelledby="qo-question" className="mt-1.5 mb-3 flex flex-col gap-1">
        {question.options.map((_, n) => (
          <OptionRow
            key={n}
            question={question}
            n={n}
            selected={draft.selected.includes(n)}
            open={openDetails.has(n)}
            toggleDetails={() =>
              setOpenDetails((previous) => {
                const next = new Set(previous);
                if (!next.delete(n)) next.add(n);
                return next;
              })
            }
            act={act}
            openLink={openLink}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="qo-text" className="text-xs">
          Your answer (optional)
        </label>
        <textarea
          ref={area}
          id="qo-text"
          rows={2}
          value={text}
          placeholder="Write a free answer or a note for the agent"
          onChange={(e) => {
            setText(e.target.value);
            onText(e.target.value);
          }}
          className="resize-none rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        {state.current > 0 ? (
          <Button variant="outline" onClick={() => act({ type: "back" })}>
            Back
          </Button>
        ) : null}
        <span className="flex-1" />
        <Button variant="outline" onClick={() => act({ type: "closeQuestions" })}>
          Skip all
        </Button>
        <Button variant="outline" onClick={() => act({ type: "skip" })}>
          Skip
        </Button>
        {can ? (
          <Button onClick={() => act({ type: "next" })}>{primaryLabel(state)}</Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} aria-describedby="qo-next-reason" className="inline-flex">
                <Button disabled>{primaryLabel(state)}</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{reason}</TooltipContent>
          </Tooltip>
        )}
        <span id="qo-next-reason" className="sr-only">
          {can ? "" : reason}
        </span>
      </div>
    </div>
  );
}

function SummaryView({ state, act, openLink, focusRef }: { state: QuestionRoundState; act: Act; openLink: OpenLink; focusRef: RefObject<HTMLElement | null> }) {
  const missing = state.confirmed.filter(isMissing).length;
  return (
    <div className="flex flex-col">
      <h3 ref={focusRef as RefObject<HTMLHeadingElement>} tabIndex={-1} className="mb-1.5 text-base font-semibold outline-none">
        Summary
      </h3>
      <ol className="mt-1 flex flex-col gap-2">
        {state.questions.map((q, i) => {
          const answer = summaryAnswer(state, i);
          return (
            <li key={i} className="rounded-md border px-2.5 py-2">
              <div className="flex items-baseline gap-2">
                <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1 font-semibold">
                  <Markdown source={q.question} openLink={openLink} />
                </div>
                <Button variant="outline" size="sm" aria-label={`Edit question ${i + 1}`} onClick={() => act({ type: "openQuestion", index: i })}>
                  Edit
                </Button>
              </div>
              <div className="mt-1 ml-5.5">
                {answer.kind === "missing" ? (
                  <StatusTag status="Missing" />
                ) : answer.kind === "skipped" ? (
                  <StatusTag status="Skipped" />
                ) : (
                  <>
                    {answer.labels.length > 0 ? <div>{answer.labels.join(", ")}</div> : null}
                    {answer.text !== "" ? <div className="text-muted-foreground [overflow-wrap:anywhere] whitespace-pre-wrap">{answer.text}</div> : null}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {missing > 0 ? (
        <p className="mt-3 flex items-center justify-end gap-1.5 text-amber-600 dark:text-amber-400">
          <TriangleAlert aria-hidden="true" className="size-4" />
          {missingLine(missing)}
        </p>
      ) : null}
      <div className={cn("flex flex-wrap items-center gap-1.5", missing > 0 ? "mt-1.5" : "mt-3.5")}>
        <Button variant="outline" onClick={() => act({ type: "closeQuestions" })}>
          Skip all
        </Button>
        <span className="flex-1" />
        <Button disabled={missing > 0} onClick={() => act({ type: "send" })}>
          Send to agent
        </Button>
      </div>
    </div>
  );
}

/**
 * The question round over the panel's tabs: a `Dialog` while it is in view, a bar at the top of the panel while it is
 * minimized. It only draws the state the host sends and sends back what the developer does; the host decides.
 */
export function QuestionOverlay({ round, post, openLink }: { round: QuestionRoundView | null; post: (message: ToHost) => void; openLink: OpenLink }) {
  const roundId = round?.id ?? null;
  const roundRef = useRef(roundId);
  roundRef.current = roundId;
  const postRef = useRef(post);
  postRef.current = post;
  const pendingText = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusRef = useRef<HTMLElement | null>(null);
  const goBack = useRef<HTMLButtonElement>(null);

  const flushText = useCallback(() => {
    clearTimeout(timer.current);
    const text = pendingText.current;
    pendingText.current = null;
    if (text === null || roundRef.current === null) return;
    postRef.current({ type: "questionAction", round: roundRef.current, action: { type: "setText", text } });
  }, []);
  const act = useCallback<Act>(
    (action) => {
      if (roundRef.current === null) return;
      flushText();
      postRef.current({ type: "questionAction", round: roundRef.current, action });
    },
    [flushText],
  );
  const onText = useCallback(
    (text: string) => {
      pendingText.current = text;
      clearTimeout(timer.current);
      timer.current = setTimeout(flushText, TEXT_DELAY_MS);
    },
    [flushText],
  );

  // A round that goes away drops its unsent text; closing the panel can destroy the page before the typing delay ends,
  // so what is typed is sent as soon as the page is hidden or leaves.
  useEffect(() => {
    return () => {
      clearTimeout(timer.current);
      pendingText.current = null;
    };
  }, [roundId]);
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushText();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flushText);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flushText);
    };
  }, [flushText]);

  const state = round?.state ?? null;
  const stateRef = useRef(state);
  stateRef.current = state;
  // Digits 1 to 9 choose options, but not while the text area has the focus or Skip all is being confirmed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s || s.minimized || s.view !== "question" || s.confirming !== null || e.target instanceof HTMLTextAreaElement) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const n = optionKey(e.key, s.questions[s.current]?.options.length ?? 0);
      if (n === null) return;
      e.preventDefault();
      act({ type: "pressKey", option: n });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [act]);

  // The focus goes to the text of every new question (or to the summary), and back to it when the confirmation closes.
  const position = round && state ? `${round.id}:${state.view}:${state.view === "question" ? state.current : ""}` : "";
  const settled = state !== null && !state.minimized && state.confirming === null;
  useEffect(() => {
    if (settled) focusRef.current?.focus();
  }, [position, settled]);

  if (!round || !state) return null;
  const open = !state.minimized;
  return (
    <TooltipProvider>
      {state.minimized ? (
        <div
          className="flex cursor-pointer items-center gap-2.5 bg-primary px-2.5 py-1.5 text-primary-foreground"
          onClick={(e) => {
            if (e.target === e.currentTarget || !(e.target instanceof Element && e.target.closest("button"))) act({ type: "restore" });
          }}
        >
          <span className="flex-1">{barText(state)}</span>
          <Button variant="secondary" size="sm" onClick={() => act({ type: "restore" })}>
            Open questions
          </Button>
        </div>
      ) : null}
      <Dialog open={open}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          // Esc does nothing, a click outside does nothing, and the focus goes to the text of the question.
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            focusRef.current?.focus();
          }}
          className="flex max-h-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <div className="flex items-center gap-1.5 border-b py-2 pr-2.5 pl-3.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <DialogTitle>Questions from the agent</DialogTitle>
              {round.agent !== null ? <span className="text-muted-foreground">{round.agent}</span> : null}
              <span className="text-muted-foreground">{stepTitle(state)}</span>
            </div>
            <IconButton label="Minimize" onClick={() => act({ type: "minimize" })}>
              <Minus />
            </IconButton>
            <IconButton label="Close" onClick={() => act({ type: "closeQuestions" })}>
              <X />
            </IconButton>
          </div>
          <div className="flex min-h-0 flex-1 max-[600px]:flex-col">
            <Index state={state} act={act} />
            <div className="min-w-0 flex-1 overflow-auto px-4 py-3.5">
              {state.view === "question" ? (
                <QuestionView key={position} state={state} act={act} onText={onText} openLink={openLink} focusRef={focusRef} />
              ) : (
                <SummaryView key={position} state={state} act={act} openLink={openLink} focusRef={focusRef} />
              )}
            </div>
          </div>
          <Dialog open={state.confirming !== null}>
            <DialogContent
              role="alertdialog"
              showCloseButton={false}
              className="sm:max-w-md"
              onEscapeKeyDown={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                goBack.current?.focus();
              }}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                focusRef.current?.focus();
              }}
            >
              <DialogTitle>Skip all unanswered questions?</DialogTitle>
              <DialogDescription>The agent will use its recommendation for each of them.</DialogDescription>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Button onClick={() => act({ type: "confirmSkipAll" })}>Skip all</Button>
                <Button ref={goBack} variant="outline" onClick={() => act({ type: "cancelSkipAll" })}>
                  Go back
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export interface QuestionOverlayHandle {
  update(round: QuestionRoundView | null): void;
}

/** Mounts the overlay into `slot`: the bar sits there, at the top of the panel, and the dialog opens above everything. */
export function mountQuestions(slot: Slot, post: (message: ToHost) => void, openLink: OpenLink): QuestionOverlayHandle {
  const draw = (round: QuestionRoundView | null) => slot(<QuestionOverlay round={round} post={post} openLink={openLink} />);
  draw(null);
  return { update: draw };
}
