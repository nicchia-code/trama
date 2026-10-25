---
name: trama-merge
description: Use when asked to resolve the conflicts of the merge in progress that Trama started in a project with a `.trama/` folder (Solo mode). Resolves the conflicted files of the open folder keeping the intent of both sides, asks the developer when it cannot tell which intent holds, stages only the files it resolved and never commits.
---

# Trama: merge

A **merge** of another branch into the current one is in progress in the open folder and stopped with conflicts. You resolve the conflicts of the files in the working tree, keeping the intent of **both sides**, and leave the resolved files in the index, ready for the developer to review and commit. The code is what you work on: you never read or change the Model, the Requirements or any other file of Trama.

## Hard rules

- **Never commit.** No `git commit`, no `git merge --continue`, no `git cherry-pick --continue`. The developer commits the merge.
- **Never leave the merge.** Never run `git merge --abort`, `git reset`, `git restore` of whole trees, `git stash`, `git rebase`, `git checkout` or `git switch` of a branch, or anything that moves HEAD or undoes the merge. Never take a whole file or a whole branch with `git checkout --ours`, `--theirs` or `git merge -X`: each conflict is resolved on its own text.
- **Never touch `.trama/`.** Not the Model, the Requirements, the cards or the skills; they are not part of this job. Never run a `trama` command except `trama question new`.
- **Stage only what you resolved.** Run `git add <file>` for each file whose conflicts you resolved completely, and for no other file. A file you leave with conflicts stays unstaged and keeps its markers.
- **No conflict marker stays in a file you stage.** Before `git add`, search the file for `<<<<<<<`, `=======` and `>>>>>>>` lines that belong to the conflict.
- Work only in the open folder, on the merge that is in progress.

## Hand-over

When the conflicts are resolved, end with **one line** that tells the developer to review the files in the index and commit the merge. Nothing else follows it. If you left conflicts for the developer, say which files stay unresolved in the line before it.

## Steps

1. **Read the situation.** `git status` lists the files with conflicts (`both modified`, `added by us`, `deleted by them`, and the like). `git log --oneline --merge` and `git diff --name-only --diff-filter=U` complete it. Note the branch being merged: the instruction names it.
2. **Understand each side.** For every conflicted file read the conflicted text and the history of both sides (`git log --merge -p -- <file>`, `git show :1:<file>`, `git show :2:<file>`, `git show :3:<file>` for the common ancestor, ours and theirs). Say to yourself what each side was trying to do, not only what text it wrote.
3. **Resolve every conflict keeping both intents.** The result does what the current branch wanted and also what the merged branch wanted. When the two cannot both hold, pick as step 4 says. Keep the surrounding formatting and style of the file; do not reformat what is not in conflict. A file deleted on one side and changed on the other, a rename on both sides and a binary file are conflicts too: resolve them by the same rule.
4. **Ask when you cannot tell which intent holds.** If the two sides contradict each other and nothing in the code, the tests or the history says which one should win, do not guess: ask the developer with `trama question new`, as the next section says, and apply the answer.
5. **Check the result.** The resolved files read as one coherent change, with no marker left. When the project has a quick way to check them (a compiler or a type check on the files you touched, the tests that cover them), run it; never run a long full suite for this job.
6. **Stage and hand over.** `git add` each resolved file, then write the one line of the hand-over.

## Asking

Run **`trama question new --root <project> --input -`** with the JSON request on standard input, in a heredoc. Make **one round only** for all the conflicts you cannot settle, with one question per conflict, all single-choice (`multi: false`).

- Send one complete round as `{questions: [...]}`. Every question has an `id` (a short slug of the file and the conflict, unique in the round), `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Two fields are optional: `context` on a question and `details` on an option; when present they must not be blank.
- Keep `question` short: one sentence that reads on its own. Put the file and what each side did in `context`, the consequence of each choice in a few words in `description`, and the detail in `details`. `question`, `context`, `description` and `details` are Markdown; labels are plain text. Do not supply "Other": Trama always offers a free-text answer.
- The options are the intents that can hold (keep the current branch's behaviour, keep the merged branch's, or a combination you describe), each written the same way. `recommended` is your own choice.
- The developer sees only the round (each question, its context, its options and their own answers), never your conversation. Make every question self-contained: it says everything needed to decide, with no references to the conversation or to another question, and no first person (write "Trama" or "the agent", never "I" or "we"). Omit `context` when the question and the options are enough on their own.
- A result with `status: "answered"` contains `answers` keyed by question id, each with the `selected` labels and an optional free `text`; the text goes with the choice and guides how you write the resolution. A `status: "skipped"` entry is an explicit developer skip: leave that conflict unresolved, its file unstaged, say so in the line before the hand-over and do not ask it again.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Resolve and stage nothing more, do not fall back, retry or resume the round, and tell the developer that the editor was lost.
- **Wait for `trama question new` to finish**: it blocks until the developer answers, however long that takes. Run it with no time limit: pass `timeout: 0` to the bash tool, never a fixed value. These waiting rules hold always: never use a timer or a fixed-duration wait, `sleep`, periodic reads of the terminal output or interval checks; never end the turn to be woken up; never treat `trama question new` as failed and never run it again.
- Only an initial `status: "unavailable"` result means the editor is unavailable. Then you ask in no other way: you stop, resolve no conflict that needs a decision, and tell the developer to open the project in the editor with Trama. When the developer says to continue, run the same `trama question new` again: it is a new round.
- A usage error of `trama question new` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. A deliberate skip is not re-asked.
- Never use omp's `ask` tool, and never write the questions in the conversation: `trama question new` is the only way to ask the developer.

Example round, on standard input:

```json
{"questions": [{"id": "billing-rounding", "question": "Which rounding does `billing.ts` keep?", "context": "The current branch rounds each line to cents before summing; the merged branch sums first and rounds the total.", "options": [{"label": "Round each line", "description": "Totals match the printed lines."}, {"label": "Round the total", "description": "Totals are exact; lines may not add up."}], "recommended": 0, "multi": false}]}
```

The examples use POSIX syntax. In PowerShell, pass JSON with a pipe and `--input -`, for example `Get-Content -Raw round.json | trama question new --input -`, instead of `<` or a heredoc. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Never pass the JSON as the text of `--input`: Windows PowerShell 5.1 strips the inner quotes of arguments to external programs.

## Language

When the instruction asks you to write in a language, the texts listed below go in that language. Without a language in the instruction, nothing here changes.

- **In the language of the instruction:** the titles and bodies of Tasks and the titles of groups of Tasks; the titles, bodies and Fix options of Drifts; the titles, introductions and reasons of Proposals; the text, context and options of questions (also the resolution question the Async Drift Resolver prepares); the notes of ghosts and the titles of announcements; the titles, summaries and texts of History entries; your replies during the work and your final report; the replies in General.
- **Always in English**, whatever the language: the whole Model (the name of the System; the names of Features, Machines, Actors and States; IDs and Event names; the descriptions in Model files); the Requirements (Areas, titles and bodies of fragments); the Specs, also their `notes`; code and its comments, commit messages and the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers and the front matter fields; technical terms (commands and tools such as `git pull` or `npm install`, names of products, services, libraries and languages) and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.
- **No first person in Trama's texts.** In what you write for Trama (questions, contexts and options of rounds, titles and bodies of Proposals, Tasks and Drifts, History entries), Trama is always "Trama" and you are "the agent": no "I", "me", "my", "we", "our", and in Italian no "io", "noi" or first-person verbs. Your replies in the conversation are not Trama's texts and do not change. Text already written is not rewritten.
