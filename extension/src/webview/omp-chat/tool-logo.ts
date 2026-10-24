import { siC, siCplusplus, siCss, siGnubash, siGo, siHtml5, siJavascript, siJson, siKotlin, siMarkdown, siOpenjdk, siPhp, siPython, siRuby, siRust, siSharp, siSwift, siTypescript, siYaml } from "simple-icons";

// The logo a tool call row shows in place of its icon for its type (`ui#omp-chat-conversation`, «Loghi delle chiamate»). Pure: the components draw the logo.

export interface ToolLogo {
  /** The name read aloud before the title, e.g. `Python`. */
  name: string;
  /** The path of the logo, in a 24 × 24 box. */
  path: string;
}

export interface ToolLabel {
  /** The title to show, without the prefix that named the language. */
  title: string;
  /** The logo to show in place of the icon for the type; none keeps the icon for the type. */
  logo?: ToolLogo;
}

const PYTHON: ToolLogo = { name: "Python", path: siPython.path };
const JAVASCRIPT: ToolLogo = { name: "JavaScript", path: siJavascript.path };
const TYPESCRIPT: ToolLogo = { name: "TypeScript", path: siTypescript.path };
const JSON_LOGO: ToolLogo = { name: "JSON", path: siJson.path };
const MARKDOWN: ToolLogo = { name: "Markdown", path: siMarkdown.path };
const HTML: ToolLogo = { name: "HTML", path: siHtml5.path };
const CSS: ToolLogo = { name: "CSS", path: siCss.path };
const YAML: ToolLogo = { name: "YAML", path: siYaml.path };
const RUST: ToolLogo = { name: "Rust", path: siRust.path };
const GO: ToolLogo = { name: "Go", path: siGo.path };
const JAVA: ToolLogo = { name: "Java", path: siOpenjdk.path };
const SWIFT: ToolLogo = { name: "Swift", path: siSwift.path };
const KOTLIN: ToolLogo = { name: "Kotlin", path: siKotlin.path };
const C: ToolLogo = { name: "C", path: siC.path };
const CPP: ToolLogo = { name: "C++", path: siCplusplus.path };
const CSHARP: ToolLogo = { name: "C#", path: siSharp.path };
const RUBY: ToolLogo = { name: "Ruby", path: siRuby.path };
const PHP: ToolLogo = { name: "PHP", path: siPhp.path };
const SHELL: ToolLogo = { name: "Shell script", path: siGnubash.path };

/** Code cells of omp: the prefix in the title names the language. */
const CELL_PREFIXES: Record<string, ToolLogo> = { "[py] ": PYTHON, "[js] ": JAVASCRIPT };

/** The logo of a file by its lowercase extension. */
const BY_EXTENSION: Record<string, ToolLogo> = {
  py: PYTHON,
  js: JAVASCRIPT, mjs: JAVASCRIPT, cjs: JAVASCRIPT, jsx: JAVASCRIPT,
  ts: TYPESCRIPT, tsx: TYPESCRIPT, mts: TYPESCRIPT, cts: TYPESCRIPT,
  json: JSON_LOGO,
  md: MARKDOWN,
  html: HTML, htm: HTML,
  css: CSS,
  yml: YAML, yaml: YAML,
  rs: RUST,
  go: GO,
  java: JAVA,
  swift: SWIFT,
  kt: KOTLIN, kts: KOTLIN,
  c: C, h: C,
  cpp: CPP, cc: CPP, cxx: CPP, hpp: CPP,
  cs: CSHARP,
  rb: RUBY,
  php: PHP,
  sh: SHELL, bash: SHELL, zsh: SHELL,
};

/** The logo of the file a path names, by its extension; none when the path has no extension or Trama has no logo for it. */
function logoOfPath(path: string): ToolLogo | undefined {
  const name = path.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const extension = name.slice(dot + 1).toLowerCase();
  return Object.hasOwn(BY_EXTENSION, extension) ? BY_EXTENSION[extension] : undefined;
}

/**
 * The title and logo of a tool call row, from its title and the first file its ACP `locations` name.
 * A code cell (`[py] `, `[js] `) gets its language's logo; a shell command (`$ `) keeps the icon for its type; a file gets the logo of its extension.
 */
export function toolLabel(title: string, firstPath: string | undefined): ToolLabel {
  for (const prefix of Object.keys(CELL_PREFIXES)) {
    if (title.startsWith(prefix)) return { title: title.slice(prefix.length), logo: CELL_PREFIXES[prefix] };
  }
  if (title.startsWith("$ ")) return { title: title.slice(2) };
  const logo = firstPath === undefined ? undefined : logoOfPath(firstPath);
  return logo === undefined ? { title } : { title, logo };
}
