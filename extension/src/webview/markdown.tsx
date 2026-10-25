// The one Markdown renderer of the panel. `parseMarkdown` and `parseInline` are pure and return a small tree, so they run
// without a browser page; `Markdown` and `InlineMarkdown` turn that tree into React elements with the text as
// children, never `dangerouslySetInnerHTML` or `innerHTML`, so a text from a file cannot inject markup or script.
//
// Supported: paragraphs, headings, bold, italic, strikethrough, inline code, fenced code blocks (`mermaid` ones are drawn
// as diagrams by `mermaid-diagram.tsx`), bulleted and numbered lists (nested too), task lists, block quotes, links, bare
// http and https addresses, GitHub references (`#123`, `@handle`, links only when the host sent the project's repository)
// and pipe tables. Images and raw HTML are not interpreted: they show as written. Anything that cannot be read as
// Markdown (an unclosed `*`, a stray backtick) also shows as written.

import { createContext, type ReactNode, useContext } from "react";
import { safeLink } from "../../../src/core/links";
import { MermaidDiagram } from "./mermaid-diagram";

export type Inline =
  | { t: "text"; text: string }
  | { t: "code"; text: string }
  | { t: "em"; c: Inline[] }
  | { t: "strong"; c: Inline[] }
  | { t: "del"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  /** `#123`: a link to issue or pull request `n` of the project's repository, when the host sent one; text otherwise. */
  | { t: "issue"; n: number }
  /** `@handle`: a link to that GitHub user's page, when the host sent a repository; text otherwise. */
  | { t: "user"; name: string }
  | { t: "br" };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: number; c: Inline[] }
  | { t: "code"; lang: string; text: string }
  | { t: "quote"; c: Block[] }
  /** An item of a task list starts with this block (`- [ ]`, `- [x]`): the read-only checkbox before its text. Never elsewhere. */
  | { t: "task"; checked: boolean }
  | { t: "list"; ordered: boolean; start: number; items: Block[][] }
  | { t: "table"; align: Align[]; head: Inline[][]; rows: Inline[][][] };

/** Column alignment of a table, from the colons of its separator row; a column without colons is left. */
export type Align = "left" | "center" | "right";

// ---------------------------------------------------------------------------------------------------------------------
// Inline

const PUNCTUATION = /[!-/:-@[-`{-~]/;
const isSpace = (ch: string | undefined): boolean => ch === undefined || /\s/.test(ch);
const isWord = (ch: string | undefined): boolean => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);

/** End of a literal HTML fragment, keeping quoted attributes opaque to Markdown. */
function htmlEnd(s: string, at: number): number {
  if (s[at] !== "<") return -1;
  if (s.startsWith("<!--", at)) {
    const close = s.indexOf("-->", at + 4);
    return close === -1 ? -1 : close + 3;
  }
  if (!/^<(?:\/?[A-Za-z][\w-]*(?=[\s/>])|![A-Z]|\?)/.test(s.slice(at))) return -1;
  let quote: string | undefined;
  for (let i = at + 1; i < s.length; i++) {
    const ch = s[i];
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") return i + 1;
  }
  return -1;
}

/** Index of the `]` that closes the `[` at `open`, skipping code spans and escapes; -1 when there is none. */
function closingBracket(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\") i++;
    else if (ch === "`") {
      const run = /^`+/.exec(s.slice(i))?.[0] ?? "`";
      const end = s.indexOf(run, i + run.length);
      i = end === -1 ? i + run.length - 1 : end + run.length - 1;
    } else if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) return i;
  }
  return -1;
}

/** The `(destination "title")` that starts at `at`: its raw destination and the index after `)`; null when it is not one. */
function linkTarget(s: string, at: number): { url: string; end: number } | null {
  if (s[at] !== "(") return null;
  let depth = 0;
  let quote: string | undefined;
  for (let i = at; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\") i++;
    else if (quote !== undefined) {
      if (ch === quote) quote = undefined;
    } else if (depth === 1 && (ch === '"' || ch === "'") && isSpace(s[i - 1])) quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) {
      const inner = s.slice(at + 1, i).trim();
      const url = /^<([^<>]*)>/.exec(inner)?.[1] ?? /^\S*/.exec(inner)?.[0] ?? "";
      return { url, end: i + 1 };
    }
  }
  return null;
}

