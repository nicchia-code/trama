import { Route } from "lucide-react";
import type { ReactNode } from "react";
import { type SettingSchema, type SettingsValues, type SettingValue } from "../../host/settings-schema";
import type { ModelSuggestion } from "../../host/model-lists";
import type { InstructionFileView, ToHost, ToWebview } from "../../protocol";
import { type ProvidersView, providersView } from "../../omp-login";
import type { OpenLink } from "../markdown";
import { Column, GROUP_SENTENCES, IGNORE_INSTRUCTION_FILES_KEY, ignoresInstructionFiles, InstructionFiles, OmpStatusBox, Providers, ROLE_ADVICE, Subgroups } from "../setup-shared";
import type { ThemeController } from "../theme";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { Slot, View, ViewContext } from "../types";
import { Wizard } from "../wizard";
import { WizardController } from "../wizard/controller";
import { SettingField } from "./field";
import { type CertificatesState, groupSettings, type ManagerState, type OmpStatus, ompStatusLine, SKILLS_DIR_KEY, type SoloState, SYSTEM_CERTIFICATES_KEY, type TestNotificationState, testNotificationBlock, THEME_KEY, themeSetting } from "./logic";
import { NOTIFICATIONS_SUBGROUP, NotificationsControls } from "./notifications";
import { ManagerModeSetting } from "./manager-mode";
import { SoloModeSetting } from "./solo-mode";

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
  /** Whether a Cursor API key is saved, from the host's `cursorApiKey`: the Cursor row's key buttons and the wizard's follow it. */
  receiveCursorApiKey(message: Extract<ToWebview, { type: "cursorApiKey" }>): void;
  /** Whether the logout of a provider is running, from the host's `ompLogoutState`: the provider's row of the Settings tab and of the wizard follows it. */
  receiveOmpLogoutState(message: Extract<ToWebview, { type: "ompLogoutState" }>): void;
  /** The state of the System Certificates bundle, from the host's `systemCertificates`: the line under the setting follows it. */
  receiveSystemCertificates(message: Extract<ToWebview, { type: "systemCertificates" }>): void;
  /** Whether an ntfy access token is saved, from the host's `ntfyToken`: the Notifications subgroup follows it. */
  receiveNtfyToken(message: Extract<ToWebview, { type: "ntfyToken" }>): void;
  /** Solo mode of the project, from the host's `soloMode`: the kind, the tracked files of Trama and whether the folder is in a git repository. */
  receiveSoloMode(message: Extract<ToWebview, { type: "soloMode" }>): void;
  /** Manager mode of the project, from the host's `managerMode`: whether it is recorded and the repository of origin, with the reason when there is none. */
  receiveManagerMode(message: Extract<ToWebview, { type: "managerMode" }>): void;
  /** How the test notification is going, from the host's `testNotification`. */
  receiveTestNotification(message: Extract<ToWebview, { type: "testNotification" }>): void;
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
  /** The Providers section: null while it is not shown (omp has not answered yet, or does not answer); otherwise the providers omp lists models of, absent when their states are unknown. */
  providers?: ProvidersView;
  /** Whether a Cursor API key is saved, and how many times the host has told so (`changes`); the key itself never reaches the panel. */
  cursorKey?: { saved: boolean; changes: number };
  /** Whether an access token of the ntfy server is saved, and how many times the host has told so (`changes`); the token itself never reaches the panel. */
  ntfyToken?: { saved: boolean; changes: number };
  /** How the last test notification went, from the host's `testNotification`; null before the first one. The line stays until the next test or until the tab is closed. */
  testNotification?: TestNotificationState | null;
  /** The providers whose logout the host is running. */
  loggingOut?: readonly string[];
  /** The state of the System Certificates bundle, from the host's `systemCertificates`; null until the first message. */
  certificates?: CertificatesState | null;
  /** The agent instruction files found in the project's folder, from the last `instructionFiles` answer; null while the search runs, and always null outside a project. */
  instructionFiles?: readonly InstructionFileView[] | null;
  /** Solo mode of the project, from the host's `soloMode`; null until the first message and outside a project, where the `Solo Mode` row is not shown. */
  solo?: SoloState | null;
  /** How many times the host has told Solo mode: a value the developer chose gives way to the real one when a new message arrives. */
  soloChanges?: number;
  /** Manager mode of the project, from the host's `managerMode`; null until the first message and outside a project, where the `Manager Mode` row is not shown. */
  manager?: ManagerState | null;
  /** How many times the host has told Manager mode: a value the developer chose gives way to the real one when a new message arrives. */
  managerChanges?: number;
}

/**
 * The page: a title, with «Guided setup» in a project, and then every setting the manifest declares, in the groups and subgroups of the setup
 * wizard, in one column. Each setting is saved to the user settings when the developer confirms it.
 */
