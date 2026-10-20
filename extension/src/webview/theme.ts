/** The panel's theme: the shadcn/ui light or dark variables, chosen by the class `dark` on the root. */
export type ThemeSetting = "auto" | "light" | "dark";
export type Theme = "light" | "dark";

/**
 * The theme the editor shows, read from the classes it puts on the `body`: `vscode-light` and `vscode-high-contrast-light`
 * are light, `vscode-dark` and `vscode-high-contrast` dark. A high-contrast light theme carries both high-contrast classes,
 * so the light one is looked at first. Without any of them the editor's default, dark, applies.
 */
export function editorTheme(bodyClasses: Iterable<string>): Theme {
  const classes = new Set(bodyClasses);
  if (classes.has("vscode-light") || classes.has("vscode-high-contrast-light")) return "light";
  return "dark";
}

/** The theme for a setting: `light` and `dark` are fixed, `auto` follows the editor's. */
export function resolveTheme(setting: ThemeSetting, bodyClasses: Iterable<string>): Theme {
  return setting === "auto" ? editorTheme(bodyClasses) : setting;
}

export interface ThemeController {
  /** The setting `trama.theme` the host sent; `auto` until it does. */
  setSetting(setting: ThemeSetting): void;
  /** Stops observing the `body`. */
  dispose(): void;
}

/**
 * Keeps the `dark` class of `root` in line with the theme: applies it now and again as soon as the classes of `body`
 * change (observed with a `MutationObserver`, so the panel follows the editor's theme without a message).
 */
export function startTheme(body: HTMLElement = document.body, root: HTMLElement = document.documentElement): ThemeController {
  let setting: ThemeSetting = "auto";
  const apply = () => root.classList.toggle("dark", resolveTheme(setting, body.classList) === "dark");
  const observer = new MutationObserver(apply);
  observer.observe(body, { attributes: true, attributeFilter: ["class"] });
  apply();
  return {
    setSetting(next) {
      setting = next;
      apply();
    },
    dispose: () => observer.disconnect(),
  };
}
