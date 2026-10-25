import { afterEach, beforeEach, expect, test } from "bun:test";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { sanitizeSvg } from "../extension/src/webview/mermaid-diagram";
import { loadMermaid } from "../extension/src/webview/mermaid-loader";
import { Markdown } from "../extension/src/webview/markdown";
import type { MermaidApi } from "../extension/src/webview/mermaid-loader";

const SVG = (inner = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" style="max-width: 120px;">${inner}<text x="1" y="1">A</text></svg>`;

/** `mermaid` replaced by a stub that records what the panel asks and answers with `svg`, or fails for a text that says `broken`. */
function stub(svg: (text: string) => string = () => SVG()) {
  const calls: { initialize: Record<string, unknown>[]; render: string[] } = { initialize: [], render: [] };
  const api: MermaidApi = {
    initialize: (config) => void calls.initialize.push(config),
    render: async (_id, text) => {
      calls.render.push(text);
      if (text.includes("broken")) throw new Error("Parse error");
      return { svg: svg(text) };
    },
  };
  globalThis.mermaid = api;
  return { calls };
}

const diagram = "```mermaid\ngraph TD\n  A-->B\n```";

beforeEach(() => {
  document.documentElement.classList.remove("dark");
});
afterEach(() => {
  cleanup();
  globalThis.mermaid = undefined;
});

test("a mermaid block shows Drawing diagram… and then the diagram: role img, name Diagram, the block as its description", async () => {
  const { calls } = stub();
  const { container, findByRole } = render(<Markdown source={diagram} openLink={() => {}} />);
  expect(container.textContent).toBe("Drawing diagram…");
  expect(container.querySelector("pre")).toBeNull();
  const box = await findByRole("img", { name: "Diagram" });
  expect(box.getAttribute("aria-description")).toBe("graph TD\n  A-->B");
  expect(box.classList.contains("md-diagram")).toBe(true);
  const svg = box.querySelector("svg") as SVGSVGElement;
  expect(svg).not.toBeNull();
  // At its natural size, never more: the box scrolls when the text is narrower.
  expect(svg.getAttribute("width")).toBe("120");
  expect(svg.getAttribute("height")).toBe("60");
  expect(svg.style.maxWidth).toBe("none");
  expect(container.textContent).not.toContain("Drawing diagram…");
  expect(calls.render).toEqual(["graph TD\n  A-->B"]);
  expect(calls.initialize.at(-1)).toMatchObject({ startOnLoad: false, securityLevel: "strict", theme: "default", htmlLabels: false });
});

test("the diagram is drawn again in the other theme when the theme changes", async () => {
  const { calls } = stub();
  const { findByRole } = render(<Markdown source={diagram} openLink={() => {}} />);
  await findByRole("img", { name: "Diagram" });
  expect(calls.initialize.map((config) => config.theme)).toEqual(["default"]);
  act(() => document.documentElement.classList.add("dark"));
  await waitFor(() => expect(calls.initialize.map((config) => config.theme)).toEqual(["default", "dark"]));
  await findByRole("img", { name: "Diagram" });
  expect(calls.render).toHaveLength(2);
  act(() => document.documentElement.classList.remove("dark"));
  await waitFor(() => expect(calls.initialize.map((config) => config.theme)).toEqual(["default", "dark", "default"]));
});

test("a block mermaid cannot read shows as a plain code block, as written, with no message", async () => {
  stub();
  const source = "```mermaid\nbroken diagram <b>x</b>\n```";
  const { container } = render(<Markdown source={source} openLink={() => {}} />);
  await waitFor(() => expect(container.querySelector("pre code")).not.toBeNull());
  expect(container.querySelector("pre code")?.textContent).toBe("broken diagram <b>x</b>");
  expect(container.querySelector('[role="img"]')).toBeNull();
  expect(container.textContent).toBe("broken diagram <b>x</b>");
  expect(document.body.querySelector('[id^="dtrama-diagram"]')).toBeNull();
});

test("a drawing that returns no SVG, or a library that does not load, shows the code block too", async () => {
  stub(() => "not an svg <");
  const unreadable = render(<Markdown source={diagram} openLink={() => {}} />);
  await waitFor(() => expect(unreadable.container.querySelector("pre code")).not.toBeNull());
  expect(unreadable.container.textContent).toBe("graph TD\n  A-->B");
  cleanup();
  // No stub and the page names no bundle: the load fails.
  globalThis.mermaid = undefined;
  const missing = render(<Markdown source={diagram} openLink={() => {}} />);
  await waitFor(() => expect(missing.container.querySelector("pre code")).not.toBeNull());
  expect(missing.container.textContent).toBe("graph TD\n  A-->B");
});

test("other fenced blocks, and an empty mermaid block, stay code and never load mermaid", () => {
  const { calls } = stub();
  const { container } = render(<Markdown source={"```js\nlet a;\n```\n\n```mermaid\n```"} openLink={() => {}} />);
  expect(container.querySelectorAll("pre code")).toHaveLength(2);
  expect(calls.render).toEqual([]);
});

test("the SVG that enters the page has no script, foreignObject, event attribute, tooltip or link out", async () => {
  stub(() =>
    SVG(
      '<title>tooltip</title><script>alert(1)</script><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>' +
        '<a href="https://evil.example"><rect onclick="alert(2)" width="1" height="1"/></a><a xlink:href="javascript:alert(3)" xmlns:xlink="http://www.w3.org/1999/xlink"><circle r="1"/></a><use href="#frag"/>',
    ),
  );
  const { findByRole } = render(<Markdown source={diagram} openLink={() => {}} />);
  const box = await findByRole("img", { name: "Diagram" });
  expect(box.querySelector("script, foreignObject, title")).toBeNull();
  expect(box.innerHTML.toLowerCase()).not.toContain("onclick");
  expect(box.innerHTML).not.toContain("evil.example");
  expect(box.innerHTML).not.toContain("javascript:");
  expect(box.querySelector("use")?.getAttribute("href")).toBe("#frag");
  expect(box.querySelector("text")?.textContent).toBe("A");
});

test("sanitizeSvg rejects what is not an SVG", () => {
  expect(sanitizeSvg("<div>x</div>")).toBeNull();
  expect(sanitizeSvg("<svg><g></svg>")).toBeNull();
  expect(sanitizeSvg(SVG())?.localName).toBe("svg");
});

/** A page like the panel page: its own script carries the nonce, and `<body data-mermaid-src>` names the bundle. */
function pageWith(src: string | undefined) {
  const page = document.implementation.createHTMLDocument("page");
  if (src !== undefined) page.body.dataset.mermaidSrc = src;
  const own = page.createElement("script");
  own.nonce = "n0nce";
  page.body.append(own);
  return { page, own, added: () => Array.from(page.scripts).filter((script) => script !== own) };
}

test("the first diagram of a page adds one script with the page's nonce and the host's address, and every diagram waits for it", async () => {
  const settings = (window as unknown as { happyDOM: { settings: { handleDisabledFileLoadingAsSuccess: boolean } } }).happyDOM.settings;
  settings.handleDisabledFileLoadingAsSuccess = true;
  try {
    const { page, added } = pageWith("https://file+.vscode-resource.vscode-cdn.net/dist/mermaid.js");
    const first = loadMermaid(page);
    expect(loadMermaid(page)).toBe(first);
    expect(added()).toHaveLength(1);
    expect(added()[0]?.src).toBe("https://file+.vscode-resource.vscode-cdn.net/dist/mermaid.js");
    expect(added()[0]?.nonce).toBe("n0nce");
    // The test DOM runs no script, so the bundle never hands the library over: the load rejects.
    await expect(first).rejects.toThrow("did not load");
  } finally {
    settings.handleDisabledFileLoadingAsSuccess = false;
  }
});

test("a page without the address of the bundle rejects without adding a script", async () => {
  const { page, added } = pageWith(undefined);
  await expect(loadMermaid(page)).rejects.toThrow("no address");
  expect(added()).toHaveLength(0);
});
