import { Route } from "lucide-react";
import type { ReactNode } from "react";
import { type SettingSchema, type SettingsValues, type SettingValue } from "../../host/settings-schema";
import type { ModelSuggestion } from "../../host/model-lists";
import type { InstructionFileView, ToHost, ToWebview } from "../../protocol";
import type { OpenLink } from "../markdown";
import { Column, GROUP_SENTENCES, IGNORE_INSTRUCTION_FILES_KEY, ignoresInstructionFiles, InstructionFiles, OmpStatusBox, ROLE_ADVICE, Subgroups } from "../setup-shared";
import type { ThemeController } from "../theme";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { Slot, View, ViewContext } from "../types";
import { Wizard } from "../wizard";
import { WizardController } from "../wizard/controller";
import { SettingField } from "./field";
import { groupSettings, type OmpStatus, ompStatusLine, THEME_KEY, themeSetting } from "./logic";

type SettingsMessage = Extract<ToWebview, { type: "settings" }>;
type ModelSuggestionsMessage = Extract<ToWebview, { type: "modelSuggestions" }>;
type GuidedSetupMessage = Extract<ToWebview, { type: "guidedSetup" }>;
type AgentCheckMessage = Extract<ToWebview, { type: "agentCheck" }>;
type FolderChildrenMessage = Extract<ToWebview, { type: "folderChildren" }>;
type GuidedSetupResultMessage = Extract<ToWebview, { type: "guidedSetupResult" }>;

/** The Settings tab takes the host's settings message directly: it is not driven by snapshots. */
export interface SettingsView extends View {
  receive(message: SettingsMessage): void;
  receiveModels(message: ModelSuggestionsMessage): void;
  /** Whether the folder has a Trama project: Guided setup exists only with one, and a wizard of the Settings tab is forgotten when the project goes away. */
  projectPresent(present: boolean): void;
  /** The host opens the wizard in this tab, in the mode Settings or Empty Model. */
  openGuidedSetup(message: GuidedSetupMessage): void;
  /** The model names the wizard asked for its chosen agent. */
  receiveWizardModels(message: ModelSuggestionsMessage): void;
  receiveAgentCheck(message: AgentCheckMessage): void;
  receiveFolderChildren(message: FolderChildrenMessage): void;
  receiveInstructionFiles(message: Extract<ToWebview, { type: "instructionFiles" }>): void;
  receiveResult(message: GuidedSetupResultMessage): void;
  /** The state of omp: being checked, the version that answers, or why not. */
  receiveOmpStatus(message: Extract<ToWebview, { type: "ompStatus" }>): void;
}

export interface SettingsPageProps {
  schema: readonly SettingSchema[];
  values: Record<string, SettingsValues>;
  generation: number;
  models: ModelSuggestion[];
  /** Why omp gives no model names, from the newest list; null when there is nothing to show. */
  listError: string | null;
  post: (message: ToHost) => void;
  openLink: OpenLink;
  /** Opens the setup wizard in the mode Settings; the «Guided setup» button shows only when it is given (a project exists). */
  onGuidedSetup?: () => void;
  /** The setup wizard while it is open: it takes the place of the title, the button and the form. */
  wizard?: ReactNode;
  /** The state of omp, from the host's `ompStatus`; null until the first message, which reads as checking. */
  omp?: OmpStatus | null;
  /** The agent instruction files found in the project's folder, from the last `instructionFiles` answer; null while the search runs, and always null outside a project. */
  instructionFiles?: readonly InstructionFileView[] | null;
}

/**
 * The page: a title, with «Guided setup» in a project, and then every setting the manifest declares, in the groups and subgroups of the setup
 * wizard, in one column. Each setting is saved to the user settings when the developer confirms it.
 */
