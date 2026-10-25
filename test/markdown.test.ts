import { expect, test } from "bun:test";
import { safeLink } from "../src/core/links";
import { type Block, type Inline, parseInline, parseMarkdown } from "../extension/src/webview/markdown";

const text = (t: string): Inline => ({ t: "text", text: t });
const para = (...c: Inline[]): Block => ({ t: "p", c });

test("inline formatting: bold, italic, code and snake_case words that stay plain", () => {
  expect(parseInline("a **b** *c* `d` snake_case_name")).toEqual([
    text("a "),
    { t: "strong", c: [text("b")] },
    text(" "),
    { t: "em", c: [text("c")] },
    text(" "),
    { t: "code", text: "d" },
    text(" snake_case_name"),
  ]);
});

test("bold nested in italic written with asterisks is italic with bold inside, no stray asterisks", () => {
  expect(parseInline("*Nota: il **pannello** resta aperto.*")).toEqual([
    { t: "em", c: [text("Nota: il "), { t: "strong", c: [text("pannello")] }, text(" resta aperto.")] },
  ]);
  expect(parseInline("*a **b** c*")).toEqual([{ t: "em", c: [text("a "), { t: "strong", c: [text("b")] }, text(" c")] }]);
  expect(parseInline("_a **b** c_")).toEqual([{ t: "em", c: [text("a "), { t: "strong", c: [text("b")] }, text(" c")] }]);
  expect(parseInline("***a** b*")).toEqual([{ t: "em", c: [{ t: "strong", c: [text("a")] }, text(" b")] }]);
  expect(parseInline("***a***")).toEqual([{ t: "em", c: [{ t: "strong", c: [text("a")] }] }]);
  expect(parseInline("**a *b* c**")).toEqual([{ t: "strong", c: [text("a "), { t: "em", c: [text("b")] }, text(" c")] }]);
});

test("what cannot be read as Markdown shows as written", () => {
  expect(parseInline("2 * 3 * 4, **unclosed and a lone ` tick")).toEqual([text("2 * 3 * 4, **unclosed and a lone ` tick")]);
});

test("only http and https links are links; others keep their label as text", () => {
  expect(parseInline("[ok](https://example.com/a) [bad](javascript:alert(1)) [rel](docs/x.md)")).toEqual([
    { t: "link", href: "https://example.com/a", c: [text("ok")] },
    text(" "),
    text("bad"),
    text(" "),
    text("rel"),
  ]);
  expect(safeLink("file:///etc/passwd")).toBeNull();
  expect(safeLink("HTTP://Example.com")).toBe("http://example.com/");
});

test("raw HTML and images are not interpreted", () => {
  expect(parseInline('<img src=x onerror="alert(1)"> ![alt](https://example.com/a.png)')).toEqual([text('<img src=x onerror="alert(1)"> ![alt](https://example.com/a.png)')]);
});

test("quoted link titles keep parentheses and escaped quotes inside the link", () => {
  for (const title of ['"Capitolo ) finale"', "'Capitolo ( finale'", '"Capitolo \\" ) finale"']) {
    expect(parseInline(`[Manuale](https://example.com ${title}) after`)).toEqual([
      { t: "link", href: "https://example.com/", c: [text("Manuale")] },
      text(" after"),
    ]);
  }
  // Not a link: the address inside it is the bare address it is.
  expect(parseInline('[Manuale](https://example.com "unclosed )')).toEqual([
    text("[Manuale]("),
    { t: "link", href: "https://example.com/", c: [text("https://example.com")] },
    text(' "unclosed )'),
  ]);
  expect(parseInline("[quote](https://example.com/it's)")).toEqual([
    { t: "link", href: "https://example.com/it's", c: [text("quote")] },
  ]);
});

test("literal HTML attributes and comments never become inline Markdown", () => {
  for (const html of [
    '<span title="**testo**">valore</span>',
    "<span title='> *text* [link](https://example.com) `code`'>value</span>",
    '<!-- **text** > [link](https://example.com) -->',
  ]) expect(parseInline(html)).toEqual([text(html)]);
  expect(parseInline('<span title="**unclosed**')).toEqual([text('<span title="'), { t: "strong", c: [text("unclosed")] }]);
  expect(parseInline("x <n per ora, **bold** e [link](https://example.com)")).toEqual([
    text("x <n per ora, "), { t: "strong", c: [text("bold")] }, text(" e "),
    { t: "link", href: "https://example.com/", c: [text("link")] },
  ]);
  expect(parseInline("a <!-- open **bold**")).toEqual([text("a <!-- open "), { t: "strong", c: [text("bold")] }]);
  expect(parseInline('**before <span title="**">value</span> after**')).toEqual([
    { t: "strong", c: [text('before <span title="**">value</span> after')] },
  ]);
  expect(parseInline('<span>**value**</span>')).toEqual([
    text("<span>"), { t: "strong", c: [text("value")] }, text("</span>"),
  ]);
  expect(parseInline('1 < 2 and **bold**')).toEqual([
    text("1 < 2 and "), { t: "strong", c: [text("bold")] },
  ]);
});