/** A run of `*` or `_` not paired yet: how many characters are left, and whether it can open or close emphasis. */
type Delim = { t: "delim"; ch: string; count: number; orig: number; open: boolean; close: boolean };
type Tok = Inline | Delim;

/** Turns the delimiters that stayed unpaired into text. Only the texts around such a run join: other texts keep their nodes. */
function plain(toks: Tok[]): Inline[] {
  const out: Inline[] = [];
  let joinNext = false;
  for (const tok of toks) {
    const last = out.at(-1);
    if (tok.t === "delim") {
      const text = tok.ch.repeat(tok.count);
      if (last?.t === "text") out[out.length - 1] = { t: "text", text: last.text + text };
      else out.push({ t: "text", text });
      joinNext = true;
    } else if (tok.t === "text" && joinNext && last?.t === "text") {
      out[out.length - 1] = { t: "text", text: last.text + tok.text };
      joinNext = false;
    } else {
      out.push(tok);
      joinNext = false;
    }
  }
  return out;
}

/** Whether `tok` can open emphasis that `closer` closes; CommonMark's rule of three keeps `*a**b*` and friends apart. */
function pairs(tok: Tok | undefined, closer: Delim): tok is Delim {
  if (tok === undefined || tok.t !== "delim" || !tok.open || tok.ch !== closer.ch || tok.count === 0) return false;
  const both = (tok.open && tok.close) || (closer.open && closer.close);
  return !(both && (tok.orig + closer.orig) % 3 === 0 && !(tok.orig % 3 === 0 && closer.orig % 3 === 0));
}

/** Pairs the runs of a paragraph the way CommonMark does: each closer takes the nearest opener before it, so pairs nest
 *  in source order, and a run that pairs with nothing is text. */
function emphasis(toks: Tok[]): Inline[] {
  let c = 0;
  while (c < toks.length) {
    const closer = toks[c];
    if (closer === undefined || closer.t !== "delim" || !closer.close) {
      c++;
      continue;
    }
    let o = c - 1;
    while (o >= 0 && !pairs(toks[o], closer)) o--;
    if (o < 0) {
      c++;
      continue;
    }
    const opener = toks[o] as Delim;
    const n = opener.count >= 2 && closer.count >= 2 ? 2 : 1;
    opener.count -= n;
    closer.count -= n;
    toks.splice(o + 1, c - o - 1, { t: closer.ch === "~" ? "del" : n === 2 ? "strong" : "em", c: plain(toks.slice(o + 1, c)) });
    c = o + 2;
    if (opener.count === 0) {
      toks.splice(o, 1);
      c--;
    }
    if (closer.count === 0) toks.splice(c, 1);
  }
  return plain(toks);
}

