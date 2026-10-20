// Registers happy-dom as the global DOM of every `bun test` run, for the webview component tests.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
