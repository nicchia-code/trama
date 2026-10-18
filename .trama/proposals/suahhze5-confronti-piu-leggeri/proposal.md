---
status: approved
base:
  work/announcement.md: 4feee73cfcac418546ea3ca2e5a6848896ab668af16a331024c558c8dc68dd93
  actors/agent.md: 84165713eec6d9fca65ba57d9d2d8a2fe5e65d154dc751d42118d450603ba12a
  requirements/rules/announcements.md: 681817fff07489ebac8aeb626b910d5af2d0812217abeb4afa4befda9b052a8d
  requirements/rules/turn-history.md: new
  requirements/tech/announcements.md: fca3a4a038f6dd07f2d4a693dd99afefb91a4fc00fe647c5304cfc51b191b506
  requirements/data/proposals.md: 7a7e9f146ebb67ab4a47ce21bdc50cfda805ae72a6666be48f623b4c8ccbad63
  requirements/tech/drifts.md: 83a9fea174dfc69b78b920b21b2d9c1e980c5ed8b42325727111a198204cedb9
  requirements/tech/proposal.md: 481fa881facf663ca51d7a6e80e146fab3e2284907392f3c5a975dec1bcc9513
  requirements/rules/decisions.md: d24d04f9ff9ba848aad94f5e9d28cbbeaf06a12c5c5917ede8da2aab9705ead1
  requirements/tech/models.md: fb3682db5d8851de86a5ae4638b96fa2168125fb1976906ddf0899b2528052a9
  requirements/rules/project.md: 2748dadf4f929ff3bb1eedd446268bcc8f24381a351462ed339f095af343e94d
  requirements/tech/general.md: 61fdd566d87a1b4a2970a87166e9904b9ed370f628168119310ac8c5598ea2af
  requirements/ui/ghosts.md: 45540adc4dcb2583f07d5acaaddc39594006ca883d8a2d1176ab143fc61547be
  requirements/tech/editor-chat.md: da59fea85adff7a97a8562cd0ebdd548113b307991e423396f02823022c129ff
delete: []
created: 2026-10-18T19:42:57.328Z
label: Confronti leggeri
---
# Confronti più leggeri

Perché: sulle sessioni registrate (progetto Axi: una scansione del System, due Run, 30 confronti di Machine) i sotto-agenti che confrontano una Machine passano il 19-33% del tempo del modello in turni che servono solo a Trama: leggere tutta la skill `trama-scan` (25 KB), la vista `trama machine` (fino a 63 KB, con i Requisiti accompagnati dalle skill da caricare), le General di cinque Aree, `task list` e `drift list`, e per ogni scheda `announce`, `drift list --all --ref`, `drift candidates` e `drift new`. Ogni comando è un turno del modello che rilegge tutto il contesto. Anche la consegna di una Proposal costa tre comandi (`validate`, `show`, `submit`).

Decisioni prese nei round di domande:
- Un comando di briefing (`trama compare brief`) dà in un solo turno tutto ciò che serve a confrontare una Machine: riferimenti, Modello, Requisiti una sola volta e senza skill da caricare, Task e Drift aperti, Drift chiusi sugli stessi riferimenti, avvisi di `analyze`.
- Le sezioni General restano all'agente che guida la scansione: il sotto-agente non le legge e non le confronta.
- Le schede del confronto si archiviano in blocco con un solo comando (`trama compare file`); il confronto ha un solo ghost, "Comparing <Machine>", e le schede arrivano insieme alla fine.
- Se una scheda del blocco non è valida si rifiuta tutto, con gli errori per scheda: niente archiviazione a metà.
- Con il blocco sperimentale dei Drift i candidati arrivano dal briefing, per riferimento; l'agente scrive le sue scelte nel file.
- Le istruzioni del sotto-agente stanno in una skill piccola dedicata, `trama-compare`; la definizione `trama-analysis` dice di usarla.
- `trama task show` resta com'è.
- `trama proposal submit` valida e stampa il riepilogo delle modifiche: le skill non chiamano più `validate --proposal` e `proposal show` prima della consegna.

Scelte mie, da controllare:
- Il briefing e l'archiviazione in blocco valgono per ogni confronto di una Machine: scansione del System o di Feature, pre-flight, scansione di fine corsa, con o senza sotto-agenti. `trama drift new` e `trama task new` restano per le schede singole (realizzazione di un Task, import, design).
- Un confronto senza differenze si chiude con un'archiviazione vuota, che consegna il ghost.
- Un Drift con una Proposal allegata entra nel blocco con l'identità della Draft; l'archiviazione la allega e la consegna nello stesso passo, e un rifiuto della consegna rifiuta tutto il blocco.
- `trama machine` resta com'è per il developer e per il design.
- Se la consegna mostra modifiche che non corrispondono a quanto deciso, l'agente riapre la Proposal con `trama proposal edit` e la riconsegna.