/** Inline Markdown of one paragraph or line. Newlines inside are soft breaks (a space), or hard ones after two spaces or a backslash. */
export function parseInline(s: string): Inline[] {
  const toks: Tok[] = [];
  let text = "";
  const flush = () => {
    if (text !== "") toks.push({ t: "text", text });
    text = "";
  };

  for (let i = 0; i < s.length; ) {
    const ch = s[i] as string;

    if (ch === "\\") {
      const next = s[i + 1];
      if (next === "\n") {
        flush();
        toks.push({ t: "br" });
        i += 2;
      } else if (next !== undefined && PUNCTUATION.test(next)) {
        text += next;
        i += 2;
      } else {
        text += ch;
        i++;
      }
      continue;
    }

    if (ch === "\n") {
      if (/ {2,}$/.test(text)) {
        text = text.replace(/ +$/, "");
        flush();
        toks.push({ t: "br" });
      } else text = `${text.replace(/ +$/, "")} `;
      i++;
      while (s[i] === " ") i++;
      continue;
    }

    if (ch === "`") {
      const run = /^`+/.exec(s.slice(i))?.[0] ?? "`";
      const end = s.indexOf(run, i + run.length);
      // A longer run of backticks never closes this one: only a run of exactly the same length does.
      let close = end;
      while (close !== -1 && s[close + run.length] === "`") close = s.indexOf(run, close + run.length + 1);
      if (close === -1) {
        text += run;
        i += run.length;
        continue;
      }
      let code = s.slice(i + run.length, close).replace(/\n/g, " ");
      if (code.length > 2 && code.startsWith(" ") && code.endsWith(" ") && code.trim() !== "") code = code.slice(1, -1);
      flush();
      toks.push({ t: "code", text: code });
      i = close + run.length;
      continue;
    }

    const html = htmlEnd(s, i);
    if (html !== -1) {
      text += s.slice(i, html);
      i = html;
      continue;
    }

    if (ch === "[" || (ch === "!" && s[i + 1] === "[")) {
      const open = ch === "!" ? i + 1 : i;
      const close = closingBracket(s, open);
      const target = close === -1 ? null : linkTarget(s, close + 1);
      if (target !== null) {
        if (ch === "!") {
          // An image is not supported: it shows as written.
          text += s.slice(i, target.end);
        } else {
          const label = parseInline(s.slice(open + 1, close));
          const href = safeLink(target.url);
          flush();
          if (href === null) toks.push(...label);
          else toks.push({ t: "link", href, c: stripLinks(label) });
        }
        i = target.end;
        continue;
      }
    }

    if ((ch === "h" || ch === "H") && !isWord(s[i - 1])) {
      const address = bareAddress(s, i);
      if (address !== null) {
        flush();
        toks.push({ t: "link", href: address.href, c: [{ t: "text", text: address.text }] });
        i += address.text.length;
        continue;
      }
    }

    if (ch === "#" || ch === "@") {
      const ref = githubReference(s, i);
      if (ref !== null) {
        flush();
        toks.push(ref.node);
        i = ref.end;
        continue;
      }
    }

    if (ch === "*" || ch === "_" || ch === "~") {
      let run = 0;
      while (s[i + run] === ch) run++;
      // Strikethrough is a run of exactly two tildes; any other run of tildes is text.
      if (ch === "~" && run !== 2) {
        text += ch.repeat(run);
        i += run;
        continue;
      }
      const before = s[i - 1];
      const after = s[i + run];
      flush();
      toks.push({
        t: "delim",
        ch,
        count: run,
        orig: run,
        open: !isSpace(after) && (ch !== "_" || !isWord(before)),
        close: !isSpace(before) && (ch !== "_" || !isWord(after)),
      });
      i += run;
      continue;
    }

    text += ch;
    i++;
  }
  flush();
  return emphasis(toks);
}

/** A link inside a link label is not a link: its text stays, and so does a GitHub reference's. Texts that end up side by side join. */
function stripLinks(nodes: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes.flatMap((n): Inline[] => {
    if (n.t === "link") return stripLinks(n.c);
    if (n.t === "issue") return [{ t: "text", text: `#${n.n}` }];
    if (n.t === "user") return [{ t: "text", text: `@${n.name}` }];
    if (n.t === "em" || n.t === "strong" || n.t === "del") return [{ ...n, c: stripLinks(n.c) }];
    return [n];
  })) {
    const last = out.at(-1);
    if (n.t === "text" && last?.t === "text") out[out.length - 1] = { t: "text", text: last.text + n.text };
    else out.push(n);
  }
  return out;
}

const BARE_ADDRESS = /https?:\/\/[^\s<>]+/iy;

/** The bare http or https address at `at`, as the link's text and its normalised target; null when there is none. A trailing
 *  `.`, `,`, `:`, `;`, `!`, `?` (and the `*`, `_`, `~` of emphasis around it) or a `)` without its `(` stays outside the link. */
function bareAddress(s: string, at: number): { text: string; href: string } | null {
  BARE_ADDRESS.lastIndex = at;
  let text = BARE_ADDRESS.exec(s)?.[0];
  if (text === undefined) return null;
  for (;;) {
    const last = text.at(-1);
    if (last !== undefined && ".,:;!?*_~".includes(last)) text = text.slice(0, -1);
    else if (last === ")" && text.split(")").length > text.split("(").length) text = text.slice(0, -1);
    else break;
  }
  const href = safeLink(text);
  return href === null ? null : { text, href };
}

