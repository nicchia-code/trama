import { Route } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { SettingSchema, SettingsValues, SettingValue } from "../../host/settings-schema";
import type { ModelSuggestion } from "../../host/model-lists";
import type { ToHost, ToWebview } from "../../protocol";
import type { OpenLink } from "../markdown";
import type { ThemeController } from "../theme";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { Slot, View, ViewContext } from "../types";
import { Wizard } from "../wizard";
import { WizardController } from "../wizard/controller";
import { SettingField } from "./field";
import { groupSettings, THEME_KEY, themeSetting } from "./logic";

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
  /** The setup wizard while it is open: it takes the place of the button and the form. */
  wizard?: ReactNode;
}

/** The page: every setting the manifest declares, in groups, each saved to the user settings when the developer confirms it. */
export function SettingsPage({ schema, values, generation, models, listError, post, openLink, onGuidedSetup, wizard }: SettingsPageProps) {
  /** The only bubble open at a time. */
  const [openKey, setOpenKey] = useState<string | null>(null);
  const send = (key: string, value: SettingValue) => post({ type: "setSetting", key, value });
  if (wizard !== undefined) return <>{wizard}</>;
  return (
    <TooltipProvider>
      <div className="max-w-[1100px] px-4 pt-3 pb-6">
        {onGuidedSetup !== undefined ? (
          <div className="mb-3 flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" aria-label="Guided setup. Review the main settings step by step" onClick={onGuidedSetup}>
                  <Route aria-hidden="true" />
                  Guided setup
                </Button>
              </TooltipTrigger>
              <TooltipContent>Review the main settings step by step</TooltipContent>
            </Tooltip>
          </div>
        ) : null}
        {groupSettings(schema).map((group) => (
          <section key={group.title} className="mb-5">
            <h2 className="mb-2 border-b pb-1 text-lg font-semibold">{group.title}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-4">
              {group.settings.map((setting) => (
                <SettingField
                  key={setting.key}
                  setting={setting}
                  values={values[setting.key]}
                  generation={generation}
                  models={models}
                  listError={listError}
                  openKey={openKey}
                  setOpenKey={setOpenKey}
                  send={send}
                  openLink={openLink}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </TooltipProvider>
  );
}

/** Mounts the Settings tab in `slot`; the panel's theme follows `trama.theme` as the host sends it, also while the tab is hidden. */
export const mountSettings = (slot: Slot, context: ViewContext, theme: ThemeController): SettingsView => {
  let page: SettingsPageProps = { schema: [], values: {}, generation: 0, models: [], listError: null, post: context.post, openLink: context.openLink };
  let hasProject = false;
  const wizard = new WizardController({
    post: context.post,
    // The wizard of the Empty Model mode comes from the Diagram, so it goes back there; the one of the settings leaves the form.
    onClose: (_reason, mode) => {
      if (mode === "empty-model") context.navigate("diagram");
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

  return {
    update() {
      // The settings do not depend on the snapshot: the host sends them on their own.
    },
    show() {
      // The model names are asked again, since the agent may have changed.
      context.post({ type: "modelSuggestionsWanted" });
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
    projectPresent(present) {
      hasProject = present;
      if (!present) wizard.close();
      render();
    },
    openGuidedSetup(message) {
      if (message.mode === "settings") {
        if (!wizard.isOpen()) wizard.open("settings");
      } else if (message.choice !== undefined && message.root !== undefined) wizard.openEmptyModel(message.choice, message.root);
    },
    receiveWizardModels: (message) => wizard.receiveModels(message),
    receiveAgentCheck: (message) => wizard.receiveAgentCheck(message),
    receiveFolderChildren: (message) => wizard.receiveFolderChildren(message),
    receiveInstructionFiles: (message) => wizard.receiveInstructionFiles(message),
    receiveResult: (message) => wizard.receiveResult(message),
  };
};