test("a line ending in two spaces or a backslash is a hard break; any other newline is a space", () => {
  expect(parseMarkdown("one\ntwo  \nthree\\\nfour")).toEqual([para(text("one two"), { t: "br" }, text("three"), { t: "br" }, text("four"))]);
});

test("lists nest, keep their number and may hold several paragraphs per item", () => {
  expect(parseMarkdown("- a\n- b\n  - c\n\n3. x\n4. y")).toEqual([
    { t: "list", ordered: false, start: 1, items: [[para(text("a"))], [para(text("b")), { t: "list", ordered: false, start: 1, items: [[para(text("c"))]] }]] },
    { t: "list", ordered: true, start: 3, items: [[para(text("x"))], [para(text("y"))]] },
  ]);
  expect(parseMarkdown("- one\n\n  more\n- two")).toEqual([{ t: "list", ordered: false, start: 1, items: [[para(text("one")), para(text("more"))], [para(text("two"))]] }]);
});

test("fenced code keeps its lines untouched, also when the fence is never closed", () => {
  expect(parseMarkdown("```ts\nconst a = *1*;\n  indented\n```\nafter")).toEqual([{ t: "code", lang: "ts", text: "const a = *1*;\n  indented" }, para(text("after"))]);
  expect(parseMarkdown("```\nnever closed")).toEqual([{ t: "code", lang: "", text: "never closed" }]);
});

test("headings and block quotes", () => {
  expect(parseMarkdown("## Title\n> quoted **text**\n> more")).toEqual([
    { t: "h", level: 2, c: [text("Title")] },
    { t: "quote", c: [para(text("quoted "), { t: "strong", c: [text("text")] }, text(" more"))] },
  ]);
});

test("a pipe table is a table block with the alignment of each column", () => {
  expect(parseMarkdown("| a | b | c | d |\n|:--|:-:|--:|---|\n| 1 | 2 | 3 | 4 |")).toEqual([
    {
      t: "table",
      align: ["left", "center", "right", "left"],
      head: [[text("a")], [text("b")], [text("c")], [text("d")]],
      rows: [[[text("1")], [text("2")], [text("3")], [text("4")]]],
    },
  ]);
});

test("table cells take the inline Markdown of paragraphs, and an escaped pipe stays in its cell", () => {
  expect(parseMarkdown("| **bold** | *it* | `code` |\n|---|---|---|\n| a \\| b | ok |  |")).toEqual([
    {
      t: "table",
      align: ["left", "left", "left"],
      head: [[{ t: "strong", c: [text("bold")] }], [{ t: "em", c: [text("it")] }], [{ t: "code", text: "code" }]],
      rows: [[[text("a | b")], [text("ok")], []]],
    },
  ]);
});

test("short rows get empty cells and long rows lose their extra cells", () => {
  expect(parseMarkdown("| a | b |\n|---|---|\n| 1 |\n| 1 | 2 | 3 |")).toEqual([
    {
      t: "table",
      align: ["left", "left"],
      head: [[text("a")], [text("b")]],
      rows: [
        [[text("1")], []],
        [[text("1")], [text("2")]],
      ],
    },
  ]);
});

test("a table ends at a blank line, and a header without a separator row is text", () => {
  expect(parseMarkdown("| a | b |\n|---|---|\n| 1 | 2 |\n\nafter")).toEqual([
    { t: "table", align: ["left", "left"], head: [[text("a")], [text("b")]], rows: [[[text("1")], [text("2")]]] },
    para(text("after")),
  ]);
  expect(parseMarkdown("| a | b |\n| c | d |")).toEqual([para(text("| a | b | | c | d |"))]);
});

test("a table right after a line of text keeps its rows, the text stays a paragraph", () => {
  expect(parseMarkdown("Colonne: **due**\n| a | b |\n|---|---|\n| 1 | 2 |")).toEqual([
    para(text("Colonne: "), { t: "strong", c: [text("due")] }),
    { t: "table", align: ["left", "left"], head: [[text("a")], [text("b")]], rows: [[[text("1")], [text("2")]]] },
  ]);
  expect(parseMarkdown("- Colonne:\n  | a | b |\n  |:-:|--:|")).toEqual([
    {
      t: "list",
      ordered: false,
      start: 1,
      items: [[para(text("Colonne:")), { t: "table", align: ["center", "right"], head: [[text("a")], [text("b")]], rows: [] }]],
    },
  ]);
  expect(parseMarkdown("> Colonne:\n> | a |\n> |---|")).toEqual([
    { t: "quote", c: [para(text("Colonne:")), { t: "table", align: ["left"], head: [[text("a")]], rows: [] }] },
  ]);
});

test("strikethrough is two tildes around text; other runs of tildes stay text", () => {
  expect(parseInline("a ~~gone~~ b")).toEqual([text("a "), { t: "del", c: [text("gone")] }, text(" b")]);
  expect(parseInline("~~a **b** c~~")).toEqual([{ t: "del", c: [text("a "), { t: "strong", c: [text("b")] }, text(" c")] }]);
  expect(parseInline("~one~ ~~~three~~~ ~~open")).toEqual([text("~one~ ~~~three~~~ ~~open")]);
  expect(parseInline("`~~code~~`")).toEqual([{ t: "code", text: "~~code~~" }]);
});

