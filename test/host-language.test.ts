import { expect, test } from "bun:test";
import { detectLanguageName } from "../extension/src/host/language";

test("the first usable POSIX locale names the language, whatever its encoding and region", () => {
  expect(detectLanguageName({ env: { LANG: "it_IT.UTF-8" } })).toBe("Italian");
  expect(detectLanguageName({ env: { LANG: "pt_BR.utf8@euro" } })).toBe("Portuguese");
  expect(detectLanguageName({ env: { LC_MESSAGES: "de_DE.UTF-8", LANG: "it_IT.UTF-8" } })).toBe("German");
  expect(detectLanguageName({ env: { LC_ALL: "fr_FR.UTF-8", LC_MESSAGES: "de_DE", LANG: "it_IT" } })).toBe("French");
});

test("C, POSIX and empty locales are skipped", () => {
  expect(detectLanguageName({ env: { LC_ALL: "C", LC_MESSAGES: "", LANG: "POSIX" }, intlLocale: "es-ES" })).toBe("Spanish");
  expect(detectLanguageName({ env: { LANG: "C.UTF-8" }, editorLanguage: "ja" })).toBe("Japanese");
  expect(detectLanguageName({ env: { LANG: "  " } })).toBe("English");
});

test("without an environment locale, Intl is used, then the editor language", () => {
  expect(detectLanguageName({ env: {}, intlLocale: "it-IT", editorLanguage: "de" })).toBe("Italian");
  expect(detectLanguageName({ env: {}, intlLocale: undefined, editorLanguage: "pt-br" })).toBe("Portuguese");
  expect(detectLanguageName({ env: {}, editorLanguage: "it" })).toBe("Italian");
});

test("a source whose code is unknown or malformed falls through to the next one", () => {
  expect(detectLanguageName({ env: { LANG: "zz_ZZ.UTF-8" }, intlLocale: "it-IT" })).toBe("Italian");
  expect(detectLanguageName({ env: { LANG: "1x" }, editorLanguage: "fr" })).toBe("French");
  expect(detectLanguageName({ env: {}, intlLocale: "und", editorLanguage: "nl" })).toBe("Dutch");
});

test("an unknown code everywhere, or no source at all, saves English", () => {
  expect(detectLanguageName({ env: { LANG: "qqq_QQ" }, intlLocale: "und", editorLanguage: "zz" })).toBe("English");
  expect(detectLanguageName({ env: {} })).toBe("English");
});
