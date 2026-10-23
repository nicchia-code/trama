import { createRoot } from "react-dom/client";
import tailwind from "tailwind:css";
import type { ToChatHost, ToChatWebview } from "../../omp-chat-protocol";
import { startTheme } from "../theme";
import { ChatApp, createChatController } from "./app";
import { createChatStore } from "./state";

declare function acquireVsCodeApi(): { postMessage(message: ToChatHost): void };

const vscode = acquireVsCodeApi();
const post = (message: ToChatHost) => vscode.postMessage(message);

// The Tailwind sheet with the shadcn/ui theme, the same as the panel's.
const style = document.createElement("style");
style.textContent = tailwind;
document.head.append(style);

/** `auto` until the host sends `trama.theme`: the view follows the classes of the editor's `body`. */
const theme = startTheme();

const store = createChatStore();
const controller = createChatController(store, post);

createRoot(document.getElementById("app") as HTMLElement).render(<ChatApp store={store} controller={controller} />);

window.addEventListener("message", (event: MessageEvent<ToChatWebview>) => {
  const message = event.data;
  if (message.type === "theme") theme.setSetting(message.setting);
  controller.receive(message);
});

post({ type: "ready" });