test("task list items lead with a checkbox block: `[ ]`, `[x]` and `[X]`, with every marker, numbered and nested", () => {
  const unchecked: Block = { t: "task", checked: false };
  const checked: Block = { t: "task", checked: true };
  expect(parseMarkdown("- [ ] open\n* [x] done\n+ [X] also done\n- [] not a task\n- [x]no space\n- plain")).toEqual([
    {
      t: "list",
      ordered: false,
      start: 1,
      items: [[unchecked, para(text("open"))], [checked, para(text("done"))], [checked, para(text("also done"))], [para(text("[] not a task"))], [para(text("[x]no space"))], [para(text("plain"))]],
    },
  ]);
  expect(parseMarkdown("1. [x] first\n2. [ ] second")).toEqual([
    { t: "list", ordered: true, start: 1, items: [[checked, para(text("first"))], [unchecked, para(text("second"))]] },
  ]);
  expect(parseMarkdown("- [ ] outer\n  - [x] inner")).toEqual([
    {
      t: "list",
      ordered: false,
      start: 1,
      items: [[unchecked, para(text("outer")), { t: "list", ordered: false, start: 1, items: [[checked, para(text("inner"))]] }]],
    },
  ]);
});

test("bare http and https addresses become links to themselves, without the punctuation that ends a sentence", () => {
  const link = (address: string, href = address): Inline => ({ t: "link", href, c: [text(address)] });
  expect(parseInline("see https://example.com/a, then http://example.org.")).toEqual([text("see "), link("https://example.com/a"), text(", then "), link("http://example.org", "http://example.org/"), text(".")]);
  for (const end of [".", ",", ":", ";", "!", "?"]) expect(parseInline(`go to https://example.com/x${end}`)).toEqual([text("go to "), link("https://example.com/x"), text(end)]);
  // A `)` without its `(` stays out; one that closes a `(` of the address stays in.
  expect(parseInline("(https://example.com/a)")).toEqual([text("("), link("https://example.com/a"), text(")")]);
  expect(parseInline("https://en.wikipedia.org/wiki/Foo_(bar)")).toEqual([link("https://en.wikipedia.org/wiki/Foo_(bar)")]);
  expect(parseInline("(see https://en.wikipedia.org/wiki/Foo_(bar)).")).toEqual([text("(see "), link("https://en.wikipedia.org/wiki/Foo_(bar)"), text(").")]);
  // Emphasis around an address is not part of it.
  expect(parseInline("**https://example.com/a**")).toEqual([{ t: "strong", c: [link("https://example.com/a")] }]);
  // Not at the start of a word, not an address, not other schemes, never inside code or a link label.
  expect(parseInline("xhttps://example.com ftp://example.com https:// https")).toEqual([text("xhttps://example.com ftp://example.com https:// https")]);
  expect(parseInline("`https://example.com`")).toEqual([{ t: "code", text: "https://example.com" }]);
  expect(parseInline("[the site https://example.com](https://example.org)")).toEqual([{ t: "link", href: "https://example.org/", c: [text("the site https://example.com")] }]);
});

test("GitHub references: #123 and @handle at the start of a word; never inside an email address, a longer word or code", () => {
  const issue = (n: number): Inline => ({ t: "issue", n });
  const user = (name: string): Inline => ({ t: "user", name });
  expect(parseInline("fixes #123, thanks @octo-cat!")).toEqual([text("fixes "), issue(123), text(", thanks "), user("octo-cat"), text("!")]);
  expect(parseInline("(#7) and [@a]")).toEqual([text("("), issue(7), text(") and ["), user("a"), text("]")]);
  expect(parseInline("#1 @a")).toEqual([issue(1), text(" "), user("a")]);
  expect(parseInline("write to me@example.com or a#12 or issue#3 or #12abc or #0 or #")).toEqual([text("write to me@example.com or a#12 or issue#3 or #12abc or #0 or #")]);
  expect(parseInline("@-bad @bad- @a--b @under_score @" + "x".repeat(40))).toEqual([
    text("@-bad "),
    user("bad"),
    text("- @a--b @under_score @" + "x".repeat(40)),
  ]);
  expect(parseInline("@" + "x".repeat(39))).toEqual([user("x".repeat(39))]);
  expect(parseInline("`#12 @a` and \\#12")).toEqual([{ t: "code", text: "#12 @a" }, text(" and #12")]);
  // A reference inside a link label stays the label's text.
  expect(parseInline("[see #12 by @a](https://example.com)")).toEqual([{ t: "link", href: "https://example.com/", c: [text("see #12 by @a")] }]);
  // Raw HTML stays text, entities included.
  expect(parseInline("&#123; <a href=\"#12\">")).toEqual([text("&#123; <a href=\"#12\">")]);
});
