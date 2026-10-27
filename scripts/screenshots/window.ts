// One launched VS Code (`scripts/screenshots.ts` launches one for every scene and theme): Playwright's Electron support, the extension under development, an empty user profile and a
// window of 1440×900 whatever the screen is. The class knows the places of the window (the editor's own parts and the extension's webviews) and how to run a command, wait and take the picture.
import { type ElectronApplication, type FrameLocator, type Locator, type Page, _electron } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Area, Surface, Target, Theme } from "./types";

export const WINDOW = { width: 1440, height: 900 } as const;

/** How long a step waits for what it needs before the scene fails. */
export const STEP_TIMEOUT_MS = 20_000;

/** The names of the editor's themes the scenes use, one for each theme of Trama's `Theme` setting. */
const COLOR_THEMES: Record<Theme, string> = { light: "Default Light Modern", dark: "Default Dark Modern" };

/** The environment variables of the shell that runs the script that would change the launched VS Code (the script may itself run inside an editor or an agent). */
const INHERITED = /^(ELECTRON_|VSCODE_|TRAMA_|NODE_OPTIONS|OMP_STANDIN)/;

export interface LaunchOptions {
  /** The VS Code executable (`downloadAndUnzipVSCode`). */
  executable: string;
  /** The folder of the extension under development. */
  extension: string;
  /** The folder to open, or undefined to open none. */
  project: string | undefined;
  theme: Theme;
  /** The folder with the stand-in `omp`, first on the PATH. */
  bin: string;
  /** Where the stand-in omp writes what Trama gave each job. */
  standin: string;
  /** A fresh folder for the user profile. */
  profile: string;
  /** Settings of the user besides the theme. */
  settings: Record<string, unknown>;
}

/** The user settings of every scene: the theme, nothing that distracts (tips, update notices, welcome, the editor's own chat) and a plain shell for the terminal area. */
function userSettings(theme: Theme, extra: Record<string, unknown>): Record<string, unknown> {
  const shell = { path: "/bin/bash", args: ["--noprofile", "--norc"], env: { PS1: "$ " } };
  return {
    "workbench.colorTheme": COLOR_THEMES[theme],
    "trama.theme": theme,
    "trama.ompChatApproval": "yolo",
    "workbench.startupEditor": "none",
    "workbench.tips.enabled": false,
    "workbench.enableExperiments": false,
    "telemetry.telemetryLevel": "off",
    "update.mode": "none",
    "update.showReleaseNotes": false,
    "extensions.autoCheckUpdates": false,
    "extensions.ignoreRecommendations": true,
    "security.workspace.trust.enabled": false,
    "chat.disableAIFeatures": true,
    "window.titleBarStyle": "native",
    "window.customTitleBarVisibility": "never",
    "window.restoreWindows": "none",
    // Dialogs are drawn by the editor, in the window, where the picture can take them.
    "window.dialogStyle": "custom",
    "editor.minimap.enabled": false,
    "editor.wordWrap": "on",
    "editor.fontSize": 14,
    "terminal.integrated.profiles.osx": { trama: shell },
    "terminal.integrated.profiles.linux": { trama: shell },
    "terminal.integrated.defaultProfile.osx": "trama",
    "terminal.integrated.defaultProfile.linux": "trama",
    "terminal.integrated.fontSize": 13,
    ...extra,
  };
}

/** The parts of the window a webview sits over: the editor shows the webviews of its tabs, the side bars the views of the extension. */
const PARTS = { panel: ".part.editor", menu: ".part.sidebar", chat: ".part.auxiliarybar" } as const;

export class Window {
  private constructor(
    readonly app: ElectronApplication,
    readonly page: Page,
    private readonly userSettingsFile: string,
    private readonly theme: Theme,
  ) {}

