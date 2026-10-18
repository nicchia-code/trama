---
name: trama-setup
description: Use when the instruction names a written design request for starting a project from scratch (a file `.trama/requests/<id>.md`) and the Model of a project with a `.trama/` folder is empty. Interviews the developer about the stack, release, data and tests, then writes the first Proposal (kind setup) with the Model, Requirements, Specs and the Tasks that build the project. Not for writing code.
---

# Trama: setup

This skill starts an empty project. The **Model** in `.trama/model/` is still empty; the first **Proposal** of the project carries its first Model, its Requirements, its **Specs** and the Tasks that build the project skeleton. You never write code in this skill, and you never edit `.trama/model/`, `.trama/requirements/` or the generated `trama-req-*` skills directly: every change goes through the Proposal, created with `trama proposal new --setup`.

For the format of Model and Requirement files, read [`trama-design`](../trama-design/FORMAT.md) (installed next to this skill); do not copy it here.

## Hard rules

- Agents may approve or reject a Proposal, discard a Draft or resolve a Drift only when the developer explicitly asks for that decision in the conversation. This skill never does so on its own, and without that request it does not ask the developer about it: hand the Proposal over and stop, and tell them the decision is theirs, on the Board. Approval on hand-over is Trama's, not yours.
- The Model describes *what can happen*, never *how it is built*: no variables, field names, database columns, endpoints, classes or file paths in Model files. Technology, layout, release and data choices belong in Requirements and Specs.
- In every command and every file use only the **permanent identity** of a card (from `--json`, field `id`, or from the file name). Never write a short number (`P3`, `T3`) in a file.
- Name cards to the developer by short number and title ("Proposal P3 – title"). A closed card has no number: use its identity.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Step 1: read the request

The instruction names a file `.trama/requests/<id>.md`. Read the **whole** file before anything else. If it does not exist, tell the developer that the request is gone and stop, without opening any Proposal.

The request is the starting point of the interview, never its answers. Every decision it makes still becomes a question with its options, the option the request indicates being your recommendation.

Look at every image the request links, with the same rules as `trama-design`: local files and web addresses you can open, images you cannot see ignored silently, what matters written in words, and no copy, link or citation of the request's images, or their paths, in the Proposal, the Model, the Requirements, the Specs or the Tasks.

## Step 2: check the Model is empty

Run `trama system --json` and `trama search <word>` only as needed. If the Model already has a Feature or an Actor, stop and tell the developer that `trama-design` is the skill for it: `trama proposal new --setup` would be refused.

## Step 3: interview in rounds

Ask in rounds with `trama ask --root <project>`, exactly as `trama-design` does (its "The interview" and "Asking" sections apply: one round per call, 2 to 5 options per question with tradeoffs, your recommendation on each, wait for the answers, no "Other", no fallback after `editor-interrupted`).

Ask only what the request leaves ambiguous and never repeat what is clear. When in doubt, ask one question more. Cover, when not already settled:

- **What the developer wants**: the purpose and the first behaviour of the System.
- **Languages and frameworks.**
- **Release**: desktop application, web or other; repository and where it lives (for example GitHub); cloud (Azure, AWS, Google Cloud) or on premise; for cloud, which resources; infrastructure files (Terraform, Bicep, or none, with a manual release).
- **Data and persistence.**
- **Tests and CI.**

A technology the developer names vaguely ("a web framework used today") you choose yourself, without asking. Record it in Specs with `chosenByAgent: true` and the reason.

## Step 4: write one Proposal

Open exactly one Proposal, bound to the request:

`trama proposal new "<title>" --setup --body "<why>" --request <id>`

Give the Proposal a short title (see Hard rules).

The body says why and summarises each decision of the interview, one line each, with the assumptions made for skipped questions. Then:

1. **Model**: System, Features, Machines and Actors as they are agreed, each through `trama proposal edit <id> <model-path>`.
2. **Requirements**: the Areas and fragments the developer gave you, through `trama proposal edit <id> requirements/<area>/…` (see `trama-design`'s FORMAT.md).
3. **Specs**: every field clarified in the interview, with `chosenByAgent` and the reason for each technology you chose yourself.
4. **Tasks**: with `trama proposal edit <id> tasks/<slug>.md`, one per piece of work. Include the technical Tasks that create the project skeleton, the repository, the CI and the infrastructure files chosen (`technical: true`, no Model element). Non-technical Tasks name at least one Model element, as in `trama-design`.

The hand-over below reads the submission's output: it must match what was agreed and nothing else.

## Step 5: hand over

Run `trama proposal submit <id>` without `trama validate --proposal` or `trama proposal show` before it, as in `trama-design`. If it is refused, or its output does not match what was agreed, reopen the Proposal with `trama proposal edit <id>`, fix it, and submit again.

After a successful hand-over, read the result of `trama proposal submit`:

- If it says the Proposal was **approved**, tell the developer that the Proposal is approved and that its Tasks start.
- If it says the Proposal was **not approved** (it stays open), tell the developer that it was handed over and why it was not approved on its own, from the submit output.

Do not ask the developer to review the Proposal. Do not approve, reject or discard it yourself.

## Written design request

The request is consumed by the successful hand-over of the bound Proposal: its file is deleted then. Do not delete the file yourself.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON on standard input with a pipe, for example `Get-Content -Raw round.json | trama ask --root <project>`, not `<`. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Write `--body` and `--reason` values in single quotes, because PowerShell expands `$` and the backtick inside double quotes.
