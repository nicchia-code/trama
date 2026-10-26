---
status: approved
base:
  model-changes/proposal.md: 06d898ae56c65e907911c264d2747562e96e09c2b597514f4a61fee226c30e51
  team/feature.md: cacb86f44350ddc727b1a2f22df83808550b81cfd2ae51391c619fb4ed964ef9
  team/issue.md: 8f912d5aa8f410c59696bb98b89c66544ff84bab5e77e8fb8b1b9c754197939a
  requirements/rules/handoff.md: d51d20328a8021123a67aa350477bcc2252af4857af544ca27914e3e72c6e491
  requirements/ui/handoff.md: ac5e795667723dd1b45b3b992176a984043093b3f72d9c346e923cfab4f0bb29
  requirements/tech/team.md: 1a284c2ea27ad70e6753858fd236def0da4452948f2e8f7b199c52976d73f355
  requirements/tech/handoff.md: 3076ef872b727ef20e50f7e04f28145e7736cbc3d780e365f1ec643508616e99
  requirements/ui/timeline.md: cd6a650f6f758a940b8dcb6979afcb932b6e48ed76a06c87747eb07285e23d73
  actors/developer.md: d3d467b38fa7a66744909444a4ce31b4e3d4852f140316fa0331b9c0a21b8473
  requirements/rules/issue-publishing.md: new
delete: []
request: 2026-10-26T13-25-43
created: 2026-10-26T12:46:58.269Z
label: Replan
---
# Replan degli handoff

Ogni handoff pianifica sprint e persone da solo, vedendo solo il carico già pubblicato su GitHub: handoff scritti uno dopo l'altro danno un piano che non è detto sia il migliore. Il Manager vuole un pulsante che riorganizzi nel tempo e fra le persone tutte le issue non ancora pubblicate, con la visione d'insieme.

## Decisioni
- Ambito: le issue di tutti gli handoff aperti, insieme; le schede approvate (anche Not published) non cambiano.
- Pianifica l'agente con la skill `trama-handoff`, con la stessa logica della prima proposta (competenze, livello, `git log`, carico, capacità, assenze).
- Campi rivisti: sprint, assegnatario, revisore e stima (la stima si può adattare agli sprint, se serve). Status, priorità e altri campi del Project restano.
- Struttura invariata: nessuna issue nuova, divisa o spostata fra handoff, nessuna dipendenza cambiata; le dipendenze sono vincoli.
- I valori cambiati a mano dal Manager restano e fanno da vincoli.
- Le issue già pubblicate contano solo come carico fisso: Trama non cambia mai GitHub.
- Anche un handoff nuovo conta, nel carico, le issue degli altri handoff aperti.
- La riga del carico nell'anteprima conta anche le altre issue degli handoff aperti; la Timeline resta solo per le issue pubblicate.
- L'agente riscrive i propri valori nelle issue, come Split: ogni handoff toccato torna Draft finché l'agente non lo riconsegna.
- Nessuna domanda al Manager durante il replan.
- Se una issue cambia assegnatario con un livello diverso, il testo viene riscritto per il nuovo livello.
- L'agente aggiunge al corpo di ogni handoff toccato cosa ha spostato e perché.
- Pulsante `Replan` nell'intestazione della scheda Decisions, accanto a `New handoff`, con finestra di conferma che dice quanti handoff torneranno Draft.
- Disponibile con almeno un handoff aperto; disabilitato mentre un agente scrive o finisce un handoff, senza GitHub Project collegato, durante una Run e durante un replan già in corso.
- Gli handoff stale contano nel carico ma non vengono riscritti (vanno rielaborati).
- Avvio come Split: terminale o conversazione `Replan`, ruolo di analisi, ghost `Replanning handoffs` nella barra di stato.

## Assunzioni
- Gli handoff in Draft non entrano nel piano né nel carico.
- Se i vincoli del Manager rendono impossibile un piano senza sovraccarico, l'agente li rispetta comunque e lo scrive nella riga di spiegazione.

## Rifinitura
- Riallineata al Model attuale dopo la Proposal approvata `2t8kup4y` (Issue: parte per l'agente): `team/issue.md` resta com'è ora, senza modifiche di questa Proposal.
- La sezione `issue` spostata in `requirements/rules/issue-publishing.md` porta il nuovo formato del body in due parti (per la persona e per l'agente), non più quello vecchio.
- Assunzione: quando il Replan cambia l'assegnatario con uno di altro livello, l'agente riscrive entrambe le parti del body per il nuovo livello (requisito `developer.REPLAN_HANDOFFS` e Task `elyestyw` aggiornati).
