import { expect, test } from "bun:test";
import { THEME_INIT_SCRIPT, THEME_KEY, parseTheme, resolveTheme } from "../site/src/lib/theme";

test("only light and dark are a stored choice", () => {
  expect(parseTheme("light")).toBe("light");
  expect(parseTheme("dark")).toBe("dark");
  expect(parseTheme("auto")).toBeNull();
  expect(parseTheme(null)).toBeNull();
  expect(parseTheme(undefined)).toBeNull();
});

test("the visitor's choice wins over the system's preference, which decides when there is none", () => {
  expect(resolveTheme("light", true)).toBe("light");
  expect(resolveTheme("dark", false)).toBe("dark");
  expect(resolveTheme(null, true)).toBe("dark");
  expect(resolveTheme(null, false)).toBe("light");
});

/** Runs the script of the `<head>` against a fake page and returns the classes it leaves on the root element. */
function runInitScript(stored: string | null | "blocked", systemDark: boolean): string[] {
  const classes = new Set<string>();
  const document = {
    documentElement: {
      classList: {
        toggle: (name: string, force: boolean) => void (force ? classes.add(name) : classes.delete(name)),
        add: (name: string) => void classes.add(name),
      },
    },
  };
  const localStorage = {
    getItem: (key: string) => {
      if (stored === "blocked") throw new Error("storage is blocked");
      return key === THEME_KEY ? stored : null;
    },
  };
  const matchMedia = (query: string) => ({ matches: query === "(prefers-color-scheme: dark)" && systemDark });
  new Function("document", "localStorage", "matchMedia", THEME_INIT_SCRIPT)(document, localStorage, matchMedia);
  return [...classes].sort();
}

test("the script of the head applies the same rule before the first paint, and marks the page as scripted", () => {
  expect(runInitScript("dark", false)).toEqual(["dark", "js"]);
  expect(runInitScript("light", true)).toEqual(["js"]);
  expect(runInitScript(null, true)).toEqual(["dark", "js"]);
  expect(runInitScript(null, false)).toEqual(["js"]);
  expect(runInitScript("auto", true)).toEqual(["dark", "js"]);
});

test("the script of the head follows the system when the browser blocks the storage", () => {
  expect(runInitScript("blocked", true)).toEqual(["dark", "js"]);
  expect(runInitScript("blocked", false)).toEqual(["js"]);
});
