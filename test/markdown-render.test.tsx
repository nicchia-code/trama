import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { InlineMarkdown, Markdown } from "../extension/src/webview/markdown";

afterEach(cleanup);

test("Markdown renders the supported syntax as React elements", () => {
  const { container } = render(<Markdown source={"# Title\n\nA **bold** and *soft* `code` line.\n\n- one\n- two\n\n3. three\n\n> quoted\n\n```\nlet x = 1;\n```"} openLink={() => {}} />);
  const md = container.querySelector("div.md") as HTMLElement;
  expect(md.querySelector('[role="heading"]')?.textContent).toBe("Title");
  expect(md.querySelector("strong")?.textContent).toBe("bold");
  expect(md.querySelector("em")?.textContent).toBe("soft");
  expect(md.querySelector("p code")?.textContent).toBe("code");
  expect([...md.querySelectorAll("ul li")].map((li) => li.textContent)).toEqual(["one", "two"]);
  expect(md.querySelector("ol")?.getAttribute("start")).toBe("3");
  expect(md.querySelector("blockquote")?.textContent).toBe("quoted");
  expect(md.querySelector("pre code")?.textContent).toBe("let x = 1;");
});

test("headings are announced below the panel's own, and never as h1 to h6", () => {
  const { container } = render(<Markdown source={"# A\n\n###### F"} openLink={() => {}} />);
  const levels = [...container.querySelectorAll('[role="heading"]')].map((h) => h.getAttribute("aria-level"));
  expect(levels).toEqual(["4", "6"]);
  expect(container.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
});

test("an http link opens through the host and the webview does not navigate; any other link is plain text", () => {
  const opened: string[] = [];
  const { container } = render(<Markdown source="[docs](https://example.com/a) and [bad](javascript:alert(1))" openLink={(url) => opened.push(url)} />);
  const links = container.querySelectorAll("a");
  expect(links).toHaveLength(1);
  const link = links[0] as HTMLAnchorElement;
  expect(link.title).toBe("https://example.com/a");
  expect(fireEvent.click(link)).toBe(false);
  expect(opened).toEqual(["https://example.com/a"]);
  expect(container.textContent).toContain("bad");
});

test("raw HTML and malformed Markdown show as written, as text and never as markup", () => {
  const { container } = render(<Markdown source={'<img src=x onerror=alert(1)> **unclosed and a lone ` tick'} openLink={() => {}} />);
  expect(container.querySelector("img")).toBeNull();
  expect(container.textContent).toBe("<img src=x onerror=alert(1)> **unclosed and a lone ` tick");
});

test("InlineMarkdown renders only inline formatting, in one line", () => {
  const { container } = render(<InlineMarkdown source={"a **b**\n# not a heading"} openLink={() => {}} />);
  const span = container.querySelector("span.md-inline") as HTMLElement;
  expect(span.querySelector("strong")?.textContent).toBe("b");
  expect(span.textContent).toBe("a b # not a heading");
});
