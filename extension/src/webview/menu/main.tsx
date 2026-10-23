import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import tailwind from "tailwind:css";
import type { MenuState, ToMenuHost, ToMenuWebview } from "../../menu-protocol";
import { startTheme } from "../theme";
import { MenuApp } from "./app";

declare function acquireVsCodeApi(): { postMessage(message: ToMenuHost): void };

const vscode = acquireVsCodeApi();
const post = (message: ToMenuHost) => vscode.postMessage(message);

// The Tailwind sheet with the shadcn/ui theme, the same as the panel's.
const style = document.createElement("style");
style.textContent = tailwind;
document.head.append(style);

/** `auto` until the host sends `trama.theme`: the menu follows the classes of the editor's `body`. */
const theme = startTheme();

let state: MenuState | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

function App() {
  return <MenuApp state={useSyncExternalStore(subscribe, () => state)} post={post} />;
}

createRoot(document.getElementById("app") as HTMLElement).render(<App />);

window.addEventListener("message", (event: MessageEvent<ToMenuWebview>) => {
  const message = event.data;
  if (message.type === "theme") theme.setSetting(message.setting);
  else if (message.type === "menuState") {
    const { type: _type, ...next } = message;
    state = next;
    for (const listener of listeners) listener();
  }
});

post({ type: "ready" });
