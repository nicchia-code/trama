import { describe, expect, test } from "bun:test";
import { diffEntries, diffFile } from "../src/core/diff";

const ORDER = `# Order

## States

### Draft (initial)
- \`cart.CONFIRM\` → Paid

### Paid
- \`user.CANCEL\` → Cancelled: refunds the customer.

### Cancelled (final)

## Events

### CONFIRMED
Emitted when the order leaves Draft.
`;

const ref = (path: string, before: string | undefined, after: string | undefined) => diffEntries(path, before, after).entries.map((entry) => [entry.ref, entry.text]);

describe("the changes of a file, each with the reference of what it is about", () => {
  test("a Machine: its Transitions are the reference of the Transition, its Events the reference of the Event", () => {
    const after = ORDER.replace("refunds the customer.", "refunds the customer in full.").replace("Emitted when the order leaves Draft.", "Emitted when the order is placed.");
    expect(ref("checkout/order.md", ORDER, after)).toEqual([
      ["order/Paid/user.CANCEL", "~ Transition Paid | user.CANCEL → Cancelled: prose changed"],
      ["order.CONFIRMED", "~ Event CONFIRMED: description changed"],
    ]);
  });

  test("an Actor's Events are referenced by their owner", () => {
    expect(ref("actors/user.md", "# User\n\n## Events\n\n### CANCEL\nAsks.\n", "# User\n\n## Events\n\n### CANCEL\nAsks.\n\n### LEAVE\nLeaves.\n")).toEqual([["user.LEAVE", "+ Event LEAVE"]]);
  });

  test("a Feature is about its Feature and system.md about the System, which has no reference", () => {
    expect(ref("checkout/feature.md", "# Checkout\n\nOld.\n", "# Checkout\n\nNew.\n")).toEqual([["checkout", "~ description changed"]]);
    expect(ref("system.md", "# Shop\n\nOld.\n", "# Shop\n\nNew.\n")).toEqual([[null, "~ description changed"]]);
  });

  test("a section of the Requirements is requirements/<area>#<section> and the Area itself requirements/<area>", () => {
    const before = "---\ndescription: d\n---\n# UI\n\n## General\n- One.\n\n## order/Paid\n- Green.\n";
    const after = "---\ndescription: d\n---\n# UI\n\n## General\n- One.\n\n## order/Paid\n- Blue.\n\n## order/Cancelled\n- Grey.\n";
    expect(ref("requirements/ui/main.md", before, after)).toEqual([
      ["requirements/ui#order/Paid", "~ Requirements for order/Paid"],
      ["requirements/ui#order/Cancelled", "+ Requirements for order/Cancelled"],
    ]);
  });

  test("a field of the Specs is specs#<field>", () => {
    const entries = diffEntries("specs.yaml", undefined, "frameworks:\n  - name: React\n").entries;
    expect(entries.map((entry) => entry.ref)).toEqual(["specs#frameworks"]);
  });

  test("diffFile lists the same lines, in the same order, for `trama proposal show`", () => {
    const after = ORDER.replace("refunds the customer.", "refunds the customer in full.");
    const { change, entries } = diffEntries("checkout/order.md", ORDER, after);
    expect(diffFile("checkout/order.md", ORDER, after)).toEqual({ path: "checkout/order.md", change, details: entries.map((entry) => entry.text) });
  });
});
