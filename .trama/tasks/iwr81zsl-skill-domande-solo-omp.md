---
column: done
technical: true
refs:
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:09:43.760Z
---
# Skill delle domande solo omp

Le skill distribuite parlano di domande solo per omp.

Quando è fatto:
- `skills/trama-design/SKILL.md`, `skills/trama-import/SKILL.md` e `skills/trama-resolve-drifts/SKILL.md` (sezione delle domande, righe ~88-93, ~105-110, ~93-98):
  - non nominano più `AwaitShell` né lo spostamento in background di Cursor: dicono di lanciare `trama question new` con `timeout: 0` nello strumento bash di omp, mai un valore fisso, e di aspettarne la fine, senza timer o attese fisse, `sleep`, letture periodiche dell'output, controlli a intervalli, turni chiusi per farsi risvegliare, e senza considerare fallito o ripetere `trama question new`;
  - non hanno più la frase su `CURSOR_SANDBOX`: con `status: "unavailable"` l'agente non chiede in nessun altro modo, ferma il lavoro che aspettava quelle decisioni senza aprire né consegnare Proposal, dice al developer di aprire il progetto nell'editor con Trama e, quando gli dice di continuare, rilancia lo stesso `trama question new`;
  - vietano per nome solo lo strumento di domande di omp (`ask`) e il round scritto nella conversazione; `AskQuestion` sparisce e nessuno strumento di domande di altri agenti, Cursor compreso, è nominato.
- `skills/trama-scan/SKILL.md` e `skills/trama-implement/SKILL.md` rimandano per le domande alla sezione «Asking» di `trama-design` e le regole sull'attesa valgono anche per loro senza più «in Cursor e in omp».
- Il messaggio di rifiuto dello strumento di domande resta lo stesso testo inglese ed è usato solo dall'hook di omp (`QUESTION_TOOL_REFUSAL` in `src/core/questions.ts`, `extension/src/omp/trama-hook.ts`).
- Test sui testi delle skill (se controllano `AwaitShell`, `CURSOR_SANDBOX`, `AskQuestion` o «in Cursor») aggiornati al nuovo testo.
