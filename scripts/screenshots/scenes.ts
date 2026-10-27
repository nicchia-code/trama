// The scenes of the guide's screenshots: data, interpreted by `scripts/screenshots.ts` (see `types.ts`). Every scene is a fresh copy of `examples/shop`, brought to the state to show with `trama`
// commands and files (`prepare`), then a window of VS Code driven by clicks and keys (`steps`). A scene is named by its images: `site/public/screenshots/<name>.light.png` and `<name>.dark.png`.
// A scene's `shows` says what its images show, for whoever writes the guide's `alt` texts and annotations.
import type { AgentCommand, PrepareStep, Scene, Step, Target } from "./types";

// ── Project preparation ──────────────────────────────────────────────────────────────────────────────

/** The sample shop is written in Italian where an agent wrote its cards; the scenes that show those cards say them in English. */
const shopInEnglish: PrepareStep[] = [
  ...(
    [
      ["tasks/srlrefbo-carrello.md", "# Carrello\n", "# Cart\n"],
      ["tasks/64x0t2im-schermate-carrello.md", "# Schermate del carrello\n", "# Cart screens\n"],
      ["tasks/5kxgcbdb-ordine.md", "# Ordine\n", "# Order\n"],
      ["tasks/9q7ccp29-pagamento.md", "# Pagamento con Stripe\n", "# Payment with Stripe\n"],
      ["tasks/cv0jurdy-magazzino.md", "# Magazzino\n", "# Warehouse\n"],
      ["tasks/vrguc9zh-corriere.md", "# Corriere\n", "# Courier\n"],
      ["tasks/4qfr7rpk-annullamento-ordine.md", "# Annullamento dell'ordine\n", "# Order cancellation\n"],
      ["tasks/wyhv52ia-rimborso.md", "# Rimborso\n", "# Refund\n"],
    ] as const
  ).map(([file, from, to]): PrepareStep => ({ kind: "file", path: `.trama/${file}`, replace: [[from, to]] })),
  { kind: "trama", run: ["history", "edit", "1x3qakkj"], input: { title: "The cart of the shop", summary: "The customer fills a cart with books and confirms it; amounts have two decimals and the total stays at the bottom of every screen.", body: "First change of the shop: the cart and its screens." } },
  { kind: "trama", run: ["history", "edit", "b30op7he"], input: { title: "Order and payment with Stripe", summary: "The confirmed cart becomes an order that the customer pays by card through Stripe; a paid order shows a green badge.", body: "Second change of the shop: the order and its payment." } },
  { kind: "trama", run: ["history", "edit", "vuvl4lr6"], input: { title: "Warehouse and courier", summary: "A paid order is packed by the warehouse and collected by the courier, until it is shipped.", body: "Third change of the shop: packing and delivery." } },
  { kind: "trama", run: ["history", "edit", "kzbomzwt"], input: { title: "Cancellation and refund", summary: "A customer can cancel a paid order: at once if nothing was prepared, with a refund through Stripe once preparation has started.", body: "Fourth change of the shop: cancelling an order." } },
];

/** The Specs of the shop. */
const shopSpecs: PrepareStep = {
  kind: "file",
  path: ".trama/specs.yaml",
  content: [
    "languages:",
    "  - name: TypeScript",
    '    version: "7"',
    "    note: strict mode, ES modules",
    "frameworks:",
    "  - name: Bun",
    '    version: "1.4"',
    "    note: runtime, package manager and test runner",
    "data:",
    "  - name: In-memory store",
    "    note: orders and carts live in memory; a database is still to be chosen",
    "testing:",
    "  - name: bun test",
    "    note: the tests next to the code, `bun test src`",
    "deployment:",
    "  - name: Container image",
    "    note: one image for the whole shop",
    "infrastructure:",
    "  - name: Stripe",
    "    note: card payments and refunds",
    "",
  ].join("\n"),
};

/** The Proposal of most scenes: returns after shipping, a new State of the order Machine, a new Event, a new Requirement and one Task. */
const returnsProposal = (as = "returns"): PrepareStep[] => [
  { kind: "trama", run: ["proposal", "new"], as, input: { title: "Returns after shipping", label: "Returns", body: "A shipped order can be sent back within 30 days and the customer is refunded.\n\n## Decisions\n- Returns are free for the customer.\n- The refund goes back to the original payment method.\n\n## Assumptions\n- The courier collects the parcel.\n" } },
  { kind: "file", proposal: `$${as}`, path: "checkout/order.md", replace: [["### Shipped (final)", "### Shipped\nThe package is with the customer.\n- `user.RETURN` → Returned: within 30 days; refunds the customer.\n\n### Returned (final)\nThe package came back and the customer was refunded."]] },
  { kind: "file", proposal: `$${as}`, path: "actors/user.md", replace: [["### CANCEL\nThe user asks to cancel an order.", "### CANCEL\nThe user asks to cancel an order.\n\n### RETURN\nThe user sends a shipped order back."]] },
  { kind: "file", proposal: `$${as}`, path: "requirements/ui/main.md", replace: [["## order/Paid", '## order/Shipped\n- A "Return order" button is shown for 30 days after delivery.\n\n## order/Paid']] },
  { kind: "file", proposal: `$${as}`, path: "tasks/returns.md", content: "---\nrefs:\n  - order\n  - user.RETURN\n  - requirements/ui#order/Shipped\n---\n# Returns after shipping\n\nA shipped order can be sent back within 30 days and the customer is refunded.\n\nAt the end:\n- a shipped order accepts `user.RETURN` and moves to `Returned`\n- the customer is refunded\n" },
  { kind: "trama", run: ["proposal", "move", `$${as}`, "open"] },
];

