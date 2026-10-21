import { expect, test } from "bun:test";
import { type Detail, tooltipOf } from "../extension/src/webview/diagram/details";

const base = { kind: "Machine", title: "Order", description: "", sections: [] } as unknown as Detail;
const withDetail = (over: Partial<Detail>): Detail => ({ ...base, ...over });

test("the tooltip is the title and the first sentence of the description, in full", () => {
  const long = `${"word ".repeat(80)}ends here. Second sentence.`;
  expect(tooltipOf(withDetail({ description: "Tracks an order. It has States. More." }))).toBe("Order\nTracks an order.");
  expect(tooltipOf(withDetail({ description: long }))).toBe(`Order\n${long.split(". ")[0]}.`);
});

test("without a description the tooltip is only the title, with no item lists", () => {
  const sections = [{ heading: "Transitions", items: [{ text: "a", note: "" }] }];
  expect(tooltipOf(withDetail({ sections } as Partial<Detail>))).toBe("Order");
});

test("an edge shows the first sentence of its Transition prose", () => {
  const sections = [{ heading: "Transitions", items: [{ text: "x.GO → B", note: "Goes on. Then stops." }] }];
  expect(tooltipOf(withDetail({ kind: "Transition", title: "A → B", sections } as Partial<Detail>))).toBe("A → B\nGoes on.");
});

test("a flow arc has no Transition prose, so its tooltip is only the title", () => {
  const sections = [{ heading: "Events", items: [{ text: "user.GO", note: "Received by order, payment." }] }];
  expect(tooltipOf(withDetail({ kind: "Events", title: "A → B", sections } as Partial<Detail>))).toBe("A → B");
});

test("sentence ends: no punctuation, ? and !, and text with no break", () => {
  expect(tooltipOf(withDetail({ description: "No punctuation here" }))).toBe("Order\nNo punctuation here");
  expect(tooltipOf(withDetail({ description: "Why? Because." }))).toBe("Order\nWhy?");
  expect(tooltipOf(withDetail({ description: "Stop! Go." }))).toBe("Order\nStop!");
});
