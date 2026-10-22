// Regenerates the one-glyph icon font of the status bar button from the logo:
//
//   bun scripts/icon-font.ts
//
// Input: extension/media/trama-icon-dark.svg. Output: extension/media/trama-logo.woff, committed to the repository.
// The glyph keeps the fixed code below, which is the `fontCharacter` of `trama-logo` in extension/package.json.
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FontAssetType, generateFonts } from "fantasticon";

const GLYPH_NAME = "trama-logo";
const GLYPH_CODE = 0xe000;

const input = mkdtempSync(join(tmpdir(), "trama-icon-font-"));
try {
  copyFileSync("extension/media/trama-icon-dark.svg", join(input, `${GLYPH_NAME}.svg`));
  mkdirSync("extension/media", { recursive: true });
  await generateFonts({
    inputDir: input,
    outputDir: "extension/media",
    name: GLYPH_NAME,
    fontTypes: [FontAssetType.WOFF],
    assetTypes: [],
    codepoints: { [GLYPH_NAME]: GLYPH_CODE },
    normalize: true,
    fontHeight: 1000,
  });
} finally {
  rmSync(input, { recursive: true, force: true });
}