export function SettingsPage({ schema, values, generation, models, listError, omp = null, providers = null, cursorKey = { saved: false, changes: 0 }, ntfyToken = { saved: false, changes: 0 }, testNotification = null, loggingOut = [], certificates = null, instructionFiles = null, solo = null, soloChanges = 0, manager = null, managerChanges = 0, post, openLink, onGuidedSetup, wizard }: SettingsPageProps) {
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
      {...(setting.key === SYSTEM_CERTIFICATES_KEY ? { certificates: { state: certificates, onRefresh: () => post({ type: "refreshSystemCertificates" }) } } : {})}
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
              {group.title === "omp" && providers !== null ? <Providers connected={providers.connected} onLogin={(provider) => post({ type: "ompLogin", provider })} onLogout={(provider) => post({ type: "ompLogout", provider })} loggingOut={loggingOut} apiKey={{ ...cursorKey, onSet: () => post({ type: "setCursorApiKey" }), onRemove: () => post({ type: "removeCursorApiKey" }) }} /> : null}
              {group.settings.length > 0 ? (
                <div className="grid gap-5">
                  {group.settings.flatMap((setting) => [
                    field(setting),
                    ...(setting.key === SKILLS_DIR_KEY && solo !== null ? [<SoloModeSetting key="solo-mode" state={solo} generation={soloChanges} post={post} openLink={openLink} />] : []),
                    ...(setting.key === SKILLS_DIR_KEY && manager !== null ? [<ManagerModeSetting key="manager-mode" state={manager} generation={managerChanges} post={post} />] : []),
                  ])}
                </div>
              ) : null}
              {group.subgroups.length > 0 ? (
                <Subgroups
                  groups={group.subgroups.map((subgroup) => ({ title: subgroup.title, items: subgroup.settings }))}
                  render={field}
                  after={(title) =>
                    title === NOTIFICATIONS_SUBGROUP ? (
                      <NotificationsControls
                        token={{ ...ntfyToken, onSet: () => post({ type: "setNtfyToken" }), onRemove: () => post({ type: "removeNtfyToken" }) }}
                        block={testNotificationBlock(values)}
                        test={testNotification}
                        onSend={() => post({ type: "sendTestNotification" })}
                      />
                    ) : null
                  }
                />
              ) : null}
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
  let page: SettingsPageProps = { schema: [], values: {}, generation: 0, models: [], listError: null, omp: null, providers: null, cursorKey: { saved: false, changes: 0 }, ntfyToken: { saved: false, changes: 0 }, testNotification: null, loggingOut: [], certificates: null, instructionFiles: null, solo: null, soloChanges: 0, manager: null, managerChanges: 0, post: context.post, openLink: context.openLink };
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
      // The section of providers waits for the first outcome after the tab is shown.
      page = { ...page, providers: null };
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
      page = { ...page, omp: status, providers: providersView(page.providers ?? null, status.state === "checking" ? "pending" : { answers: ompStatusLine(status).tone === "ok", providers: status.providers }) };
      render();
    },
    receiveCursorApiKey(message) {
      page = { ...page, cursorKey: { saved: message.saved, changes: (page.cursorKey?.changes ?? 0) + 1 } };
      wizard.receiveCursorApiKey(message);
      render();
    },
    receiveNtfyToken(message) {
      page = { ...page, ntfyToken: { saved: message.saved, changes: (page.ntfyToken?.changes ?? 0) + 1 } };
      render();
    },
    receiveSoloMode(message) {
      const { type: _type, ...state } = message;
      page = { ...page, solo: state, soloChanges: (page.soloChanges ?? 0) + 1 };
      wizard.receiveSoloMode(message);
      render();
    },
    receiveManagerMode(message) {
      const { type: _type, ...state } = message;
      page = { ...page, manager: state, managerChanges: (page.managerChanges ?? 0) + 1 };
      wizard.receiveManagerMode(message);
      render();
    },
    receiveTestNotification(message) {
      const { type: _type, ...state } = message;
      page = { ...page, testNotification: state };
      render();
    },
    receiveOmpLogoutState(message) {
      const others = (page.loggingOut ?? []).filter((provider) => provider !== message.provider);
      page = { ...page, loggingOut: message.running ? [...others, message.provider] : others };
      wizard.receiveLogoutState(message);
      render();
    },
    receiveSystemCertificates(message) {
      const { type: _type, ...state } = message;
      page = { ...page, certificates: state };
      wizard.receiveSystemCertificates(message);
      render();
    },
    projectPresent(present) {
      const appeared = present && !hasProject;
      hasProject = present;
      if (!present) {
        wizard.close();
        page = { ...page, instructionFiles: null, solo: null, manager: null };
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
