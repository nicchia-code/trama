import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { consumeRequest, createRequest, isEmptyRequest, requestExists, requestIdAt, requestStamp, requestsDir, requestTitle, sweepRequestImages } from "../src/core/design-requests";
import { cardName } from "../src/core/short-numbers";
import { editInProposal, getProposal, listProposals, newProposal, submitProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";
import { coverWithTask } from "./cover";
import { copyShop } from "./shop-project";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-requests-"));
  copyShop(dir);
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function writeRequest(id: string, text = "# Returns\n\nCustomers send orders back.\n") {
  mkdirSync(requestsDir(p), { recursive: true });
  const file = join(requestsDir(p), `${id}.md`);
  writeFileSync(file, text);
  return file;
}

function writeOrder(id: string, transform: (text: string) => string = (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)")) {
  const file = editInProposal(p, id, "checkout/order.md");
  writeFileSync(file, transform(readFileSync(file, "utf8")));
  coverWithTask(p, id, "checkout");
}

const ID = "2026-10-04T19-05-12";
const at = new Date(2026, 9, 4, 19, 5, 12);

describe("storing a written design request", () => {
  test("creates an empty file named after the local date and time, with a .gitignore that ignores everything", () => {
    const { id, file } = createRequest(p, at);
    expect(id).toBe(ID);
    expect(file).toBe(join(p.dir, "requests", `${ID}.md`));
    expect(readFileSync(file, "utf8")).toBe("");
    expect(readFileSync(join(requestsDir(p), ".gitignore"), "utf8")).toBe("*\n");
    expect(requestIdAt(p, file)).toBe(ID);
    expect(requestExists(p, ID)).toBe(true);
  });

  test("pads every part to two digits", () => {
    expect(requestStamp(new Date(2027, 0, 2, 3, 4, 5))).toBe("2027-01-02T03-04-05");
  });

  test("a taken ID gets the first free suffix from -2", () => {
    expect(createRequest(p, at).id).toBe(ID);
    expect(createRequest(p, at).id).toBe(`${ID}-2`);
    expect(createRequest(p, at).id).toBe(`${ID}-3`);
    rmSync(join(requestsDir(p), `${ID}-2.md`));
    expect(createRequest(p, at).id).toBe(`${ID}-2`);
  });

  test("keeps an existing .gitignore", () => {
    mkdirSync(requestsDir(p), { recursive: true });
    writeFileSync(join(requestsDir(p), ".gitignore"), "*\n!keep\n");
    createRequest(p, at);
    expect(readFileSync(join(requestsDir(p), ".gitignore"), "utf8")).toBe("*\n!keep\n");
  });

  test("recognises only the request files of the project", () => {
    expect(requestIdAt(p, join(p.dir, "requests", `${ID}.md`))).toBe(ID);
    expect(requestIdAt(p, join(p.dir, "requests", `${ID}-12.md`))).toBe(`${ID}-12`);
    expect(requestIdAt(p, join(p.dir, "requests", "abc123.md"))).toBeUndefined();
    expect(requestIdAt(p, join(p.dir, "requests", `${ID}-1.md`))).toBeUndefined();
    expect(requestIdAt(p, join(p.dir, "requests", `${ID}.txt`))).toBeUndefined();
    expect(requestIdAt(p, join(p.dir, "requests", "nested", `${ID}.md`))).toBeUndefined();
    expect(requestIdAt(p, join(p.dir, "proposals", `${ID}.md`))).toBeUndefined();
    expect(requestExists(p, "../proposals/x")).toBe(false);
  });
});

describe("the images of a written design request", () => {
  test("a line of images is never the title, and a request of images only is not empty", () => {
    expect(requestTitle("![shot](x.images/shot.png)\n\n# Real title\n")).toBe("Real title");
    expect(requestTitle("![a](a.png) ![b](b.png)\nLet customers send orders back\n")).toBe("Let customers send orders back");
    expect(requestTitle("![only](only.png)\n")).toBe("");
    expect(isEmptyRequest("![only](only.png)\n")).toBe(false);
  });

  test("consuming a request deletes its images with it", () => {
    const file = writeRequest(ID, `![shot](${ID}.images/shot.png)\n`);
    const images = join(requestsDir(p), `${ID}.images`);
    mkdirSync(images);
    writeFileSync(join(images, "shot.png"), "png");
    expect(consumeRequest(p, ID)).toBe(true);
    expect(existsSync(file)).toBe(false);
    expect(existsSync(images)).toBe(false);
    expect(consumeRequest(p, ID)).toBe(false);
  });

  test("the sweep deletes the images of a request whose file is gone, and nothing else", () => {
    writeRequest(ID);
    const kept = join(requestsDir(p), `${ID}.images`);
    const orphan = join(requestsDir(p), `${ID}-2.images`);
    const other = join(requestsDir(p), "notes.images");
    for (const folder of [kept, orphan, other]) mkdirSync(folder);
    sweepRequestImages(p);
    expect(existsSync(kept)).toBe(true);
    expect(existsSync(orphan)).toBe(false);
    expect(existsSync(other)).toBe(true);
  });
});

describe("the title and emptiness of a request", () => {
  test("the title is the first level-one heading outside code blocks", () => {
    expect(requestTitle("intro\n\n```md\n# Inside code\n```\n\n## Second level\n#  Returns after shipping  \n# Later\n")).toBe("Returns after shipping");
    expect(requestTitle("~~~\n# fenced\n~~~\n# Closed heading ##\n")).toBe("Closed heading");
    expect(requestTitle("#hashtag\n# Real\n")).toBe("Real");
    expect(requestTitle("> ```md\n> # Example title\n# Real request\n")).toBe("Real request");
    expect(requestTitle("- ```md\n  # Example title\n  ```\n")).toBe("- ```md");
  });

  test("without a heading the title is the first non-empty line, trimmed", () => {
    expect(requestTitle("\n\n   Let customers send orders back   \nmore\n")).toBe("Let customers send orders back");
    expect(requestTitle("## Only second level\n")).toBe("## Only second level");
    expect(requestTitle("")).toBe("");
  });

  test("a text is empty when only spaces and line breaks are left", () => {
    expect(isEmptyRequest("")).toBe(true);
    expect(isEmptyRequest("  \n\t\r\n ")).toBe(true);
    expect(isEmptyRequest(" x ")).toBe(false);
  });
});

describe("a Proposal bound to a written design request", () => {
  test("records the request, and keeps it after the hand-over consumed the file", () => {
    const file = writeRequest(ID);
    const prop = newProposal(p, "Lost", "", { request: ID, label: "Lost" });
    expect(getProposal(p, prop.id).data.request).toBe(ID);
    expect(readFileSync(join(prop.dir, "proposal.md"), "utf8")).toContain(`request: ${ID}`);
    writeOrder(prop.id);
    const submitted = submitProposal(p, prop.id);
    expect(submitted.requestConsumed).toBe(true);
    expect(existsSync(file)).toBe(false);
    expect(getProposal(p, prop.id).data.request).toBe(ID);
  });

  test("is created unbound when the request does not exist", () => {
    const prop = newProposal(p, "Lost", "", { request: "2026-01-01T00-00-00" });
    expect(getProposal(p, prop.id).data.request).toBeNull();
    expect(readFileSync(join(prop.dir, "proposal.md"), "utf8")).not.toContain("request");
  });

  test("a refused hand-over deletes nothing", () => {
    const file = writeRequest(ID);
    const prop = newProposal(p, "Broken", "", { request: ID });
    writeOrder(prop.id, (t) => t.replace("→ Paid", "→ Nowhere"));
    expect(() => submitProposal(p, prop.id)).toThrow(/cannot be handed over yet/);
    expect(existsSync(file)).toBe(true);
  });

  test("only the first Proposal opened for a request is bound to it; a later one is created unbound and hands over normally", () => {
    const file = writeRequest(ID);
    const first = newProposal(p, "Lost", "", { request: ID, label: "Lost" });
    const second = newProposal(p, "Lost again", "", { request: ID, label: "Lost again" });
    expect(getProposal(p, first.id).data.request).toBe(ID);
    expect(getProposal(p, second.id).data.request).toBeNull();
    writeOrder(second.id);
    expect(submitProposal(p, second.id)).toMatchObject({ requestConsumed: false });
    expect(existsSync(file)).toBe(true);
    writeOrder(first.id);
    expect(submitProposal(p, first.id).requestConsumed).toBe(true);
    expect(existsSync(file)).toBe(false);
  });

  test("a Proposal that depends on the first one, given the same request, is not bound to it", () => {
    writeRequest(ID);
    const first = newProposal(p, "Lost", "", { request: ID });
    const dependent = newProposal(p, "Depends", "", { requires: [first.id], request: ID });
    expect(getProposal(p, dependent.id).data.request).toBeNull();
  });

  test("a Proposal written before the field existed stays valid and unbound", () => {
    const prop = newProposal(p, "Old");
    expect(getProposal(p, prop.id).data.request).toBeNull();
  });
});

describe("the command line", () => {
  test("proposal new with request binds, and says when the request was not found", () => {
    writeRequest(ID);
    const bound = run(["proposal", "new", "--input", JSON.stringify({ title: "Lost", request: ID })], dir, {});
    expect(bound.out).not.toContain("not found");
    const unbound = run(["proposal", "new", "--input", JSON.stringify({ title: "Other", request: "zzz999" })], dir, {});
    expect(unbound.out).toContain("Design request zzz999 was not found; the Proposal is not bound to any request.");
    expect(run(["proposal", "new", "--input", JSON.stringify({ title: "Another", request: ID })], dir, {}).out).toContain(`Design request ${ID} is already bound to another Proposal; the Proposal is not bound to any request.`);
  });

  test("proposal new with request binds an ID with a suffix", () => {
    writeRequest(`${ID}-2`);
    const out = run(["proposal", "new", "--json", "--input", JSON.stringify({ title: "Lost", request: `${ID}-2` })], dir, {}).out;
    expect(JSON.parse(out).request).toBe(`${ID}-2`);
  });

  test("handing a Proposal over says it deleted the request", () => {
    writeRequest(ID);
    const prop = newProposal(p, "Lost", "", { request: ID, label: "Lost" });
    writeOrder(prop.id);
    const out = run(["proposal", "move", prop.id, "open"], dir, {}).out;
    expect(out).toContain(`Submitted Proposal ${cardName(p, "proposal", prop.id)} for review`);
    expect(out).toContain(`Deleted design request ${ID}`);
  });

  test("proposal new has one kind, so a Proposal is never an import and a resolution at once", () => {
    expect(() => run(["proposal", "new", "--input", JSON.stringify({ title: "Both", kind: "resolution", import: true })], dir, {})).toThrow(/Unknown field|unrecognized/i);
    expect(() => run(["proposal", "new", "--input", JSON.stringify({ title: "Both", kind: "other" })], dir, {})).toThrow(/kind/);
  });

  test("proposal new with kind setup refuses a Model that has Features or Actors", () => {
    expect(() => run(["proposal", "new", "--input", JSON.stringify({ title: "Start", kind: "setup" })], dir, {})).toThrow('kind "setup" needs an empty Model');
  });

  test("proposal new with kind setup creates a setup Proposal on an empty Model", () => {
    const model = join(p.dir, "model");
    for (const entry of readdirSync(model)) if (entry !== "system.md") rmSync(join(model, entry), { recursive: true });
    run(["proposal", "new", "--input", JSON.stringify({ title: "Start", kind: "setup" })], dir, {});
    expect(listProposals(p).map((x) => x.data.kind)).toEqual(["setup"]);
  });
});
