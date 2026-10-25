# Requirements: Qualità, Handoffs and issues

Use when the work touches what Team sends to GitHub, the safety of the gh calls or the accessibility of the Decisions and Issues tabs.

## issue

- What reaches GitHub is only what the Manager approved: the title, the composed body, the label, the assignee and the fields of each issue of an approved handoff. Nothing about people other than their GitHub handle, nothing of the Model beyond what the agent wrote in the body and, outside Solo mode, the list of references.
- Trama's own `gh` calls only read; a test fixes that `src/core/github.ts` holds no command that writes. `gh` runs without a shell and with fixed arguments: no file of the repository, no setting of the workspace and no text of an issue changes the command Trama runs.
- The Manager's account is the one `gh` holds: Trama never reads, stores or passes on a GitHub token.
- Accessibility of the Decisions and Issues tabs: every control reachable from the keyboard with a visible focus ring; the state of an issue told by text as well as colour; the preview's keyboard shortcuts are announced in the tooltips of their buttons; contrast AA in both themes.
