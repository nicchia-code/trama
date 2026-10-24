---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: ft7jlc46
agent: false
created: 2026-10-24T18:53:13.004Z
finished: 2026-10-24T18:55:09.320Z
---
# Sezioni Language delle skill

Le sezioni `## Language` delle skill `trama-design`, `trama-setup`, `trama-scan`, `trama-compare`, `trama-implement`, `trama-import` e `trama-resolve-drifts` (in `skills/`), e una sezione `## Language` nuova nei testi fissi `extension/media/ask-more.md`, `general.md` e `unify-drifts.md`, portano tutte lo stesso elenco, valido quando l'istruzione chiede una lingua.

Nella lingua dell'istruzione: titolo e corpo dei Task e titoli dei gruppi di Task; titolo, corpo e Fix options dei Drift; titolo, introduzione e motivazione delle Proposal; testo, contesto e opzioni delle domande, anche la domanda di risoluzione preparata dall'Async Drift Resolver; note dei ghost e titoli degli annunci; titolo, riassunto e testo delle voci della History; le risposte dell'agente durante il lavoro e il resoconto finale; le risposte in General.

Sempre in inglese: tutto il Model (nome del System, nomi di Feature, Machine, Actor e State, ID ed Event, descrizioni nei file del Model); i Requirements (Area, titoli e corpo dei frammenti); le Specs, anche `notes`; codice e commenti, messaggi di commit, documentazione del progetto; le intestazioni che Trama legge ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), i marcatori `(initial)` e `(final)` e i campi del front matter; i termini tecnici e quelli di Trama; l'interfaccia di Trama.

- Nessuna sezione dice più di scrivere nella lingua nomi, ID o Event del Model, né di traslitterarli (`città` → `citta`, `PAGAMENTO_RIUSCITO` spariscono).
- In `ask-more.md` l'agente risponde nella lingua in cui scrive lo sviluppatore e usa la lingua scelta solo per i testi che scrive per Trama; in `general.md` risponde nella lingua scelta.
- Restano le regole già presenti: una lingua non cambia nulla di già scritto (si scrive in lingua solo il testo nuovo o riscritto, mai una traduzione del file intero), niente prima persona, Task che si capiscono senza la conversazione.
- Il prompt del sotto-agente `trama-implementer` in `src/core/sub-agents.ts` ne porta un riassunto: Task, Drift, domande e note nella lingua dell'istruzione; Model, Requirements, Specs, codice e commit in inglese.
- Le copie installate in `.agents/skills/` si aggiornano come sempre con l'aggiornamento delle skill.
