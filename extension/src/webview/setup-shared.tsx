/**
 * The pieces the setup wizard and the Settings tab both show, so that neither repeats the other's text: the centred column, the
 * status box of omp, the Providers section, the box of agent instruction files, the sentences of the steps and the advice of the model roles.
 */
import { CircleCheck, Loader, LogIn, TriangleAlert } from "lucide-react";
import { type ReactNode, useId } from "react";
import { type OmpLoginProvider, OMP_LOGIN_PROVIDERS, providerConnected } from "../omp-login";
import type { SettingSchema, SettingValue } from "../host/settings-schema";
import { InstallOmpButton } from "./install-omp";
import { cn } from "./lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import type { WizardStep } from "./wizard/logic";

/** The one column of the wizard and of the Settings tab: at most about 720 px, the whole width minus the margins in a narrow panel. */
export function Column({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[720px] min-w-0 px-4", className)}>{children}</div>;
}

/** The advice in bold under the title of each model role, in words and without naming models. */
export const ROLE_ADVICE: Readonly<Record<string, string>> = {
  "trama.analysis": "Your most capable model.",
  "trama.execution": "A mid-range model.",
  "trama.scan": "A fast, light model.",
};

/** The sentence under the title of each step of the wizard; the same one, for the groups, under the title of the group in the Settings tab. */
export const STEP_SENTENCES: Readonly<Record<WizardStep, string>> = {
  Path: "Choose how Trama starts in this folder.",
  omp: "omp is required: Trama runs every agent with omp.",
  Models: "Choose the model for each kind of work.",
  Project: "Choose where Trama installs the agent skills.",
  Folders: "Uncheck the folders the agent should not import.",
  Advanced: "Theme and optional features. You can skip this step.",
  Summary: "Check your choices, then confirm.",
};

/** The sentence of the group Advanced in the Settings tab, which has no step to skip. */
export const ADVANCED_GROUP_SENTENCE = "Theme and optional features.";

/** The sentence under the title of each group of the Settings tab: the one of the step of the wizard that asks for the same settings. */
export const GROUP_SENTENCES: Readonly<Record<string, string>> = {
  omp: STEP_SENTENCES.omp,
  Models: STEP_SENTENCES.Models,
  Project: STEP_SENTENCES.Project,
  Advanced: ADVANCED_GROUP_SENTENCE,
};

/** The subgroups of Advanced, in order: each with its subtitle (a heading a level below the group's) and its settings one under the other. */
export function Subgroups<T>({ groups, render }: { groups: readonly { title: string; items: readonly T[] }[]; render: (item: T) => ReactNode }) {
  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title} className="grid gap-5">
          <h3 className="m-0 border-b pb-1 text-base font-semibold">{group.title}</h3>
          {group.items.map(render)}
        </section>
      ))}
    </div>
  );
}

export const IGNORE_INSTRUCTION_FILES_KEY = "trama.ignoreInstructionFiles";

/** Whether omp jobs ignore the instruction files: `trama.ignoreInstructionFiles` is on in `values`, the user value of each key (the default when absent). */
export function ignoresInstructionFiles(schema: readonly SettingSchema[], values: Readonly<Record<string, SettingValue | undefined>>): boolean {
  const setting = schema.find((s) => s.key === IGNORE_INSTRUCTION_FILES_KEY);
  return setting !== undefined && (values[setting.key] ?? setting.default) === true;
}

/**
 * The status of omp in a bordered box, a polite live region, with `Install omp` inside it when omp is missing. Presentation only:
 * the wizard feeds it from the check of omp, the Settings tab from the status the host sends.
 */
export function OmpStatusBox({ tone, text, missing, onInstall }: { tone: "checking" | "ok" | "warning"; text: string; missing: boolean; onInstall: () => void }) {
  const warning = tone === "warning";
  return (
    <div aria-live="polite" className={cn("mb-5 flex items-start gap-2.5 rounded-md border p-3 text-sm", warning ? "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300" : "bg-card")}>
      {tone === "checking" ? (
        <Loader aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none" />
      ) : tone === "ok" ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
      ) : (
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      )}
      <div className="grid min-w-0 gap-2">
        <p className="m-0 wrap-anywhere">{text}</p>
        {missing ? <InstallOmpButton className="justify-self-start" onInstall={onInstall} /> : null}
      </div>
    </div>
  );
}

