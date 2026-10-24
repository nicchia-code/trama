import { useSyncExternalStore } from "react";
import type { ToChatHost, ToChatWebview } from "../../omp-chat-protocol";
import { GENERAL_ID } from "../../../../src/core/omp-chat-view";
import { TooltipProvider } from "../ui/tooltip";
import { Conversation, type ConversationActions } from "./conversation";
import { answerFormIn, answerPermissionIn, type ChatStore, reduce, selectedOf, selectTab, sendMessage } from "./state";
import { ConversationTabs } from "./tabs";

/** What the view does with a message of the host, and what its controls ask of it. */
export interface ChatController extends ConversationActions {
  /** A message of the host. */
  receive(message: ToChatWebview): void;
  select(id: string): void;
  close(id: string): void;
}

export function createChatController(store: ChatStore, post: (message: ToChatHost) => void, now: () => number = Date.now): ChatController {
  return {
    receive: (message) => store.set(reduce(store.get(), message, now())),
    select(id) {
      store.set(selectTab(store.get(), id));
      post({ type: "selectConversation", id });
    },
    close(id) {
      // The Clear button of General (and Delete on its tab) clears it; once it is kept, its tab closes like the others.
      if (id === GENERAL_ID && store.get().conversations[GENERAL_ID]?.status?.phase !== "kept") post({ type: "clearGeneral" });
      else post({ type: "closeConversation", id });
    },
    send(id, text) {
      const messageId = crypto.randomUUID();
      store.set(sendMessage(store.get(), id, text, now(), messageId));
      post({ type: "sendMessage", id, text, messageId });
    },
    setSendMode(mode) {
      store.set({ ...store.get(), sendMode: mode });
      post({ type: "setSendMode", mode });
    },
    stop: (id) => post({ type: "stopAgent", id }),
    setModel: (id, model) => post({ type: "setModel", id, model }),
    answer(id, requestId, answer) {
      store.set(answerFormIn(store.get(), id, requestId, answer));
      post({ type: "formAnswer", id, requestId, answer });
    },
    choose(id, requestId, optionId) {
      store.set(answerPermissionIn(store.get(), id, requestId, optionId));
      post({ type: "permissionAnswer", id, requestId, optionId });
    },
    openFile: (path) => post({ type: "openFile", path }),
    openLink: (url) => post({ type: "openLink", url }),
    installOmp: () => post({ type: "installOmp" }),
  };
}

/** The view with no conversation (`omp-chat/Empty`): one sentence in secondary text, and nothing else. */
function Empty() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
      <p>Trama&apos;s jobs with omp open here, one conversation each.</p>
    </div>
  );
}

/** The omp Chat view: Empty without conversations, otherwise the row of tabs over the conversation of the one in view. */
export function ChatApp({ store, controller }: { store: ChatStore; controller: ChatController }) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  if (state.items.length === 0) return <Empty />;
  const selected = selectedOf(state);
  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <ConversationTabs items={state.items} selected={selected} generalKept={state.conversations[GENERAL_ID]?.status?.phase === "kept"} onSelect={controller.select} onClose={controller.close} />
        {state.items.map((item) => {
          const view = state.conversations[item.id];
          return view === undefined ? null : <Conversation key={item.id} item={item} view={view} selected={item.id === selected} actions={controller} sendMode={state.sendMode} />;
        })}
      </div>
    </TooltipProvider>
  );
}