/** A second Proposal on the same Model file: approving the first makes it stale. */
const draftProposal = (as = "draft"): PrepareStep[] => [
  { kind: "trama", run: ["proposal", "new"], as, input: { title: "Describe the draft order", label: "Draft order", body: "The Draft State says what the order keeps while the customer is choosing.\n" } },
  { kind: "file", proposal: `$${as}`, path: "checkout/order.md", replace: [["The customer is still choosing what to buy.", "The customer is still choosing what to buy; the order keeps its lines."]] },
  { kind: "file", proposal: `$${as}`, path: "tasks/draft.md", content: "---\nrefs:\n  - order/Draft\n---\n# Describe the draft order\n\nThe order keeps its lines while the customer is choosing.\n" },
  { kind: "trama", run: ["proposal", "move", `$${as}`, "open"] },
];

/** The Drift the code of the shop really has: a declined payment cancels the order, but nothing tells the customer. With its prepared question, so that Resolve asks at once. */
const emailDrift = (as = "email", prepared = true): PrepareStep[] => [
  {
    kind: "trama",
    run: ["drift", "new"],
    as,
    input: {
      title: "Declined payment sends no email",
      refs: ["order/Awaiting payment/payment.DECLINED"],
      happens: "When a payment is declined the order moves to **Cancelled** and nothing is sent to the customer.",
      should: "A declined payment moves the order to **Cancelled** and tells the customer by email.",
      where: "`src/order.ts`, method `declined`",
      options: EMAIL_OPTIONS,
    },
  },
  ...(prepared ? [preparedQuestion(as)] : []),
];

const EMAIL_OPTIONS = [
  { title: "Send the email", text: "Add a mail port to the shop and send the notice from `declined`, with the address the order already holds." },
  { title: "Show a message on screen", text: "Change the Model so that the customer sees a message after the refusal, and build that instead of the email." },
];

const preparedQuestion = (as: string): PrepareStep => ({
  kind: "trama",
  run: ["drift", "edit", `$${as}`],
  input: {
    prepared: {
      question: {
        id: `$${as}`,
        question: "A declined payment cancels the order and tells nobody. What should change?",
        context: "The Model says a declined payment moves the order to Cancelled and tells the customer by email. The code moves the order to Cancelled and sends nothing.",
        options: [
          { label: "Send the email", description: "Fix the code: a mail port sends the notice from the declined step.", details: "Pros: the shop does what the Model says. Cons: a new port to build and test." },
          { label: "Show a message on screen", description: "Fix the code to show a message after the refusal; the Model is updated for it.", details: "Pros: no mail service needed. Cons: a customer who closes the page is never told." },
          { label: "Dismiss the Drift", description: "The difference does not matter: nothing changes, in the code or in the Model.", details: "Pros: nothing to build. Cons: the customer is left guessing." },
        ],
        recommended: 0,
        multi: false,
      },
      decisions: [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "dismissed" }],
    },
  },
});

/** A second Drift, about the cart total, to unify with the first. */
const totalDrift = (as = "total"): PrepareStep => ({
  kind: "trama",
  run: ["drift", "new"],
  as,
  input: {
    title: "Cart total shown at the top",
    refs: ["requirements/ui#checkout"],
    happens: "The cart screen shows the total of the order at the **top** of the page.",
    should: "Every checkout screen shows the cart total at the **bottom**.",
    where: "`src/adapters/user.ts`, the cart screen",
    options: [
      { title: "Move the total", text: "Show the total at the bottom of the cart screen." },
      { title: "Show it twice", text: "Keep the total at the top and add it at the bottom." },
    ],
  },
});

/** A Task of the shop that waits in To do. */
const todoTask = (as: string, title: string, refs: string[], body = ""): PrepareStep => ({ kind: "trama", run: ["task", "new"], as, input: { title, refs, ...(body === "" ? {} : { body }) } });

/** The Tasks of the Returns Proposal and of a Drift, waiting in To do. */
const twoTasks: PrepareStep[] = [
  todoTask("t1", "Returns after shipping", ["order/Shipped"], "A shipped order can be sent back within 30 days and the customer is refunded."),
  todoTask("t2", "Declined payment email", ["order/Awaiting payment/payment.DECLINED"], "The customer is told by email when a payment is declined."),
  todoTask("t3", "Cart total at the bottom", ["cart", "requirements/ui#checkout"], "Every checkout screen shows the cart total at the bottom."),
];

/** A git repository around the project, for Solo mode and Merge. */
const gitProject: PrepareStep[] = [
  { kind: "git", args: ["init", "-q", "-b", "main"] },
  { kind: "trama", run: ["project", "edit"], input: { solo: "folders" } },
  { kind: "git", args: ["add", "-A"] },
  { kind: "git", args: ["commit", "-q", "-m", "The shop"] },
];

/** A repository whose origin is on GitHub, with Manager mode on and the GitHub Project linked: Team is available. */
const managerProject: PrepareStep[] = [
  ...gitProject,
  { kind: "git", args: ["remote", "add", "origin", "https://github.com/acme/shop.git"] },
  { kind: "trama", run: ["project", "edit"], input: { manager: true } },
  { kind: "file", path: ".trama/manager/project.json", content: '{"owner":"acme","number":1,"title":"Shop roadmap"}\n' },
];

// ── Steps ───────────────────────────────────────────────────────────────────────────────────────────

/** The Trama panel on its Board, with the side menu and without omp Chat. */
const openBoard: Step[] = [
  { kind: "command", id: "trama.open" },
  { kind: "layout", sidebar: "trama", chat: "hidden" },
  { kind: "wait", in: "panel", target: { text: "Add Work Item" } },
];

/** A view of the panel, chosen in the side menu. */
const openView = (entry: string): Step[] => [
  { kind: "command", id: "trama.open" },
  { kind: "layout", sidebar: "trama", chat: "hidden" },
  { kind: "click", in: "menu", target: { button: entry } },
  { kind: "pause", ms: 1500 },
];