/**
 * The Providers section of omp's group in the Settings tab and of the wizard's omp step: the fixed list of model providers, each with the state of its
 * connection and its Log in button. Presentation only: `connected` is `providers` of the last answer of omp with the list of models (absent: every state is
 * unknown, which shows no state), `onLogin` gets the id of the provider whose button was pressed. The list is shown only when omp answers; the callers decide.
 */
export function Providers({ list = OMP_LOGIN_PROVIDERS, connected, onLogin }: { list?: readonly OmpLoginProvider[]; connected: readonly string[] | undefined; onLogin: (provider: string) => void }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} className="mb-5">
      <h3 id={`${id}-title`} className="mt-0 mb-1 text-base font-semibold">
        Providers
      </h3>
      <p className="mt-0 mb-3 text-muted-foreground">Log in to the model providers you use with omp.</p>
      <ul aria-label="Providers" className="m-0 grid list-none divide-y border-y p-0">
        {list.map((provider) => (
          <ProviderRow key={provider.id} provider={provider} descriptionId={`${id}-${provider.id}`} connected={providerConnected(connected, provider.id)} onLogin={() => onLogin(provider.id)} />
        ))}
      </ul>
    </section>
  );
}

/** One row of the Providers list: the name with its subscription, the state in words (none while unknown), and the button, under them in a narrow panel. */
function ProviderRow({ provider, descriptionId, connected, onLogin }: { provider: OmpLoginProvider; descriptionId: string; connected: boolean | undefined; onLogin: () => void }) {
  const action = connected === true ? "Log in again" : "Log in";
  const sentence = `Open a terminal that logs omp in to ${provider.name}`;
  const description = provider.description;
  return (
    <li className="flex min-w-0 flex-col items-start gap-2 py-2.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        <div className="min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="m-0 text-sm font-bold wrap-anywhere">{provider.name}</p>
            </TooltipTrigger>
            {description === undefined ? null : <TooltipContent>{description}</TooltipContent>}
          </Tooltip>
          <p className="m-0 text-xs text-muted-foreground wrap-anywhere">{provider.plan}</p>
        </div>
        {connected === undefined ? null : connected ? (
          <span className="inline-flex items-center gap-1 text-sm">
            <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            Connected
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Not connected</span>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="outline" size="sm" aria-label={`${action} to ${provider.name}`} {...(description === undefined ? {} : { "aria-describedby": descriptionId })} onClick={onLogin}>
            <LogIn aria-hidden="true" />
            {action}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {description === undefined ? sentence : <span className="grid gap-1"><span>{description}</span><span>{sentence}</span></span>}
        </TooltipContent>
      </Tooltip>
      {description === undefined ? null : (
        <span id={descriptionId} className="sr-only">
          {description}
        </span>
      )}
    </li>
  );
}

/**
 * The warning about the agent instruction files found: the files one per line under the text, not under the icon, each a link that
 * opens it, and the line that omp jobs ignore them when `ignored`. Nothing when there are no files.
 */
export function InstructionFiles({ files, ignored, onOpen }: { files: readonly { label: string; path: string }[] | null; ignored: boolean; onOpen: (path: string) => void }) {
  if (files === null || files.length === 0) return null;
  return (
    <div className="mt-5 rounded-md border border-amber-600/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
      <p className="m-0 flex items-start gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>Agent instruction files found. The agent loads them in every Trama job: remove them from the repository, or check that they do not conflict with Trama.</span>
      </p>
      <ul className="m-0 mt-2 grid list-none gap-1 p-0 pl-6 font-mono text-xs">
        {files.map((file) => (
          <li key={file.path} className="min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left font-mono text-xs wrap-anywhere underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open ${file.label}`} onClick={() => onOpen(file.path)}>
                  {file.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{`Open ${file.label}`}</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
      {ignored ? <p className="m-0 mt-2 pl-6 text-muted-foreground">Trama's omp jobs ignore these files.</p> : null}
    </div>
  );
}
