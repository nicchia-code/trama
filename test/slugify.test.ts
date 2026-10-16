import { expect, test } from "bun:test";
import { slugify } from "../src/core/store";

test("slugify transliterates accented letters instead of splitting words", () => {
  expect(slugify("Città")).toBe("citta");
  expect(slugify("Ràdio sveglia")).toBe("radio-sveglia");
  expect(slugify("PAGAMENTO_RIUSCITO")).toBe("pagamento-riuscito");
  expect(slugify("   ")).toBe("untitled");
});