  static async launch(options: LaunchOptions): Promise<Window> {
    const user = join(options.profile, "u");
    mkdirSync(join(user, "User"), { recursive: true });
    const settingsFile = join(user, "User", "settings.json");
    writeFileSync(settingsFile, JSON.stringify(userSettings(options.theme, options.settings), null, 2));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !INHERITED.test(key))) as Record<string, string>;
    const app = await _electron.launch({
      executablePath: options.executable,
      args: [
        `--extensionDevelopmentPath=${options.extension}`,
        `--user-data-dir=${user}`,
        `--extensions-dir=${join(options.profile, "x")}`,
        "--skip-welcome",
        "--skip-release-notes",
        "--disable-workspace-trust",
        "--disable-telemetry",
        "--disable-updates",
        // One CSS pixel is one device pixel, so the images have the same size on every screen.
        "--force-device-scale-factor=1",
        ...(options.project === undefined ? [] : [options.project]),
      ],
      // `VSCODE_CLI` keeps the editor from asking a login shell for its environment: the stand-in omp stays first on the PATH.
      env: { ...env, VSCODE_CLI: "1", PATH: `${options.bin}:${env["PATH"] ?? ""}`, OMP_STANDIN_DIR: options.standin },
      timeout: 60_000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(STEP_TIMEOUT_MS);
    await page.waitForSelector(".monaco-workbench", { timeout: 60_000 });
    // The window is 1440×900 whatever the screen allows; the page is laid out at that size.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setDeviceMetricsOverride", { ...WINDOW, deviceScaleFactor: 1, mobile: false });
    return new Window(app, page, settingsFile, options.theme);
  }

  /**
   * The webview of a surface; the inner frame is the extension's own page. The editor puts a webview in a layer of its own, over the window and outside the part it belongs to, so the shown
   * iframes are marked first with the part they lie over (`data-surface`).
   */
  async webview(surface: Exclude<Surface, "window">): Promise<FrameLocator> {
    await this.page.evaluate((parts) => {
      for (const frame of document.querySelectorAll<HTMLElement>("iframe.webview")) {
        frame.removeAttribute("data-surface");
        const box = frame.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || getComputedStyle(frame).visibility === "hidden") continue;
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        for (const [name, selector] of Object.entries(parts)) {
          const part = document.querySelector(selector)?.getBoundingClientRect();
          if (part !== undefined && x >= part.left && x <= part.right && y >= part.top && y <= part.bottom) frame.setAttribute("data-surface", name);
        }
      }
    }, PARTS);
    return this.page.frameLocator(`iframe.webview[data-surface="${surface}"]`).frameLocator("iframe#active-frame");
  }

  /** The element a target names, in a surface. */
  async locate(surface: Surface, target: Target): Promise<Locator> {
    const root = surface === "window" ? this.page : await this.webview(surface);
    const base = (scope: Page | FrameLocator | Locator, t: Target): Locator => {
      const exact = t.exact === true;
      let found: Locator;
      if (t.button !== undefined) found = scope.locator('button, a, [role="button"], [role="menuitem"], [role="tab"], [role="option"]').filter({ hasText: t.button });
      else if (t.role !== undefined) found = scope.getByRole(t.role, t.name === undefined ? {} : { name: t.name, exact });
      else if (t.text !== undefined) found = scope.getByText(t.text, { exact });
      else if (t.placeholder !== undefined) found = scope.getByPlaceholder(t.placeholder, { exact });
      else if (t.label !== undefined) found = scope.getByLabel(t.label, { exact });
      else if (t.css !== undefined) found = scope.locator(t.css);
      else throw new Error("a target needs a button, role, text, placeholder, label or css");
      return t.hasText === undefined ? found : found.filter({ hasText: t.hasText });
    };
    let scope: Page | FrameLocator | Locator = root;
    if (target.within !== undefined) scope = base(scope, target.within).first();
    return base(scope, target).filter({ visible: true }).nth(target.nth ?? 0);
  }

  /**
   * Runs a command of the editor by its identifier (`trama.showBoard`, `workbench.action.closeAuxiliaryBar`), the way the editor's own menu does: through the window's main process, so it works
   * wherever the keyboard focus is (a webview does not pass the command palette's shortcut on).
   */
  async command(id: string, args: unknown[] = []): Promise<void> {
    await this.app.evaluate(({ BrowserWindow }, command) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send("vscode:runAction", { id: command.id, from: "menu", args: command.args });
    }, { id, args });
    await this.page.waitForTimeout(350);
  }

  /** Sets a setting of the user while the editor runs: the editor reads the file again by itself. */
  async setSetting(settings: Record<string, unknown>, extra: Record<string, unknown>): Promise<void> {
    writeFileSync(this.userSettingsFile, JSON.stringify({ ...userSettings(this.theme, settings), ...extra }, null, 2));
    await this.page.waitForTimeout(800);
  }

  /**
   * Writes what depends on the moment of the run the same in every picture, so the two themes of a scene show the same text: the time stamp in the name of a written request and the
   * time of day of a card.
   */
  async normalize(): Promise<void> {
    for (const frame of this.page.frames()) {
      await frame
        .evaluate(() => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
            const text = node.nodeValue ?? "";
            const fixed = text.replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/g, "2026-01-15T10-00-00").replace(/\b\d{1,2}:\d{2}\s?(AM|PM)\b/g, "10:00 AM");
            if (fixed !== text) node.nodeValue = fixed;
          }
        })
        .catch(() => undefined);
    }
  }

  /** Dismisses the editor's own toasts and, unless the scene holds the pointer on an element, moves it out of the way. */
  async tidy(keepPointer: boolean): Promise<void> {
    await this.command("notifications.clearAll");
    if (!keepPointer) await this.page.mouse.move(WINDOW.width / 2, WINDOW.height - 2);
  }

  /** Writes the picture of the window, or of `area` of it, as a PNG. */
  async capture(file: string, area: Area | undefined, keepPointer: boolean): Promise<void> {
    await this.tidy(keepPointer);
    await this.normalize();
    await this.page.waitForTimeout(400);
    await this.page.screenshot({ path: file, clip: area === undefined ? { x: 0, y: 0, ...WINDOW } : area, animations: "disabled", caret: "initial" });
  }

  async close(): Promise<void> {
    await this.app.close().catch(() => undefined);
  }

  /** The folder of a profile is a scratch folder: removed with everything in it. */
  static discard(folder: string): void {
    rmSync(folder, { recursive: true, force: true });
  }
}
