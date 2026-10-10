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
  expect(parseInline('[Manuale](https://example.com "unclosed )')).toEqual([text('[Manuale](https://example.com "unclosed )')]);
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

test("tables are not supported: their lines show as written", () => {
  expect(parseMarkdown("| a | b |\n|---|---|\n| 1 | 2 |")).toEqual([{ t: "code", lang: "", text: "| a | b |\n|---|---|\n| 1 | 2 |" }]);
});
