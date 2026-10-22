---
column: done
technical: true
refs:
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: jez36zj7
agent: false
created: 2026-10-22T05:44:23.475Z
finished: 2026-10-22T05:45:34.201Z
---
# Domande che si capiscono da sole

Il developer, in un round di domande, vede solo la domanda, il suo contesto, le opzioni e le proprie risposte, mai il resto della conversazione dell'agente. Quando il Task è finito, i testi che guidano l'agente nello scrivere un round lo dicono esplicitamente.

- L'aiuto di `trama question new` (`--help`) dice, nella descrizione del comando e nelle descrizioni dei campi `question` e `context`, che il developer vede solo il round e non la conversazione dell'agente, quindi ogni domanda, con il suo contesto e le sue opzioni, deve capirsi da sola, e che i testi non usano la prima persona (si scrive «Trama» o «l'agente», mai «I», «we», «io», «noi»). Lo schema è in `src/cli/commands/question.ts` (descrizioni `.describe(...)` dei campi `question` e `context` e descrizione del comando).
- `context` resta facoltativo: si omette quando domanda e opzioni bastano da sole. Lo schema non cambia.
- La sezione «Asking» delle skill `trama-design`, `trama-import` e `trama-resolve-drifts` (`skills/trama-design/SKILL.md`, `skills/trama-import/SKILL.md`, `skills/trama-resolve-drifts/SKILL.md`) dice la stessa cosa con le stesse parole: `question` breve, una frase che si legge da sola; sfondo della decisione in `context`; il developer non vede la conversazione, quindi ogni domanda è autoconclusiva e scritta senza prima persona. `trama-setup`, `trama-scan` e `trama-implement` non cambiano: seguono la sezione tramite il loro rimando a «Asking» di `trama-design`.
- Se `docs/cli.md` ripete le descrizioni dei campi di `trama question new` (sezione `#### trama question new`), le allinea allo stesso testo.

Non rientra in questo Task la regola della prima persona nelle sezioni `## Language` delle skill.
