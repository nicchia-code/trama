// Runs before `site:dev` and `site:build`: the guide shows the screenshots and GIFs of `docs/images/`, so they are copied
// into the site's static folder (`site/public/docs-images/`, not committed) instead of being kept twice in the repository.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");
const target = join(root, "site", "public", "docs-images");
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(join(root, "docs", "images"), target, { recursive: true });