/** What can stand before a GitHub reference: the start of a word. */
const REFERENCE_PREFIX = "([{\"'*_~,;:";
/** A `#123` or an `@handle` at `at`, with the index after it; null when it is not at the start of a word or not shaped like one. */
function githubReference(s: string, at: number): { node: Inline; end: number } | null {
  const before = s[at - 1];
  if (before !== undefined && !/\s/.test(before) && !REFERENCE_PREFIX.includes(before)) return null;
  if (s[at] === "#") {
    const number = /^[1-9]\d{0,8}/.exec(s.slice(at + 1, at + 10))?.[0];
    if (number === undefined) return null;
    const end = at + 1 + number.length;
    return isWord(s[end]) || s[end] === "_" ? null : { node: { t: "issue", n: Number.parseInt(number, 10) }, end };
  }
  // A user name, as the `GitHub handle` of a person: 1 to 39 letters, digits or single hyphens, never starting or ending with a hyphen,
  // then an optional `_shortcode` of letters and digits (GitHub Enterprise Managed Users, `32984238_EYGS`).
  const name = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*(?:_[A-Za-z0-9]+)?/.exec(s.slice(at + 1, at + 42))?.[0];
  if (name === undefined || name.length > 39) return null;
  const end = at + 1 + name.length;
  const next = s[end];
  if (isWord(next) || next === "_" || (next === "-" && s[end + 1] === "-")) return null;
  return { node: { t: "user", name }, end };
}

// ---------------------------------------------------------------------------------------------------------------------
// Blocks

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const QUOTE = /^ {0,3}>/;
const ITEM = /^( *)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;
const BLANK = /^\s*$/;
/** A table's header row (`| a | b |`) followed by its separator row (`|:--|:-:|--:|`), as GitHub writes them. */
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const tableStart = (lines: string[], i: number): boolean =>
  (lines[i] as string).includes("|") && i + 1 < lines.length && (lines[i + 1] as string).includes("-") && TABLE_SEPARATOR.test(lines[i + 1] as string);

