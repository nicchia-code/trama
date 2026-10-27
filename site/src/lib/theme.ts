/** The site's theme: the panel's light or dark palette, chosen by the class `dark` on the root element. */
export type Theme = "light" | "dark";

/** The `localStorage` key of the visitor's choice. */
export const THEME_KEY = "trama-theme";

/** A stored value that is a theme; anything else (nothing stored, a value from an older version) is no choice. */
export function parseTheme(value: string | null | undefined): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

/** The visitor's choice when there is one, the system's preference otherwise. */
export function resolveTheme(stored: Theme | null, systemDark: boolean): Theme {
  return stored ?? (systemDark ? "dark" : "light");
}

/**
 * Runs in the `<head>` of every page before the first paint, so the page never flashes the wrong theme: it sets the
 * class `dark` and the class `js` (which the scroll animations need) on the root element. It has no imports, because
 * it is written into the page as it is; `resolveTheme` is the same rule, tested.
 */
export const THEME_INIT_SCRIPT = `(function () {
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem(${JSON.stringify(THEME_KEY)}); } catch (e) {}
  var dark = stored === "dark" || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.classList.add("js");
})();`;
