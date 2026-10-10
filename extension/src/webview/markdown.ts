// The one Markdown renderer of the panel. `parseMarkdown` and `parseInline` are pure and return a small tree, so they run
// without a browser page; `renderMarkdown` and `renderInline` turn that tree into DOM nodes with the DOM API and
// `textContent`, never `innerHTML`, so a text from a file cannot inject markup or script.
//
// Supported: paragraphs, headings, bold, italic, inline code, fenced code blocks, bulleted and numbered lists (nested
// too), block quotes and links. Tables, images and raw HTML are not interpreted: they show as written. Anything that
// cannot be read as Markdown (an unclosed `*`, a stray backtick) also shows as written.

import { safeLink } from "../../../src/core/links";

export type Inline =
  | { t: "text"; text: string }
  | { t: "code"; text: string }
  | { t: "em"; c: Inline[] }
  | { t: "strong"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "br" };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: number; c: Inline[] }
  | { t: "code"; lang: string; text: string }
  | { t: "quote"; c: Block[] }
  | { t: "list"; ordered: boolean; start: number; items: Block[][] };

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
    toks.splice(o + 1, c - o - 1, { t: n === 2 ? "strong" : "em", c: plain(toks.slice(o + 1, c)) });
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

    if (ch === "*" || ch === "_") {
      let run = 0;
      while (s[i + run] === ch) run++;
      const before = s[i - 1];
      const after = s[i + run];
      flush();
      toks.push({
        t: "delim",
        ch,
        count: run,
        orig: run,
        open: !isSpace(after) && (ch === "*" || !isWord(before)),
        close: !isSpace(before) && (ch === "*" || !isWord(after)),
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

/** A link inside a link label is not a link: its text stays. */
function stripLinks(nodes: Inline[]): Inline[] {
  return nodes.flatMap((n): Inline[] => {
    if (n.t === "link") return stripLinks(n.c);
    if (n.t === "em" || n.t === "strong") return [{ ...n, c: stripLinks(n.c) }];
    return [n];
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Blocks

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const QUOTE = /^ {0,3}>/;
const ITEM = /^( *)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;
const BLANK = /^\s*$/;
/** The separator row of a table (`|---|:--:|`): tables are not supported, so their lines show as written. */
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

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
        items.push(parseBlocks(content));
        // Blank lines between items do not end the list.
        let j = i;
        while (j < lines.length && BLANK.test(lines[j] as string)) j++;
        const following = j < lines.length ? ITEM.exec(lines[j] as string) : null;
        if (following && (following[1] as string).length === baseIndent && /\d/.test(following[2] as string) === ordered) i = j;
      }
      blocks.push({ t: "list", ordered, start, items });
      continue;
    }

    const para: string[] = [];
    const first = i;
    while (i < lines.length && !BLANK.test(lines[i] as string) && (para.length === 0 || !startsBlock(lines[i] as string))) {
      para.push((lines[i] as string).trimStart());
      i++;
    }
    if (para.length >= 2 && (para[0] as string).includes("|") && TABLE_SEPARATOR.test(para[1] as string) && (para[1] as string).includes("-")) {
      blocks.push({ t: "code", lang: "", text: lines.slice(first, i).join("\n") });
      continue;
    }
    // Trailing spaces are kept on every line but the last: two of them make a hard break.
    blocks.push({ t: "p", c: parseInline(para.join("\n").trimEnd()) });
  }
  return blocks;
}

// ---------------------------------------------------------------------------------------------------------------------
// DOM

export type OpenLink = (url: string) => void;

function inlineNodes(nodes: Inline[], openLink: OpenLink): Node[] {
  return nodes.map((n): Node => {
    switch (n.t) {
      case "text":
        return document.createTextNode(n.text);
      case "br":
        return document.createElement("br");
      case "code": {
        const e = document.createElement("code");
        e.textContent = n.text;
        return e;
      }
      case "em":
      case "strong": {
        const e = document.createElement(n.t);
        e.append(...inlineNodes(n.c, openLink));
        return e;
      }
      case "link": {
        const a = document.createElement("a");
        a.append(...inlineNodes(n.c, openLink));
        a.href = n.href;
        a.title = n.href;
        a.rel = "noreferrer noopener";
        // The webview never navigates: the editor host opens the address in the system browser.
        a.addEventListener("click", (event) => {
          event.preventDefault();
          openLink(n.href);
        });
        return a;
      }
    }
  });
}

function blockNodes(blocks: Block[], openLink: OpenLink): Node[] {
  return blocks.map((b): Node => {
    switch (b.t) {
      case "p": {
        const e = document.createElement("p");
        e.append(...inlineNodes(b.c, openLink));
        return e;
      }
      case "h": {
        // Never larger than the heading of the place that holds the text: the style only bolds it. It is announced as a heading below the panel's own.
        const e = document.createElement("div");
        e.className = `md-heading md-h${b.level}`;
        e.setAttribute("role", "heading");
        e.setAttribute("aria-level", String(Math.min(6, b.level + 3)));
        e.append(...inlineNodes(b.c, openLink));
        return e;
      }
      case "code": {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = b.text;
        pre.append(code);
        return pre;
      }
      case "quote": {
        const e = document.createElement("blockquote");
        e.append(...blockNodes(b.c, openLink));
        return e;
      }
      case "list": {
        const e = document.createElement(b.ordered ? "ol" : "ul");
        if (e instanceof HTMLOListElement && b.start !== 1) e.start = b.start;
        for (const item of b.items) {
          const li = document.createElement("li");
          li.append(...blockNodes(item, openLink));
          e.append(li);
        }
        return e;
      }
    }
  });
}

/** Markdown text as a `div.md`. `openLink` receives the address of a followed http or https link. */
export function renderMarkdown(source: string, openLink: OpenLink): HTMLElement {
  const root = document.createElement("div");
  root.className = "md";
  root.append(...blockNodes(parseMarkdown(source), openLink));
  return root;
}

/** Only inline formatting, for one-line list entries: block syntax shows as written. Returns a `span.md-inline`. */
export function renderInline(source: string, openLink: OpenLink): HTMLElement {
  const root = document.createElement("span");
  root.className = "md-inline";
  root.append(...inlineNodes(parseInline(source.replace(/\s*\n\s*/g, " ").trim()), openLink));
  return root;
}
