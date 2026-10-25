import { TriangleAlert } from "lucide-react";
import type { ToWebview } from "../../protocol";
import { InlineMarkdown } from "../markdown";
import type { Slot, View, ViewContext } from "../types";
import { Wizard } from "../wizard";
import { WizardController } from "../wizard/controller";

type SetupMessage = Extract<ToWebview, { type: "setup" }>;

/** The Get Started tab takes the host's setup messages directly: it is not driven by snapshots. */
export interface GetStartedView extends View {
  /** The confirmation of the first setup is running, or it ended with a reason. */
  receive(message: SetupMessage): void;
  receiveSettings(message: Extract<ToWebview, { type: "settings" }>): void;
  receiveFolders(message: Extract<ToWebview, { type: "workspaceFolders" }>): void;
  receiveModels(message: Extract<ToWebview, { type: "modelSuggestions" }>): void;
  receiveAgentCheck(message: Extract<ToWebview, { type: "agentCheck" }>): void;
  receiveCursorApiKey(message: Extract<ToWebview, { type: "cursorApiKey" }>): void;
  receiveOmpLogoutState(message: Extract<ToWebview, { type: "ompLogoutState" }>): void;
  receiveSystemCertificates(message: Extract<ToWebview, { type: "systemCertificates" }>): void;
  receiveFolderChildren(message: Extract<ToWebview, { type: "folderChildren" }>): void;
  receiveInstructionFiles(message: Extract<ToWebview, { type: "instructionFiles" }>): void;
  /** Whether the folder has a Trama project: the wizard starts over when the folder stops being one and is forgotten when it becomes one. */
  projectPresent(present: boolean): void;
}

const NOTICE = "Trama will create a `.trama` folder that describes this project. It holds no secrets and is meant to be committed. It also writes the agent skills and the Trama sub-agent definition into this project, which are meant to be committed too.";

/** The notice with Solo mode chosen in the Project step: the files are kept out of git, in this working copy only. */
const SOLO_NOTICE = "Trama will create a `.trama` folder that describes this project, and write the agent skills and the Trama sub-agent definition into this project. Solo mode keeps them out of git in this working copy only: they are never committed and are versioned nowhere else.";

/** The notice that tops the Path and Summary steps of the first setup; `solo` when Solo mode is chosen in the Project step. */
export function GetStartedNotice({ openLink, solo = false }: { openLink(url: string): void; solo?: boolean }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-2.5">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="m-0">
        <InlineMarkdown source={solo ? SOLO_NOTICE : NOTICE} openLink={openLink} />
      </p>
    </div>
  );
}

/** The Get Started tab: the setup wizard in the first-setup mode, shown only while the folder has no Trama project. */
export const mountGetStarted = (slot: Slot, context: ViewContext): GetStartedView => {
  const wizard = new WizardController({ post: context.post });
  slot(<Wizard controller={wizard} openLink={context.openLink} notice={(solo) => <GetStartedNotice openLink={context.openLink} solo={solo} />} />);

  return {
    update() {},
    show() {},
    receive: (message) => wizard.receiveSetup(message),
    receiveSettings: (message) => wizard.receiveSettings(message),
    receiveFolders: (message) => wizard.receiveFolders(message.folders),
    receiveModels: (message) => wizard.receiveModels(message),
    receiveAgentCheck: (message) => wizard.receiveAgentCheck(message),
    receiveCursorApiKey: (message) => wizard.receiveCursorApiKey(message),
    receiveOmpLogoutState: (message) => wizard.receiveLogoutState(message),
    receiveSystemCertificates: (message) => wizard.receiveSystemCertificates(message),
    receiveFolderChildren: (message) => wizard.receiveFolderChildren(message),
    receiveInstructionFiles: (message) => wizard.receiveInstructionFiles(message),
    projectPresent(present) {
      if (present) wizard.close();
      else wizard.open("first");
    },
  };
};