/** Settings, scrolled to a group. */
const openSettings = (heading?: string): Step[] => [
  { kind: "command", id: "trama.open" },
  { kind: "layout", sidebar: "trama", chat: "hidden" },
  { kind: "click", in: "menu", target: { button: "Settings" } },
  { kind: "wait", in: "panel", target: { role: "heading", name: "Settings" } },
  ...(heading === undefined ? [] : [{ kind: "scroll", in: "panel", target: { role: "heading", name: heading, exact: true } } as Step]),
  { kind: "pause", ms: 1800 },
];

/** The side menu of a folder that is not yet a Trama project, with Get Started opened in the panel and omp Chat out of the way. */
const openWizard: Step[] = [
  { kind: "command", id: "workbench.view.extension.trama" },
  { kind: "layout", chat: "hidden" },
  { kind: "click", in: "menu", target: { button: "Get Started" } },
  { kind: "wait", in: "panel", target: { text: "Set up Trama" } },
];
const next: Step = { kind: "click", in: "panel", target: { button: "Next" } };
const settle = (ms = 1200): Step => ({ kind: "pause", ms });
const choose = (path: "Import from Code" | "Start from Scratch"): Step => ({ kind: "click", in: "panel", target: { text: path } });
/** The wizard goes forward `count` steps. */
const forward = (count: number): Step[] => Array.from({ length: count }, () => [next, settle()]).flat();

const DESIGN_REQUEST = "Customers must be able to send back a shipped order. The order should leave Shipped when the courier collects the parcel, and the customer is refunded. Returns are possible within 30 days of delivery.";

/** The developer writes a design request and sends it: the job starts (omp Chat, with `trama.ompChat` on). */
const sendDesignRequest: Step[] = [
  ...openBoard,
  { kind: "click", in: "panel", target: { button: "Add Work Item" } },
  { kind: "pause", ms: 1500 },
  { kind: "write", text: DESIGN_REQUEST },
  { kind: "command", id: "workbench.action.files.save" },
  { kind: "click", in: "window", target: { css: '.editor-actions a.action-label[aria-label*="Send to agent"]' } },
  { kind: "job", count: 1 },
  { kind: "command", id: "trama.showBoard" },
];

/** The Team view's People tab, with the dialog of a person filled in. */
const teamPeopleTab: Step[] = [...openView("Team"), { kind: "click", in: "panel", target: { role: "tab", name: /People/ } }];
const fillPerson = (name: string, handle: string, skills: string[], save: boolean, first = false): Step[] => [
  { kind: "click", in: "panel", target: { button: first ? "Add the first person" : "Add person" } },
  { kind: "type", in: "panel", target: { label: "Name" }, text: name },
  { kind: "type", in: "panel", target: { label: "GitHub handle" }, text: handle },
  ...skills.flatMap((skill): Step[] => [{ kind: "type", in: "panel", target: { placeholder: /Add a skill/ }, text: skill, submit: true }]),
  ...(save ? [{ kind: "click", in: "panel", target: { button: /^Save$/ } } as Step, { kind: "pause", ms: 800 } as Step] : [{ kind: "pause", ms: 500 } as Step]),
];
const twoPeople: Step[] = [...teamPeopleTab, ...fillPerson("Ana Rossi", "acme-ana", ["TypeScript", "payments"], true, true), ...fillPerson("Marco Bianchi", "acme-marco", ["React", "UX"], true)];

const issueFile = (title: string, assignee: string, reviewer: string, estimate: number, sprint: string, body: string): string => `---\nrefs: []\nestimate: ${estimate}\nassignee: ${assignee}\nreviewer: ${reviewer}\nsprint: ${sprint}\n---\n# ${title}\n\n${body}\n`;

/** The Manager writes a handoff request and sends it; what follows runs as the agent of that job. */
const sendHandoffRequest: Step[] = [
  { kind: "command", id: "trama.showTeam" },
  { kind: "click", in: "panel", target: { role: "tab", name: /Decisions/ } },
  { kind: "click", in: "panel", target: { button: "New handoff" } },
  { kind: "pause", ms: 1500 },
  { kind: "write", text: "Gift cards for the shop: a customer can pay with a gift card. Two issues: the data and the checkout screen." },
  { kind: "command", id: "workbench.action.files.save" },
  { kind: "click", in: "window", target: { css: '.editor-actions a.action-label[aria-label*="Send to agent"]' } },
  { kind: "job", count: 1 },
  { kind: "agent-env" },
];

/** A handoff of two issues, handed over to the Manager. */
const handoffSteps: Step[] = [
  { kind: "trama", run: ["proposal", "new"], as: "handoff", input: { title: "Gift cards", kind: "handoff", label: "Gift cards", body: "Gift cards for the shop, in two issues: the data and the checkout screen.\n" } },
  { kind: "file", proposal: "$handoff", path: "issues/gift-card-data.md", as: "giftCardData", content: issueFile("Gift card data", "acme-ana", "acme-marco", 2, "Sprint 2", "## Context\n\nThe shop sells gift cards: a card has a code and a balance.\n\n## Acceptance criteria\n\n- [ ] A gift card can be created, with a code and a balance.\n- [ ] The balance never goes below zero.") },
  { kind: "file", proposal: "$handoff", path: "issues/gift-card-screen.md", as: "giftCardScreen", content: issueFile("Gift card checkout screen", "acme-marco", "acme-ana", 3, "Sprint 3", "## Context\n\nA customer pays with a gift card at checkout.\n\n## Acceptance criteria\n\n- [ ] The checkout screen has a field for the gift card code.\n- [ ] The balance is shown before paying.") },
  { kind: "trama", run: ["proposal", "move", "$handoff", "open"] },
];
/** The agent of the handoff job ends its turn: the job leaves the status bar and the card's buttons are enabled again. */
const handoffFinished: Step[] = [{ kind: "finish" }, { kind: "wait", in: "window", target: { text: "Gift cards for the shop" }, until: "hidden" }];
/** The same handoff approved and its issues published on GitHub. */
const publishedSteps: Step[] = [
  ...handoffSteps,
  { kind: "trama", run: ["proposal", "move", "$handoff", "approved"] },
  { kind: "trama", run: ["issue", "move", "$giftCardData", "published"], input: { number: 13, url: "https://github.com/acme/shop/issues/13" } },
  { kind: "trama", run: ["issue", "move", "$giftCardScreen", "published"], input: { number: 14, url: "https://github.com/acme/shop/issues/14" } },
];

