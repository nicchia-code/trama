import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// The guide: one Markdown file per page, one folder per section (`getting-started`, `concepts`, `workflows`,
// `panel-and-settings`). `order` sorts the pages inside their section. A page with `generated: settings` also shows
// the list of settings built from the extension's manifest.
const guide = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guide" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
    generated: z.enum(["settings"]).optional(),
  }),
});

export const collections = { guide };