/** The cells of one table row. Pipes split the cells, `\|` stays a pipe inside its cell, and the outer pipes are optional. */
function tableCells(line: string): string[] {
  const s = line.trim();
  const cells: string[] = [];
  let cell = "";
  for (let k = 0; k < s.length; k++) {
    const ch = s[k] as string;
    if (ch === "\\" && k + 1 < s.length) {
      cell += ch + (s[k + 1] as string);
      k++;
    } else if (ch === "|") {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  // A leading or trailing pipe leaves an empty cell at that end, which is not a column.
  if (cells[0] === "") cells.shift();
  if (cells.length > 1 && cells[cells.length - 1] === "") cells.pop();
  return cells.map((c) => c.trim());
}

const alignOf = (cell: string | undefined): Align => {
  const left = cell?.startsWith(":") ?? false;
  const right = cell?.endsWith(":") ?? false;
  return left && right ? "center" : right ? "right" : "left";
};

const startsBlock = (line: string): boolean => FENCE.test(line) || HEADING.test(line) || QUOTE.test(line) || ITEM.test(line);

/** Markdown text as blocks. Never throws: what is not recognised becomes a paragraph. */
export function parseMarkdown(source: string): Block[] {
  return parseBlocks(source.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n"));
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; ) {
    const line = lines[i] as string;
    if (BLANK.test(line)) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1] as string;
      const indent = /^ */.exec(line)?.[0].length ?? 0;
      const body: string[] = [];
      i++;
      // An unclosed fence runs to the end of the text.
      while (i < lines.length && !new RegExp(`^ {0,3}${marker[0] === "`" ? "`" : "~"}{${marker.length},}\\s*$`).test(lines[i] as string)) {
        body.push((lines[i] as string).replace(new RegExp(`^ {0,${indent}}`), ""));
        i++;
      }
      i++;
      blocks.push({ t: "code", lang: fence[2] ?? "", text: body.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ t: "h", level: (heading[1] as string).length, c: parseInline(heading[2] as string) });
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      // A quote goes on over lines that start with `>` and over lazy continuation lines of its paragraph.
      while (i < lines.length && !BLANK.test(lines[i] as string) && (QUOTE.test(lines[i] as string) || (inner.length > 0 && !startsBlock(lines[i] as string)))) {
        inner.push((lines[i] as string).replace(/^ {0,3}> ?/, ""));
        i++;
      }
      blocks.push({ t: "quote", c: parseBlocks(inner) });
      continue;
    }

    const item = ITEM.exec(line);
    if (item) {
      const ordered = /\d/.test(item[2] as string);
      const items: Block[][] = [];
      const baseIndent = (item[1] as string).length;
      const start = ordered ? Number.parseInt(item[2] as string, 10) : 1;
      while (i < lines.length) {
        const m = ITEM.exec(lines[i] as string);
        if (!m || (m[1] as string).length !== baseIndent || /\d/.test(m[2] as string) !== ordered) break;
        const contentIndent = baseIndent + (m[2] as string).length + 1;
        const content: string[] = [m[3] as string];
        i++;
        while (i < lines.length) {
          const next = lines[i] as string;
          if (BLANK.test(next)) {
            // A blank line stays in the item only when the next non-blank line is indented under it.
            let j = i;
            while (j < lines.length && BLANK.test(lines[j] as string)) j++;
            if (j < lines.length && /^ */.exec(lines[j] as string)![0].length >= contentIndent) {
              content.push("");
              i++;
              continue;
            }
            break;
          }
          const indent = /^ */.exec(next)![0].length;
          if (indent >= contentIndent) content.push(next.slice(contentIndent));
          else if (indent > baseIndent && ITEM.test(next)) content.push(next.slice(Math.min(indent, contentIndent)));
          else if (indent > baseIndent || (!startsBlock(next) && content.length > 0 && !BLANK.test(content[content.length - 1] as string))) content.push(next.trimStart());
          else break;
          i++;
        }
        // A task list item: `[ ]` or `[x]` and a space before the text; the checkbox leads the item's blocks.
        const task = /^\[([ xX])\][ \t]+(?=\S)/.exec(content[0] as string);
        if (task) content[0] = (content[0] as string).slice(task[0].length);
        const blocks = parseBlocks(content);
        items.push(task ? [{ t: "task", checked: task[1] !== " " }, ...blocks] : blocks);
        // Blank lines between items do not end the list.
        let j = i;
        while (j < lines.length && BLANK.test(lines[j] as string)) j++;
        const following = j < lines.length ? ITEM.exec(lines[j] as string) : null;
        if (following && (following[1] as string).length === baseIndent && /\d/.test(following[2] as string) === ordered) i = j;
      }
      blocks.push({ t: "list", ordered, start, items });
      continue;
    }

    if (tableStart(lines, i)) {
      const head = tableCells(lines[i] as string);
      const separator = tableCells(lines[i + 1] as string);
      const rows: string[][] = [];
      i += 2;
      // Body rows run to a blank line or to the next block.
      while (i < lines.length && !BLANK.test(lines[i] as string) && !startsBlock(lines[i] as string)) {
        rows.push(tableCells(lines[i] as string));
        i++;
      }
      // Every row gets as many cells as the header: missing cells are empty, extra cells are dropped.
      blocks.push({
        t: "table",
        align: head.map((_, col) => alignOf(separator[col])),
        head: head.map((cell) => parseInline(cell)),
        rows: rows.map((cells) => head.map((_, col) => parseInline(cells[col] ?? ""))),
      });
      continue;
    }

    const para: string[] = [];
    // A table that follows a line of text starts a new block, so its rows keep their place.
    while (i < lines.length && !BLANK.test(lines[i] as string) && (para.length === 0 || (!startsBlock(lines[i] as string) && !tableStart(lines, i)))) {
      para.push((lines[i] as string).trimStart());
      i++;
    }
    // Trailing spaces are kept on every line but the last: two of them make a hard break.
    blocks.push({ t: "p", c: parseInline(para.join("\n").trimEnd()) });
  }
  return blocks;
}

// ---------------------------------------------------------------------------------------------------------------------
// React elements

export type OpenLink = (url: string) => void;

/** The GitHub repository of the project (`owner/repo`) the host sent with the picture; null when it has none. With it `#123` and `@handle` are links. */
export const GithubRepoContext = createContext<string | null>(null);

/** What rendering needs besides the tree: where a followed link goes, and the repository GitHub references point to. */
interface Env {
  openLink: OpenLink;
  repo: string | null;
}