const questionAsk = (round: unknown): AgentCommand => ({ run: ["question", "new"], wait: false, input: round });

/** The agent of the design job asks its round of questions. */
const askRound: Step[] = [
  {
    kind: "agent",
    commands: [
      questionAsk({
        questions: [
          { id: "window", question: "How long after delivery can a customer return an order?", context: "The Model has no way back from Shipped. The time limit decides when a return is still accepted.", options: [{ label: "30 days", description: "The usual limit of online shops." }, { label: "14 days", description: "A shorter window, less refund risk for the shop." }, { label: "No limit", description: "A customer may return an order at any time." }], recommended: 0, multi: false },
          { id: "refund", question: "Where does the refund go?", context: "A returned order is refunded once the courier has collected the parcel.", options: [{ label: "Original payment method", description: "The money goes back through Stripe." }, { label: "Store credit", description: "The customer gets a credit for the next order." }], recommended: 0, multi: false },
          { id: "shipping", question: "Who pays the return shipping?", context: "The courier collects the parcel at the customer's address.", options: [{ label: "The shop", description: "Returns are free for the customer." }, { label: "The customer", description: "The cost is taken out of the refund." }], recommended: 0, multi: false },
        ],
      }),
    ],
  },
];

const reject = (): Target => ({ role: "button", name: /More ways to reject/ });
const moreWork = (): Target => ({ role: "button", name: /More ways to add work/ });
const card = (title: string): Target => ({ text: title });

/** Chat is shown on the right, the Board narrower. */
const showChat: Step = { kind: "layout", chat: "shown" };

// ── The scenes ──────────────────────────────────────────────────────────────────────────────────────

