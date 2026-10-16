/** The sources of the agent language at first start. Pure: the caller reads the environment, Intl and the editor. */
export interface LanguageSources {
  env: Readonly<Record<string, string | undefined>>;
  /** `Intl.DateTimeFormat().resolvedOptions().locale`, when it could be read. */
  intlLocale?: string;
  /** `vscode.env.language`, the editor's interface language. */
  editorLanguage?: string;
}

/** The language subtag of a locale such as `it_IT.UTF-8`, `pt-BR` or `en`; undefined for `C`, `POSIX` and empty values. */
function localeLanguage(value: string | undefined): string | undefined {
  const base = value?.split(/[.@]/)[0]?.trim() ?? "";
  if (base === "" || base.toLowerCase() === "c" || base.toLowerCase() === "posix") return undefined;
  return base.split(/[_-]/)[0]?.toLowerCase() || undefined;
}

/** The English name of a language code; undefined when the code is unknown, malformed or invalid. */
function englishName(code: string | undefined): string | undefined {
  if (code === undefined || !/^[a-z]{2,3}$/.test(code) || code === "und") return undefined;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    return name && name !== code ? name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The English name of the agent language: the first usable environment locale (`LC_ALL`, `LC_MESSAGES`, `LANG`),
 * else the Intl locale, else the editor's language; `English` when none of them names a language.
 */
export function detectLanguageName(sources: LanguageSources): string {
  const fromEnv = ["LC_ALL", "LC_MESSAGES", "LANG"].map((key) => localeLanguage(sources.env[key])).find((code) => code !== undefined);
  for (const code of [fromEnv, localeLanguage(sources.intlLocale), localeLanguage(sources.editorLanguage)]) {
    const name = englishName(code);
    if (name !== undefined) return name;
  }
  return "English";
}