function anchor(key: number, href: string, env: Env, children: ReactNode) {
  return (
    <a
      key={key}
      href={href}
      title={href}
      rel="noreferrer noopener"
      // The webview never navigates: the editor host opens the address in the system browser.
      onClick={(event) => {
        event.preventDefault();
        env.openLink(href);
      }}
    >
      {children}
    </a>
  );
}

function inlineNodes(nodes: Inline[], env: Env): ReactNode[] {
  return nodes.map((n, key): ReactNode => {
    switch (n.t) {
      case "text":
        return n.text;
      case "br":
        return <br key={key} />;
      case "code":
        return <code key={key}>{n.text}</code>;
      case "em":
        return <em key={key}>{inlineNodes(n.c, env)}</em>;
      case "strong":
        return <strong key={key}>{inlineNodes(n.c, env)}</strong>;
      case "del":
        return <del key={key}>{inlineNodes(n.c, env)}</del>;
      case "link":
        return anchor(key, n.href, env, inlineNodes(n.c, env));
      case "issue":
        return env.repo === null ? `#${n.n}` : anchor(key, `https://github.com/${env.repo}/issues/${n.n}`, env, `#${n.n}`);
      case "user":
        return env.repo === null ? `@${n.name}` : anchor(key, `https://github.com/${n.name}`, env, `@${n.name}`);
    }
  });
}

function blockNodes(blocks: Block[], env: Env): ReactNode[] {
  return blocks.map((b, key): ReactNode => {
    switch (b.t) {
      case "p":
        return <p key={key}>{inlineNodes(b.c, env)}</p>;
      case "h":
        // Never larger than the heading of the place that holds the text: the style only bolds it. It is announced as a heading below the panel's own.
        return (
          <div key={key} className={`md-heading md-h${b.level}`} role="heading" aria-level={Math.min(6, b.level + 3)}>
            {inlineNodes(b.c, env)}
          </div>
        );
      case "code":
        // A `mermaid` block is drawn as a diagram; while it cannot be, or when it fails, the block shows as the code it is.
        return b.lang === "mermaid" && b.text.trim() !== "" ? (
          <MermaidDiagram key={key} source={b.text} />
        ) : (
          <pre key={key}>
            <code>{b.text}</code>
          </pre>
        );
      case "quote":
        return <blockquote key={key}>{blockNodes(b.c, env)}</blockquote>;
      case "task":
        // Only ever the first block of a list item, which `list` draws.
        return null;
      case "list": {
        const items = b.items.map((item, at) => {
          const lead = item[0];
          return lead?.t === "task" ? (
            <li key={at} className="md-task">
              {/* Read-only: a click changes nothing. */}
              <input type="checkbox" checked={lead.checked} readOnly onClick={(event) => event.preventDefault()} />
              <div>{blockNodes(item.slice(1), env)}</div>
            </li>
          ) : (
            <li key={at}>{blockNodes(item, env)}</li>
          );
        });
        return b.ordered ? (
          <ol key={key} start={b.start !== 1 ? b.start : undefined}>
            {items}
          </ol>
        ) : (
          <ul key={key}>{items}</ul>
        );
      }
      case "table":
        // The box scrolls sideways on its own; the panel never does. The alignment goes in `text-align`, cell by cell.
        return (
          <div key={key} className="md-table">
            <table>
              <thead>
                <tr>
                  {b.head.map((cell, at) => (
                    <th key={at} style={{ textAlign: b.align[at] }}>
                      {inlineNodes(cell, env)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, at) => (
                  <tr key={at}>
                    {row.map((cell, col) => (
                      <td key={col} style={{ textAlign: b.align[col] }}>
                        {inlineNodes(cell, env)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  });
}

/** Markdown text as a `div.md`. `openLink` receives the address of a followed http or https link. */
export function Markdown({ source, openLink }: { source: string; openLink: OpenLink }) {
  const repo = useContext(GithubRepoContext);
  return <div className="md">{blockNodes(parseMarkdown(source), { openLink, repo })}</div>;
}

/** Only inline formatting, for one-line list entries: block syntax shows as written. A `span.md-inline`. */
export function InlineMarkdown({ source, openLink }: { source: string; openLink: OpenLink }) {
  const repo = useContext(GithubRepoContext);
  return <span className="md-inline">{inlineNodes(parseInline(source.replace(/\s*\n\s*/g, " ").trim()), { openLink, repo })}</span>;
}
