import { afterEach, expect, test } from "bun:test";
import { waitFor } from "@testing-library/react";
import { editorTheme, resolveTheme, startTheme } from "../extension/src/webview/theme";

afterEach(() => {
  document.body.className = "";
  document.documentElement.className = "";
});

test("the editor's body classes give the theme, the light high-contrast one included", () => {
  expect(editorTheme(["vscode-light"])).toBe("light");
  expect(editorTheme(["vscode-high-contrast", "vscode-high-contrast-light"])).toBe("light");
  expect(editorTheme(["vscode-dark"])).toBe("dark");
  expect(editorTheme(["vscode-high-contrast"])).toBe("dark");
  expect(resolveTheme("light", ["vscode-dark"])).toBe("light");
  expect(resolveTheme("dark", ["vscode-light"])).toBe("dark");
});

test("with auto the theme changes when the classes of the body change", async () => {
  document.body.className = "vscode-dark";
  const theme = startTheme();
  const root = document.documentElement;
  expect(root.classList.contains("dark")).toBe(true);

  document.body.className = "vscode-light";
  await waitFor(() => expect(root.classList.contains("dark")).toBe(false));

  document.body.className = "vscode-high-contrast";
  await waitFor(() => expect(root.classList.contains("dark")).toBe(true));
  theme.dispose();
});

test("a fixed theme ignores the body, and auto follows it again", async () => {
  document.body.className = "vscode-light";
  const theme = startTheme();
  const root = document.documentElement;
  theme.setSetting("dark");
  expect(root.classList.contains("dark")).toBe(true);
  document.body.className = "vscode-light vscode-extra";
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(root.classList.contains("dark")).toBe(true);
  theme.setSetting("auto");
  expect(root.classList.contains("dark")).toBe(false);
  theme.dispose();
});
