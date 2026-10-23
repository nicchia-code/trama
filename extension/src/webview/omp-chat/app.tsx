import { useSyncExternalStore } from "react";
import type { ToChatHost, ToChatWebview } from "../../omp-chat-protocol";
import { TooltipProvider } from "../ui/tooltip";
import { Conversation, type ConversationActions } from "./conversation";
import { answerFormIn, type ChatStore, reduce, selectedOf, selectTab, sendMessage } from "./state";
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
    close: (id) => post({ type: "closeConversation", id }),
    send(id, text) {
      store.set(sendMessage(store.get(), id, text, now()));
      post({ type: "sendMessage", id, text });
    },
    stop: (id) => post({ type: "stopAgent", id }),
    setModel: (id, model) => post({ type: "setModel", id, model }),
    answer(id, requestId, answer) {
      store.set(answerFormIn(store.get(), id, requestId, answer));
      post({ type: "formAnswer", id, requestId, answer });
    },
    openFile: (path) => post({ type: "openFile", path }),
    openLink: (url) => post({ type: "openLink", url }),
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
        <ConversationTabs items={state.items} selected={selected} onSelect={controller.select} onClose={controller.close} />
        {state.items.map((item) => {
          const view = state.conversations[item.id];
          return view === undefined ? null : <Conversation key={item.id} item={item} view={view} selected={item.id === selected} actions={controller} />;
        })}
      </div>
    </TooltipProvider>
  );
}