export const SCENES: Scene[] = [
  // Getting started
  {
    name: "menu-get-started",
    shows: "The side menu of a folder that is not a Trama project: Get Started and Settings.",
    project: "code",
    steps: [{ kind: "command", id: "workbench.view.extension.trama" }, { kind: "layout", chat: "hidden" }, { kind: "wait", in: "menu", target: { button: "Get Started" } }, { kind: "pause", ms: 500 }],
  },
  {
    name: "omp-missing",
    shows: "Settings when omp is not found: the reason and Install omp.",
    project: "shop",
    settings: { "trama.ompPath": "/opt/omp/bin/omp" },
    steps: [...openSettings(), { kind: "wait", in: "panel", target: { text: "omp not found" } }],
  },
  { name: "settings-omp", shows: "Settings, the omp group: the answer of omp and the providers.", project: "shop", steps: [...openSettings()] },
  { name: "settings-models", shows: "Settings, the Models group.", project: "shop", steps: [...openSettings("Models")] },
  { name: "settings-project", shows: "Settings, the Project group.", project: "shop", steps: [...openSettings("Project")] },
  { name: "settings-appearance", shows: "Settings, Advanced: Appearance.", project: "shop", steps: [...openSettings("Appearance")] },
  { name: "settings-drifts", shows: "Settings, Advanced: Drifts.", project: "shop", steps: [...openSettings("Drifts")] },
  { name: "settings-agents", shows: "Settings, Advanced: Agents.", project: "shop", steps: [...openSettings("Agents")] },
  { name: "settings-omp-chat", shows: "Settings, Advanced: the omp Chat and Notifications groups at the end of the page.", project: "shop", steps: [...openSettings("omp Chat")] },

  // Get Started: Import from Code
  { name: "wizard-path", shows: "Get Started, the Path step: Import from Code or Start from Scratch.", project: "code", steps: [...openWizard, settle(500)] },
  { name: "wizard-path-import", shows: "Get Started, Path step with Import from Code chosen.", project: "code", steps: [...openWizard, choose("Import from Code"), settle(500)] },
  { name: "wizard-omp", shows: "Get Started, the omp step.", project: "code", steps: [...openWizard, choose("Import from Code"), ...forward(1), settle(1500)] },
  { name: "wizard-models", shows: "Get Started, the Models step.", project: "code", steps: [...openWizard, choose("Import from Code"), ...forward(2)] },
  { name: "wizard-project", shows: "Get Started, the Project step: skills folder, Solo Mode and Manager Mode.", project: "code", steps: [...openWizard, choose("Import from Code"), ...forward(3)] },
  { name: "wizard-folders", shows: "Get Started, the Folders step of Import from Code.", project: "code", steps: [...openWizard, choose("Import from Code"), ...forward(4)] },
  { name: "wizard-advanced", shows: "Get Started, the Advanced step.", project: "code", steps: [...openWizard, choose("Import from Code"), ...forward(5)] },
  { name: "wizard-summary", shows: "Get Started, the Summary with Set up Trama.", project: "code", steps: [...openWizard, choose("Import from Code"), ...forward(6)] },
  {
    name: "import-started",
    shows: "After Set up Trama with Import from Code: the Import conversation of omp Chat and the ghost of the import in the status bar.",
    project: "code",
    steps: [...openWizard, choose("Import from Code"), ...forward(6), { kind: "click", in: "panel", target: { button: "Set up Trama" } }, { kind: "job", count: 1 }, showChat, { kind: "pause", ms: 3000 }],
  },
  // Get Started: Start from Scratch
  { name: "wizard-path-scratch", shows: "Get Started, Path step with Start from Scratch chosen.", project: "empty", steps: [...openWizard, choose("Start from Scratch"), settle(500)] },
  { name: "wizard-summary-scratch", shows: "Get Started, the Summary of Start from Scratch.", project: "empty", steps: [...openWizard, choose("Start from Scratch"), ...forward(5)] },
  {
    name: "scratch-request",
    shows: "After Set up Trama with Start from Scratch: the written request with its grey hint.",
    project: "empty",
    steps: [...openWizard, choose("Start from Scratch"), ...forward(5), { kind: "click", in: "panel", target: { button: "Set up Trama" } }, { kind: "pause", ms: 4000 }],
  },

  // Concepts and the views of the panel
  { name: "diagram-system", shows: "The Diagram at the System level: Actors and Features.", project: "shop", steps: [...openView("Diagram"), { kind: "pause", ms: 1000 }] },
  { name: "requirements-view", shows: "The Requirements view: Areas, fragments and sections.", project: "shop", steps: [...openView("Requirements")] },
  { name: "specs-view", shows: "The Specs view.", project: "shop", prepare: [shopSpecs], steps: [...openView("Specs")] },
  { name: "history-view", shows: "The History view.", project: "shop", prepare: shopInEnglish, steps: [...openView("History")] },
  { name: "board-done", shows: "The Board with the Done column open: finished Tasks.", project: "shop", prepare: shopInEnglish, steps: [...openBoard, { kind: "click", in: "panel", target: { role: "button", name: "Expand Done column" } }, { kind: "pause", ms: 1200 }] },
  {
    name: "board-menu",
    shows: "The Board and the side menu with its badge.",
    project: "shop",
    prepare: [...returnsProposal(), ...emailDrift("email", false)],
    steps: [...openBoard, { kind: "pause", ms: 500 }],
  },

  // Design
  { name: "design-menu", shows: "The arrow beside + Add Work Item: More ways to add work.", project: "shop", prepare: [...emailDrift("email", false), totalDrift()], steps: [...openBoard, { kind: "click", in: "panel", target: moreWork() }, { kind: "pause", ms: 600 }] },
  { name: "design-request-empty", shows: "The written design request, still empty, with its grey hint.", project: "shop", steps: [...openBoard, { kind: "click", in: "panel", target: { button: "Add Work Item" } }, { kind: "pause", ms: 1500 }] },
  {
    name: "design-request",
    shows: "The written design request: the request typed and Send to agent in the title bar.",
    project: "shop",
    steps: [...openBoard, { kind: "click", in: "panel", target: { button: "Add Work Item" } }, { kind: "pause", ms: 1500 }, { kind: "write", text: DESIGN_REQUEST }, { kind: "pause", ms: 300 }],
  },
  { name: "design-ghost", shows: "After Send to agent: the ghost in the Backlog and the Design conversation in omp Chat.", project: "shop", chat: true, steps: [...sendDesignRequest, { kind: "wait", in: "panel", target: { text: "Preparing" } }, { kind: "pause", ms: 1500 }] },
  { name: "design-questions", shows: "The round of questions of the agent, in the overlay of the panel.", project: "shop", chat: true, steps: [...sendDesignRequest, ...askRound, { kind: "wait", in: "panel", target: { text: "How long after delivery" } }, { kind: "pause", ms: 600 }] },
  {
    name: "design-questions-summary",
    shows: "The Summary of the round, with Send to agent.",
    project: "shop",
    chat: true,
    steps: [
      ...sendDesignRequest,
      ...askRound,
      { kind: "wait", in: "panel", target: { text: "How long after delivery" } },
      { kind: "click", in: "panel", target: { button: "Next" } },
      { kind: "click", in: "panel", target: { button: "Next" } },
      { kind: "click", in: "panel", target: { button: "Review" } },
      { kind: "wait", in: "panel", target: { button: "Send to agent" } },
      { kind: "pause", ms: 500 },
    ],
  },

  // Review, approve, reject
  { name: "board-proposal", shows: "The Board with one open Proposal in the Backlog.", project: "shop", prepare: returnsProposal(), steps: [...openBoard, { kind: "wait", in: "panel", target: card("Returns after shipping") }] },
  { name: "review-details", shows: "The details of a Proposal: its text as Markdown.", project: "shop", prepare: returnsProposal(), steps: [...openBoard, { kind: "click", in: "panel", target: card("Returns after shipping") }, { kind: "wait", in: "panel", target: { text: "Decisions" } }] },
  { name: "review-diagram", shows: "The Diagram drawing a Proposal over the Model, with the list of its changes.", project: "shop", prepare: returnsProposal(), steps: [...openBoard, { kind: "click", in: "panel", target: { button: "View on diagram" } }, { kind: "pause", ms: 2500 }] },
  { name: "review-requirements", shows: "The Requirements view with the sections a Proposal adds.", project: "shop", prepare: returnsProposal(), steps: [...openBoard, { kind: "click", in: "panel", target: { button: "View requirements" } }, { kind: "pause", ms: 2000 }] },
  { name: "approve-result", shows: "The Board after Approve: the Task of the Proposal waits in Active.", project: "shop", prepare: returnsProposal(), steps: [...openBoard, { kind: "click", in: "panel", target: { button: "Approve" } }, { kind: "pause", ms: 2500 }] },
  { name: "reject-menu", shows: "The arrow of Reject open on Rework with feedback.", project: "shop", prepare: returnsProposal(), steps: [...openBoard, { kind: "click", in: "panel", target: reject() }, { kind: "pause", ms: 500 }] },
  {
    name: "rework-box",
    shows: "The box of Rework with feedback.",
    project: "shop",
    prepare: returnsProposal(),
    steps: [...openBoard, { kind: "click", in: "panel", target: reject() }, { kind: "click", in: "panel", target: { text: "Rework with feedback" } }, { kind: "pause", ms: 500 }, { kind: "blur", in: "panel" }, { kind: "pause", ms: 500 }],
  },

  // Run
  { name: "run-task-cards", shows: "Tasks in To do in the Active column, each with Run.", project: "shop", prepare: twoTasks, steps: [...openBoard, { kind: "wait", in: "panel", target: card("Declined payment email") }] },
  {
    name: "run-started",
    shows: "Run on a Task: its card with the agent working, and the conversation of the Task in omp Chat.",
    project: "shop",
    chat: true,
    prepare: twoTasks,
    steps: [
      ...openBoard,
      { kind: "click", in: "panel", target: { button: /^Run$/, nth: 0 } },
      { kind: "job", count: 1 },
      { kind: "agent", commands: [{ run: ["task", "move", "$t1", "doing"] }] },
      showChat,
      { kind: "pause", ms: 2500 },
    ],
  },
  {
    name: "run-all",
    shows: "Run all: the button fills while the agent builds the Tasks, the first Task with the animated border.",
    project: "shop",
    chat: true,
    prepare: twoTasks,
    steps: [
      ...openBoard,
      { kind: "click", in: "panel", target: { button: "Run all" } },
      { kind: "job", count: 1 },
      { kind: "agent", commands: [{ run: ["task", "move", "$t1", "doing"] }] },
      showChat,
      { kind: "pause", ms: 2500 },
      { kind: "scroll", in: "chat", target: { text: /trama-implement skill/ } },
      { kind: "pause", ms: 500 },
    ],
  },

  // Scan
  { name: "scan-confirm", shows: "Scan System: the confirmation dialog.", project: "shop", steps: [...openBoard, { kind: "click", in: "menu", target: { button: "Scan System" } }, { kind: "wait", in: "window", target: { text: "Scan the whole System?" } }, { kind: "pause", ms: 400 }] },
  {
    name: "scan-running",
    shows: "A scan in progress: the ghost in the status bar and the Scan conversation in omp Chat.",
    project: "shop",
    chat: true,
    steps: [...openBoard, { kind: "click", in: "menu", target: { button: "Scan System" } }, { kind: "click", in: "window", target: { button: /^Scan$/ } }, { kind: "job", count: 1 }, showChat, { kind: "pause", ms: 2500 }],
  },
  {
    name: "scan-result",
    shows: "The scan has finished: its Drift is a red card in the Backlog.",
    project: "shop",
    chat: true,
    steps: [
      ...openBoard,
      { kind: "click", in: "menu", target: { button: "Scan System" } },
      { kind: "click", in: "window", target: { button: /^Scan$/ } },
      { kind: "job", count: 1 },
      { kind: "agent", commands: [{ run: ["announcement", "new"], as: "chk", input: { kind: "check", title: "Scanning System", phase: "scanning" } }, ...emailDriftCommands(), { run: ["announcement", "move", "$chk", "delivered"] }] },
      { kind: "wait", in: "panel", target: card("Declined payment sends no email") },
      { kind: "finish" },
      { kind: "wait", in: "panel", target: { button: "Resolve" } },
      { kind: "pause", ms: 1500 },
    ],
  },

  // Drifts
  { name: "drift-card", shows: "The Board with a Drift: the red card in the Backlog.", project: "shop", prepare: emailDrift(), steps: [...openBoard, { kind: "wait", in: "panel", target: card("Declined payment sends no email") }] },
  { name: "drift-details", shows: "The details of a Drift: what happens, what should happen.", project: "shop", prepare: emailDrift(), steps: [...openBoard, { kind: "click", in: "panel", target: card("Declined payment sends no email") }, { kind: "wait", in: "panel", target: { text: "What happens" } }] },
  { name: "drift-resolve-question", shows: "Resolve on a Drift: the question with the Fix options, in the overlay.", project: "shop", prepare: emailDrift(), steps: [...openBoard, { kind: "click", in: "panel", target: { button: "Resolve" } }, { kind: "wait", in: "panel", target: { text: "Send the email" } }, { kind: "pause", ms: 600 }] },
  {
    name: "drift-resolved",
    shows: "A Fix option chosen: the resolution, a yellow card in the Backlog, with Approve and Reject.",
    project: "shop",
    prepare: emailDrift(),
    steps: [
      ...openBoard,
      { kind: "click", in: "panel", target: { button: "Resolve" } },
      { kind: "wait", in: "panel", target: { text: "Send the email" } },
      { kind: "click", in: "panel", target: { button: "Review" } },
      { kind: "click", in: "panel", target: { button: "Send to agent" } },
      { kind: "pause", ms: 2500 },
    ],
  },
  { name: "drift-dismiss-menu", shows: "The arrow of Dismiss Drift open on Rework with feedback.", project: "shop", prepare: emailDrift(), steps: [...openBoard, { kind: "click", in: "panel", target: { role: "button", name: /More ways to handle/ } }, { kind: "pause", ms: 500 }] },
  {
    name: "drift-blocked-task",
    shows: "A Task blocked by an open Drift: the blocked badge in Active.",
    project: "shop",
    prepare: [todoTask("t2", "Declined payment email", ["order/Awaiting payment/payment.DECLINED"], "The customer is told by email when a payment is declined."), ...emailDrift("email", false)],
    steps: [...openBoard, { kind: "wait", in: "panel", target: { text: "blocked" } }, { kind: "pause", ms: 500 }],
  },

  // Unify
  { name: "unify-menu", shows: "The arrow of + Add Work Item with Unify Drifts.", project: "shop", prepare: [...emailDrift("email", false), totalDrift()], steps: [...openBoard, { kind: "click", in: "panel", target: moreWork() }, { kind: "wait", in: "panel", target: { text: "Unify Drifts" } }] },
  {
    name: "unify-running",
    shows: "Unify Drifts in progress: the ghost in the Backlog and the Unifying badge on each collected Drift.",
    project: "shop",
    chat: true,
    prepare: [...emailDrift("email", false), totalDrift()],
    // The menu gives the focus back to its arrow, whose tooltip would stay open: the focus leaves it before the picture.
    steps: [...openBoard, { kind: "click", in: "panel", target: moreWork() }, { kind: "click", in: "panel", target: { button: "Unify Drifts" } }, { kind: "job", count: 1 }, showChat, { kind: "pause", ms: 2500 }, { kind: "blur", in: "panel" }, { kind: "pause", ms: 500 }],
  },

  // Refine
  { name: "refine-stale", shows: "A stale Proposal: the chip to refine on its card.", project: "shop", prepare: [...returnsProposal(), ...draftProposal(), { kind: "trama", run: ["proposal", "move", "$returns", "approved"] }], steps: [...openBoard, { kind: "wait", in: "panel", target: { text: "to refine" } }, { kind: "pause", ms: 500 }] },
  {
    name: "refine-menu",
    shows: "The arrow beside + Add Work Item with Refine All.",
    project: "shop",
    prepare: [...returnsProposal(), ...draftProposal(), { kind: "trama", run: ["proposal", "move", "$returns", "approved"] }],
    steps: [...openBoard, { kind: "click", in: "panel", target: moreWork() }, { kind: "wait", in: "panel", target: { text: "Refine All" } }],
  },
  {
    name: "refine-running",
    shows: "A Proposal being refined: the refining badge and the phase on its card.",
    project: "shop",
    chat: true,
    prepare: [...returnsProposal(), ...draftProposal(), { kind: "trama", run: ["proposal", "move", "$returns", "approved"] }],
    steps: [...openBoard, { kind: "click", in: "panel", target: { button: "Approve" } }, { kind: "job", count: 1 }, { kind: "wait", in: "panel", target: { text: "refining" } }, { kind: "pause", ms: 1200 }],
  },

  // Solo mode
  { name: "solo-settings", shows: "Settings, the Project group with Solo Mode on and its Exclude choice.", project: "shop", prepare: gitProject, steps: [...openSettings("Project")] },
  { name: "solo-merge-menu", shows: "The side menu with Merge, at the bottom, in Solo mode.", project: "shop", prepare: gitProject, steps: [...openBoard, { kind: "wait", in: "menu", target: { button: "Merge" } }, { kind: "pause", ms: 500 }] },
  {
    name: "solo-merge-branch",
    shows: "Merge: the list of branches to merge into the current one.",
    project: "shop",
    prepare: [...gitProject, { kind: "git", args: ["branch", "feature/refunds"] }, { kind: "git", args: ["branch", "feature/gift-cards"] }],
    steps: [...openBoard, { kind: "click", in: "menu", target: { button: "Merge" } }, { kind: "wait", in: "window", target: { css: ".quick-input-widget" } }, { kind: "pause", ms: 800 }],
  },

  // omp Chat
  {
    name: "omp-chat-general",
    shows: "General: a conversation with omp about the Model, with a tool row and the model selector.",
    project: "shop",
    chat: true,
    steps: [
      { kind: "command", id: "trama.open" },
      { kind: "layout", sidebar: "trama", chat: "shown" },
      { kind: "wait", in: "chat", target: { placeholder: /Message omp/ } },
      { kind: "type", in: "chat", target: { placeholder: /Message omp/ }, text: "Which states can an order be in?", submit: true },
      { kind: "wait", in: "chat", target: { text: "Shipped and Cancelled are final" } },
      { kind: "pause", ms: 800 },
    ],
  },
  {
    name: "omp-chat-empty",
    shows: "General when empty: the message field, Steer and Queue, the model selector and the usage bar.",
    project: "shop",
    chat: true,
    steps: [{ kind: "command", id: "trama.open" }, { kind: "layout", sidebar: "trama", chat: "shown" }, { kind: "wait", in: "chat", target: { placeholder: /Message omp/ } }, { kind: "pause", ms: 1500 }],
  },
  {
    name: "unify-result",
    shows: "The result of Unify Drifts: one Drift with the unified badge.",
    project: "shop",
    chat: true,
    prepare: [...emailDrift("email", false), totalDrift()],
    steps: [
      ...openBoard,
      { kind: "click", in: "panel", target: moreWork() },
      { kind: "click", in: "panel", target: { button: "Unify Drifts" } },
      { kind: "job", count: 1 },
      {
        kind: "agent",
        commands: [
          { run: ["announcement", "new"], as: "ann", input: { kind: "drift", title: "Unifying 2 Drifts" } },
          {
            run: ["drift", "new"],
            input: {
              announcement: "$ann",
              title: "Checkout screens differ from the Model",
              refs: ["order/Awaiting payment/payment.DECLINED", "requirements/ui#checkout"],
              happens: "A declined payment tells the customer nothing, and the cart screen shows its total at the top.",
              should: "A declined payment tells the customer by email, and every checkout screen shows the cart total at the bottom.",
              where: "`src/order.ts`, method `declined`; `src/adapters/user.ts`, the cart screen",
              options: [{ title: "Fix both in the code", text: "Send the email from `declined` and move the total to the bottom." }, { title: "Fix the screens only", text: "Move the total and leave the email for later." }],
              unifies: ["$email", "$total"],
            },
          },
        ],
      },
      { kind: "wait", in: "panel", target: { text: "unified" } },
      { kind: "pause", ms: 800 },
      { kind: "blur", in: "panel" },
      { kind: "pause", ms: 500 },
    ],
  },
  {
    name: "diagram-focus",
    shows: "The Diagram focused on what a Task touches: the Machine with the State the Task references.",
    project: "shop",
    prepare: twoTasks,
    steps: [...openBoard, { kind: "click", in: "panel", target: { button: "View on diagram", nth: 0 } }, { kind: "pause", ms: 2500 }],
  },
  {
    name: "diagram-machine",
    shows: "The Diagram at the Machine level: States and Transitions of the order.",
    project: "shop",
    prepare: twoTasks,
    steps: [...openBoard, { kind: "click", in: "panel", target: { button: "View on diagram", nth: 0 } }, { kind: "pause", ms: 2000 }, { kind: "click", in: "panel", target: { button: "Clear" } }, { kind: "pause", ms: 1500 }],
  },
  {
    name: "task-details",
    shows: "The details of a Task: its references as chips and its text.",
    project: "shop",
    prepare: twoTasks,
    steps: [...openBoard, { kind: "click", in: "panel", target: card("Declined payment email") }, { kind: "pause", ms: 1000 }],
  },
  {
    name: "omp-chat-usage",
    shows: "omp Chat with the usage bar of the subscription under the message field, beside the model selector.",
    project: "shop",
    chat: true,
    steps: [{ kind: "command", id: "trama.open" }, { kind: "layout", sidebar: "trama", chat: "shown" }, { kind: "wait", in: "chat", target: { button: "5h" } }, { kind: "pause", ms: 1200 }],
  },
  { name: "manager-settings", shows: "Settings, the Project group with Manager Mode on: the repository found on GitHub.", project: "shop", prepare: managerProject, steps: [...openSettings("Project")] },
  { name: "team-menu", shows: "The side menu with the Team entry, after History, in Manager mode.", project: "shop", prepare: managerProject, steps: [...openBoard, { kind: "wait", in: "menu", target: { button: "Team" } }, { kind: "pause", ms: 500 }] },
  { name: "team-decisions", shows: "The Team view, Decisions tab, with New handoff.", project: "shop", prepare: managerProject, steps: [...openView("Team"), { kind: "pause", ms: 1500 }] },
  { name: "team-person-dialog", shows: "The dialog of a person of the team, filled in.", project: "shop", prepare: managerProject, steps: [...teamPeopleTab, ...fillPerson("Ana Rossi", "acme-ana", ["TypeScript", "payments"], false, true)] },
  { name: "team-people", shows: "The Team view, People tab, with two people.", project: "shop", prepare: managerProject, steps: [...twoPeople, { kind: "pause", ms: 800 }] },
  { name: "team-handoff", shows: "A handoff waiting in the Decisions tab, with Approve and Reject.", project: "shop", prepare: managerProject, steps: [...twoPeople, ...sendHandoffRequest, ...handoffSteps, ...handoffFinished, { kind: "command", id: "trama.showTeam" }, { kind: "click", in: "panel", target: { role: "tab", name: /Decisions/ } }, { kind: "layout", chat: "hidden" }, { kind: "wait", in: "panel", target: { text: "Gift cards" } }, { kind: "pause", ms: 1000 }] },
  { name: "team-handoff-preview", shows: "The preview of a handoff: each issue as it will be published, with assignee, reviewer, estimate and sprint.", project: "shop", prepare: managerProject, steps: [...twoPeople, ...sendHandoffRequest, ...handoffSteps, ...handoffFinished, { kind: "command", id: "trama.showTeam" }, { kind: "click", in: "panel", target: { role: "tab", name: /Decisions/ } }, { kind: "layout", chat: "hidden" }, { kind: "click", in: "panel", target: { text: "Gift cards", exact: true } }, { kind: "pause", ms: 1500 }] },
  { name: "team-issues", shows: "The Team view, Issues tab: the published issues of an epic.", project: "shop", prepare: managerProject, steps: [...twoPeople, ...sendHandoffRequest, ...publishedSteps, ...handoffFinished, { kind: "command", id: "trama.showTeam" }, { kind: "click", in: "panel", target: { role: "tab", name: /Issues/ } }, { kind: "click", in: "panel", target: { button: "Refresh" } }, { kind: "layout", chat: "hidden" }, { kind: "pause", ms: 2500 }] },
  { name: "team-timeline", shows: "The Team view, Timeline tab: the sprints of the GitHub Project with each person's load.", project: "shop", prepare: managerProject, steps: [...twoPeople, ...sendHandoffRequest, ...publishedSteps, ...handoffFinished, { kind: "command", id: "trama.showTeam" }, { kind: "click", in: "panel", target: { role: "tab", name: /Timeline/ } }, { kind: "click", in: "panel", target: { button: "Refresh" } }, { kind: "layout", chat: "hidden" }, { kind: "pause", ms: 2500 }] },
];

/** What the scan agent files: the Drift of the shop (its prepared question is a later job of the agent). */
function emailDriftCommands(): AgentCommand[] {
  return [
    { run: ["announcement", "new"], as: "ann", input: { kind: "drift", title: "Declined payment sends no email" } },
    {
      run: ["drift", "new"],
      input: {
        announcement: "$ann",
        title: "Declined payment sends no email",
        refs: ["order/Awaiting payment/payment.DECLINED"],
        happens: "When a payment is declined the order moves to **Cancelled** and nothing is sent to the customer.",
        should: "A declined payment moves the order to **Cancelled** and tells the customer by email.",
        where: "`src/order.ts`, method `declined`",
        options: EMAIL_OPTIONS,
      },
    },
  ];
}
