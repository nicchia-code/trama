---
column: done
technical: false
refs:
  - proposal
  - model-changes
  - developer.CHANGE_ISSUE_FIELD
  - developer.SPLIT_ISSUE
  - project/Trama project/proposal.APPROVED
  - drift/Open/proposal.APPROVED
  - requirements/data#proposal
  - requirements/data#task
  - requirements/rules#proposal/Draft
  - requirements/rules#developer.CHANGE_ISSUE_FIELD
  - requirements/rules#developer.SPLIT_ISSUE
  - requirements/cli#General
drift: null
proposal: qf161zkz
agent: false
created: 2026-10-25T15:11:57.313Z
finished: 2026-10-25T16:05:49.369Z
---
# Proposal di tipo handoff

La Proposal acquista il tipo `handoff`: la Proposal leggera con cui il Manager dà lavoro alle persone del team. Quando il Task è finito:

- `ProposalKind` ha `handoff` (`src/core/proposals.ts`, schema della CLI): `trama proposal new` con `kind: handoff` è rifiutato senza creare nulla quando Team non è disponibile, con il motivo di `rules#manager-mode`. Una handoff può cambiare Modello e Requisiti come una Proposal ordinaria oppure nessun file; non ha `tasks/` ma `issues/` (formato in `data#issue`, scritto da `trama proposal edit` come i Task, con identità esclusiva unica anche rispetto a Task e card delle issue).
- Consegna (`trama proposal move <id> open`): oltre ai controlli comuni (Modello valido, file registrati) è rifiutata, nominando ogni problema, quando Team non è disponibile, non c'è nessuna issue, un'issue non ha titolo o ha il corpo vuoto, assegnatario o reviewer non sono membri del team (letti dall'editor come `trama team show`; se l'editor non risponde la consegna è rifiutata con il motivo di `cli#team`) o sono la stessa persona, la stima non è un numero da 0.5 a passi di 0.5, un `dependsOn` nomina issue fuori dalla handoff e dalle handoff richieste o forma un ciclo, un riferimento non esiste, l'etichetta manca o supera 30 caratteri, c'è `tasks/`. La copertura dello scope e le stime oltre 3 giorni sono solo avvisi (`Not covered: <ref>`, `Estimated <n> d: more than 3 days per issue`), stampati nella consegna e in `trama proposal show`; nessun controllo di `## Already present`.
- Una handoff è bloccata come ogni Proposal e, solo per l'approvazione, anche senza GitHub Project collegato (`Link a GitHub Project first`) o senza Team disponibile. Non si raffina mai: con Auto-update Stale Proposals acceso una handoff obsoleta resta da rielaborare; non ha il modello scelto.
- Approvazione (`trama proposal move <id> approved` e Approve della vista Team, mai dalla Board): applica i file come ogni Proposal, non crea Task né Task di rimozione, e nello stesso passo scrive le card `.trama/issues/<identità>-<slug>.md` con i valori del Manager già applicati e `state: publishing`, poi chiede la pubblicazione (Task `Issue e pubblicazione`). Se una card non si può creare l'approvazione è rifiutata prima di cambiare file. Rifiuto e Rework with feedback come per una Proposal ordinaria, con la skill `trama-handoff`.
- Modifiche del Manager ai campi (`developer.CHANGE_ISSUE_FIELD`): solo su una handoff aperta, non mentre un agente la scrive; valori ammessi e messaggi di `rules#developer.CHANGE_ISSUE_FIELD`; scritte solo in `manager` del file dell'issue, non riportano a Draft, non rendono obsoleta né bloccata la handoff; un valore uguale a quello dell'agente toglie la chiave (undo). Un agente che rielabora o divide la handoff conserva i valori del Manager delle issue che non riscrive.
- Split (`developer.SPLIT_ISSUE`): disponibile su un'issue stimata più di 3 giorni di una handoff aperta, con i motivi di indisponibilità di `rules#developer.SPLIT_ISSUE` in quell'ordine; lancia l'istruzione «Use the trama-handoff skill to split issue <issue id> of handoff <handoff id> into issues that each fit a sprint, on the same handoff.» nel terminale `Split <numero breve>` con il ruolo dell'analisi; la handoff resta Open finché l'agente non cambia il primo file.
- Board: le Proposal `kind: handoff` non compaiono mai in Backlog, non contano nel numero della Board né nel badge dell'icona; restano fuori dai selettori della Proposal disegnata del Diagramma e della scheda Requirements.
- `trama proposal show` di una handoff stampa `## Issues` e `## Warnings` (con `--json` `issues` e `warnings`) e non `## Tasks`; `## Scope` mostra per ogni voce le issue che la coprono o `not covered (warning)`. `trama proposal new --help` elenca `handoff` fra i `kind`.
- Test `bun:test` per controlli, avvisi, modifiche del Manager e approvazione; `docs/cli.md` aggiornato.