export function SettingsPage({ schema, values, generation, models, listError, omp = null, instructionFiles = null, post, openLink, onGuidedSetup, wizard }: SettingsPageProps) {
  const send = (key: string, value: SettingValue) => post({ type: "setSetting", key, value });
  if (wizard !== undefined) return <>{wizard}</>;
  const field = (setting: SettingSchema) => (
    <SettingField
      key={setting.key}
      setting={setting}
      values={values[setting.key]}
      generation={generation}
      models={models}
      listError={listError}
      send={send}
      openLink={openLink}
      lead={ROLE_ADVICE[setting.key]}
    />
  );
  const status = ompStatusLine(omp);
  return (
    <TooltipProvider>
      <div className="min-w-0 overflow-x-clip">
        <Column className="pt-5 pb-8">
          <div className="mb-5 flex flex-col items-start gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
            <h1 className="m-0 text-2xl font-semibold">Settings</h1>
            {onGuidedSetup !== undefined ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" aria-label="Guided setup. Review the main settings step by step" onClick={onGuidedSetup}>
                    <Route aria-hidden="true" />
                    Guided setup
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Review the main settings step by step</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {groupSettings(schema).map((group) => (
            <section key={group.title} aria-labelledby={`settings-group-${group.title}`} className="mb-8">
              <h2 id={`settings-group-${group.title}`} className="mt-0 mb-1 text-lg font-semibold">
                {group.title}
              </h2>
              <p className="mt-0 mb-5 text-muted-foreground">{GROUP_SENTENCES[group.title]}</p>
              {group.title === "omp" ? <OmpStatusBox tone={status.tone} text={status.text} missing={status.missing} onInstall={() => post({ type: "installOmp" })} /> : null}
              {group.settings.length > 0 ? <div className="grid gap-5">{group.settings.map(field)}</div> : null}
              {group.subgroups.length > 0 ? <Subgroups groups={group.subgroups.map((subgroup) => ({ title: subgroup.title, items: subgroup.settings }))} render={field} /> : null}
              {group.title === "omp" ? (
                <InstructionFiles
                  files={instructionFiles}
                  ignored={ignoresInstructionFiles(schema, { [IGNORE_INSTRUCTION_FILES_KEY]: values[IGNORE_INSTRUCTION_FILES_KEY]?.user as SettingValue | undefined })}
                  onOpen={(path) => post({ type: "openInstructionFile", path })}
                />
              ) : null}
            </section>
          ))}
        </Column>
      </div>
    </TooltipProvider>
  );
}

/** Mounts the Settings tab in `slot`; the panel's theme follows `trama.theme` as the host sends it, also while the tab is hidden. */
export const mountSettings = (slot: Slot, context: ViewContext, theme: ThemeController): SettingsView => {
  let page: SettingsPageProps = { schema: [], values: {}, generation: 0, models: [], listError: null, omp: null, instructionFiles: null, post: context.post, openLink: context.openLink };
  let hasProject = false;
  let visible = false;
  const wizard = new WizardController({
    post: context.post,
    // The wizard of the Empty Model mode ends on the Board, confirmed or cancelled; the one of the settings leaves the form.
    onClose: (_reason, mode) => {
      if (mode === "empty-model") context.navigate("board");
    },
  });
  const render = () =>
    slot(
      <SettingsPage
        {...page}
        {...(hasProject ? { onGuidedSetup: () => wizard.open("settings") } : {})}
        {...(wizard.isOpen() ? { wizard: <Wizard controller={wizard} openLink={context.openLink} /> } : {})}
      />,
    );
  wizard.subscribe(render);
  render();

  /** The search of the agent instruction files in the project's folder: none shown while it runs. */
  const askInstructionFiles = () => {
    page = { ...page, instructionFiles: null };
    context.post({ type: "instructionFilesWanted" });
    render();
  };

  return {
    update() {
      // The settings do not depend on the snapshot: the host sends them on their own.
    },
    show() {
      visible = true;
      // The model names, the state of omp and the instruction files are asked again each time the tab becomes visible; the files only in a project.
      context.post({ type: "modelSuggestionsWanted" });
      context.post({ type: "ompStatusWanted" });
      if (hasProject) askInstructionFiles();
    },
    hide() {
      visible = false;
    },
    receive(message) {
      page = { ...page, schema: message.schema, values: message.values, generation: page.generation + 1 };
      theme.setSetting(themeSetting(message.values[THEME_KEY]?.user));
      wizard.receiveSettings(message);
      render();
    },
    receiveModels(message) {
      page = { ...page, models: message.models, listError: message.error ?? null };
      render();
    },
    receiveOmpStatus(message) {
      const { type: _type, ...status } = message;
      page = { ...page, omp: status };
      render();
    },
    projectPresent(present) {
      const appeared = present && !hasProject;
      hasProject = present;
      if (!present) {
        wizard.close();
        page = { ...page, instructionFiles: null };
      }
      render();
      if (appeared && visible) askInstructionFiles();
    },
    openGuidedSetup(message) {
      if (message.mode === "settings") {
        if (!wizard.isOpen()) wizard.open("settings");
      } else if (message.choice !== undefined && message.root !== undefined) wizard.openEmptyModel(message.choice, message.root);
    },
    receiveWizardModels: (message) => wizard.receiveModels(message),
    receiveAgentCheck: (message) => wizard.receiveAgentCheck(message),
    receiveFolderChildren: (message) => wizard.receiveFolderChildren(message),
    receiveInstructionFiles(message) {
      wizard.receiveInstructionFiles(message);
      if (!hasProject) return;
      page = { ...page, instructionFiles: message.files };
      render();
    },
    receiveResult: (message) => wizard.receiveResult(message),
  };
};
