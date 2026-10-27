// The guide's Markdown pages are plain `.md`, which cannot import Astro components, so a step and an annotated screenshot are
// written as fenced blocks that this plugin turns into the same markup as the components `Step.astro` and `Screenshot.astro`
// (both draw it with `lib/screenshots.ts`):
//
//     ```screenshot
//     scene: board
//     alt: The Board of Trama in VS Code with ...
//     ```
//
//     ```step
//     title: Open the Board
//     text: |
//       Click the Trama icon in the activity bar, then **Board**. The Board opens.
//     scene: board
//     alt: The Board of Trama in VS Code with ...
//     ```
//
// A step's `text` is Markdown (one or two sentences). `eager: true` loads the image at once, for the first screenshot of a page.
// A scene without its images or its annotations, or a block without a field it needs, fails the build.
import { parse } from "yaml";
import { z } from "zod";
import { renderScreenshot, STEP_CLOSE, STEP_OPEN, STEP_TEXT_CLOSE, STEP_TEXT_OPEN, STEP_TITLE_CLASS } from "../lib/screenshots";

interface MdastNode {
  type: string;
  lang?: string | null;
  value?: string;
  depth?: number;
  data?: Record<string, unknown>;
  children?: MdastNode[];
}

interface Processor {
  parse(text: string): MdastNode;
}

const screenshotBlock = z.object({ scene: z.string(), alt: z.string(), eager: z.boolean().optional() }).strict();
const stepBlock = screenshotBlock.extend({ title: z.string().min(1), text: z.string().min(1) });

function readBlock<T extends z.ZodType>(kind: string, node: MdastNode, schema: T): z.infer<T> {
  let raw: unknown;
  try {
    raw = parse(node.value ?? "");
  } catch (error) {
    throw new Error(`A "${kind}" block of the guide is not valid YAML: ${(error as Error).message}`);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".") || "(block)"}: ${i.message}`).join("; ");
    throw new Error(`A "${kind}" block of the guide is not valid: ${problems}`);
  }
  return result.data;
}

/** A remark plugin: `[remarkScreenshots, { base: "/trama/", root: "<the site folder>" }]`. */
export function remarkScreenshots(this: Processor, { base, root }: { base: string; root: string }) {
  const processor = this;
  const html = (value: string): MdastNode => ({ type: "html", value });

  const convert = (node: MdastNode): MdastNode[] | null => {
    if (node.type !== "code") return null;
    if (node.lang === "screenshot") {
      const block = readBlock("screenshot", node, screenshotBlock);
      return [html(renderScreenshot({ siteRoot: root, base, scene: block.scene, alt: block.alt, eager: block.eager }))];
    }
    if (node.lang === "step") {
      const block = readBlock("step", node, stepBlock);
      const title: MdastNode = {
        type: "heading",
        depth: 3,
        data: { hProperties: { className: [STEP_TITLE_CLASS] } },
        children: [{ type: "text", value: block.title }],
      };
      const text = processor.parse(block.text).children ?? [];
      return [
        html(STEP_OPEN),
        title,
        html(STEP_TEXT_OPEN),
        ...text,
        html(STEP_TEXT_CLOSE),
        html(renderScreenshot({ siteRoot: root, base, scene: block.scene, alt: block.alt, eager: block.eager })),
        html(STEP_CLOSE),
      ];
    }
    return null;
  };

  const walk = (node: MdastNode): void => {
    if (!node.children) return;
    node.children = node.children.flatMap((child) => convert(child) ?? [child]);
    for (const child of node.children) walk(child);
  };

  return (tree: MdastNode) => walk(tree);
}
