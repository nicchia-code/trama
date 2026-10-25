---
column: done
technical: true
refs:
  - requirements/cli#team
drift: null
proposal: fvmbg0r7
agent: false
created: 2026-10-25T15:11:50.543Z
finished: 2026-10-25T16:18:41.521Z
---
# Comando trama team show

L'agente legge le persone del team del progetto, che vivono solo nell'editor del Manager, con `trama team show`. Quando il Task è finito:

- `trama team show` (in `src/cli/commands/team.ts`) stampa i membri del team del progetto, ordinati per nome, con nome, `@handle`, livello, skill, capacità per sprint in giorni e le assenze che finiscono oggi o dopo, in Markdown; con `--json` una lista di `{ name, handle, level, skills, capacity, absences: { from, to }[] }`. Non ha input e non scrive nulla.
- Chiede i dati alla finestra dell'editor che ha lanciato l'agente, con lo stesso client, endpoint e segreto di `trama question new` (`TRAMA_QUESTION_ENDPOINT` e `TRAMA_TERMINAL` riconosciuto), con una richiesta di tipo `team` che porta il segreto e la radice del progetto. Senza endpoint o terminale: `trama team show needs the editor: only an agent started by Trama can read the team.` ed exit code 1; senza risposta entro 10 secondi: `The editor did not answer: open the project in the editor with Trama.` ed exit code 1.
- L'host risponde alla richiesta `team` solo dopo aver controllato il segreto e solo per un terminale o una conversazione di quella finestra, con i membri del team del progetto nominato letti da `extension/src/host/team/people.ts`. Con Team non disponibile risponde con `Manager Mode is off in this working copy.` o `Manager Mode needs a repository on GitHub (the origin remote).`, che il comando stampa con exit code 1. Un team vuoto stampa `No one in this project's team.` (`--json`: `[]`) con exit code 0.
- Non è un comando riservato al developer. `trama team show --help` segue `cli#General`; `docs/cli.md` lo descrive.
