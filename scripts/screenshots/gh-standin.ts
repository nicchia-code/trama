// The stand-in for the GitHub CLI (`gh`) that `scripts/screenshots.ts` puts on the PATH beside the stand-in omp: it answers the reads of the Team view (`gh --version`,
// `gh auth status`, and the three GraphQL queries for the Projects of the owner, the fields of the linked Project and its items) with a small fixed Project, and never contacts GitHub.
const args = process.argv.slice(2);
const out = (value: unknown): void => void process.stdout.write(typeof value === "string" ? `${value}\n` : `${JSON.stringify(value)}\n`);

const day = 86_400_000;
const date = (offset: number): string => new Date(Date.now() - ((new Date().getUTCDay() + 6) % 7) * day + offset * day).toISOString().slice(0, 10);
const iterations = [
  { id: "it-1", title: "Sprint 1", startDate: date(-7), duration: 7 },
  { id: "it-2", title: "Sprint 2", startDate: date(0), duration: 7 },
  { id: "it-3", title: "Sprint 3", startDate: date(7), duration: 7 },
  { id: "it-4", title: "Sprint 4", startDate: date(14), duration: 7 },
  { id: "it-5", title: "Sprint 5", startDate: date(21), duration: 7 },
];

const fields = [
  { id: "f-title", name: "Title", dataType: "TITLE" },
  { id: "f-sprint", name: "Sprint", dataType: "ITERATION", configuration: { iterations: iterations.slice(1), completedIterations: iterations.slice(0, 1) } },
  { id: "f-estimate", name: "Estimate", dataType: "NUMBER" },
  { id: "f-status", name: "Status", dataType: "SINGLE_SELECT", options: [{ id: "s1", name: "Todo" }, { id: "s2", name: "In Progress" }, { id: "s3", name: "Done" }] },
];

const issue = (number: number, title: string, state: string, assignee: string, sprint: string, estimate: number, status: string) => ({
  content: { number, title, state, stateReason: state === "CLOSED" ? "COMPLETED" : null, repository: { nameWithOwner: "acme/shop" }, assignees: { nodes: [{ login: assignee }] }, closedByPullRequestsReferences: { nodes: [] }, linkedBranches: { nodes: [] } },
  fieldValues: { nodes: [{ title: sprint, field: { name: "Sprint" } }, { number: estimate, field: { name: "Estimate" } }, { name: status, field: { name: "Status" } }] },
});

const query = args.find((arg) => arg.startsWith("query=")) ?? "";
if (args[0] === "--version") out("gh version 2.60.0 (stand-in)");
else if (args[0] === "auth") out("github.com\n  ✓ Logged in to github.com account acme (keyring)\n  - Token scopes: 'project', 'repo'");
else if (args[0] === "api" && query.includes("projectsV2(first: 50")) {
  out({ data: { repositoryOwner: { login: "acme", projectsV2: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ number: 1, title: "Shop roadmap", closed: false, fields: { nodes: fields.map(({ name, dataType }) => ({ name, dataType })) } }] } }, repository: { projectsV2: { nodes: [{ number: 1 }] } } } });
} else if (args[0] === "api" && query.includes("fragment ProjectFields")) {
  out({ data: { repositoryOwner: { projectV2: { number: 1, title: "Shop roadmap", url: "https://github.com/orgs/acme/projects/1", fields: { nodes: fields } } } } });
} else if (args[0] === "api" && query.includes("fragment ProjectItems")) {
  out({
    data: {
      repositoryOwner: {
        projectV2: {
          items: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              issue(12, "Gift cards: data model", "CLOSED", "acme-ana", "Sprint 1", 2, "Done"),
              issue(13, "Gift cards: checkout screen", "OPEN", "acme-ana", "Sprint 2", 3, "In Progress"),
              issue(14, "Gift cards: refunds", "OPEN", "acme-marco", "Sprint 2", 2, "Todo"),
              issue(15, "Gift cards: email receipt", "OPEN", "acme-marco", "Sprint 3", 1, "Todo"),
            ],
          },
        },
      },
    },
  });
} else {
  process.stderr.write(`gh stand-in: unsupported ${args.join(" ")}\n`);
  process.exit(1);
}
