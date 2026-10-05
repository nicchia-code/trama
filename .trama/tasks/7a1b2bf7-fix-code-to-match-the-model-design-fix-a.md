---
column: done
technical: false
refs:
  - agent-questions
  - requirements/rules#question-round
drift: 3406e0d6
proposal: null
agent: false
created: 1970-01-01T00:00:00.064Z
---
# Fix code to match the Model: Design, fix and import skills still select the agent question tool first

## What happens

The shipped Asking sections of the design, fix and import skills explicitly select omp `ask` or Copilot `vscode_askQuestions` as their primary interface and contain no attempt to use the editor question channel: skills/trama-design/SKILL.md:61-67, skills/trama-fix/SKILL.md:62-68 and skills/trama-import/SKILL.md:54-60. They also provide no instructions to consume explicit skipped results, apply the recommendation and list those choices for verification. This contradicts the approved routing rule even after the missing question capability is implemented.

## What should happen

After approval of Proposal 0012, requirements/rules#question-round requires trama-design, trama-fix and trama-import to prefer `trama_ask`, use `trama ask` when tools are unavailable, and fall back to the agent's own question interface only when the editor is unavailable. The developer must decide the resolution; the Scan that filed this Drift did not change the skills or the Requirements.
