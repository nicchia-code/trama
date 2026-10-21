---
refs:
  - question-round
  - requirements/tech#question-round
  - requirements/rules#question-round
---
# Domande solo per due agenti

Quando il Task è fatto, il round di domande resta identico in ogni editor in cui l'estensione gira: l'overlay modale sopra le schede del pannello Trama e l'host che crea o porta in primo piano il pannello (`reveal` con focus) prima di mandargli il round non distinguono più Cursor da VS Code, e non ne parlano nemmeno nei commenti.

Ogni skill di Trama vieta per nome solo gli strumenti di domande degli agenti supportati, `AskQuestion` di Cursor e `ask` di omp, oltre al round scritto nella conversazione, e chiama `trama question new` per nome. Nella riga «Never use your own question tool (...)» di `skills/trama-design/SKILL.md`, `skills/trama-import/SKILL.md` e `skills/trama-resolve-drifts/SKILL.md` spariscono `vscode_askQuestions in VS Code` e `AskUserQuestion in Claude Code`; nessun'altra skill sotto `skills/` nomina più strumenti di agenti non supportati. Se `test/skills.test.ts` controlla l'elenco dei nomi, va allineato ai due rimasti.

Il messaggio di rifiuto `QUESTION_TOOL_REFUSAL` resta esattamente lo stesso testo inglese ed è usato solo dall'hook di omp e dagli hook della chat di Cursor. In `src/cli/commands/hook.ts` si rimuove `questionToolDenial` (lo usavano solo `runCopilotHook` e il comando `claudeQuestionTool`, che spariscono con i comandi `trama hook copilot` e `trama hook claude-question-tool`); in `test/question-channel.test.ts` si toglie il suo import e il test «Claude Code's question-tool hook answers with the shared refusal...», tenendo quello che fissa il testo del rifiuto.

In `scripts/harness-questions.ts` il round di prova usa come etichetta dell'agente un agente supportato (`omp` o `cursor`) al posto di `claude`; lo stesso vale per eventuali etichette `claude` in `test/question-overlay.test.tsx`.
