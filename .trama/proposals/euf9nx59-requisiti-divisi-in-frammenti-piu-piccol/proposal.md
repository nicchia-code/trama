---
status: approved
base:
  project-setup/feature.md: 6d1bd68aa10d6b753948124e658eb62fe320cd72a8d764abc0378a37a5849859
  project-setup/project.md: 46b9d0e519146906d439d5b780bc6df975c028ecc101c841e4c973c443bd1b93
  editor-panel/panel.md: 7fb6b1558732eb70705781c2bdfa97ded8308d20874274cf53c0947a3aea3d6a
  requirements/data.md: e36ebca85e6526314913710f579f0aabb3c9666d1b70435780723538bb558c93
  requirements/rules.md: 70f58153f42a5b9e39c81214d1f516ce880985e0d3dc94e5861643077570dd83
  requirements/tech.md: 77ce082e68ae5b9c8829126703f3c4949eae70a08b3884e3b84e421987d6decd
  requirements/ui.md: 7cd1cd32031b63c299304c6037770f6098cb8dbe76c7c3b2ec8c6f23a27ba9dd
delete: []
request: 2026-10-05T13-39-52
created: 2026-10-05T12:37:19.571Z
---
# Requisiti divisi in frammenti più piccoli

Le Aree dei Requisiti sono un file ciascuna e diventano grandi (rules.md 44 KB, tech.md 33 KB, ui.md 26 KB): due branch che toccano la stessa Area entrano in conflitto al merge e ogni Proposal sulla stessa Area diventa stale. Le Aree si dividono in frammenti piccoli, scelti per progetto, ognuno con la sua skill.

Analisi: l'elenco delle skill che l'agente riceve all'avvio ha un budget minimo di circa 8.000 caratteri (Claude Code: 1% della finestra di contesto, ≈ 8.000 con 200k token; Codex: 2% della finestra, ripiego 8.000 caratteri). Le skill di Trama ne usano ≈ 1.700, una skill di Requisiti 150–210: circa 30 frammenti se Trama prende tutto l'elenco, 12–15 se ne lascia metà alle altre skill del developer.

Decisioni:
- Un frammento è un file e una skill: `requirements/<area>/<frammento>.md`, skill `trama-req-<area>-<frammento>`, `description` obbligatoria, un H1, solo sezioni `##`.
- L'Area resta, come cartella: `area.md` (nome riservato) tiene titolo, descrizione e introduzione; General è una sezione come le altre in un solo frammento.
- Ogni sezione sta in un solo frammento della sua Area, così i riferimenti `requirements/<area>#<sezione>` restano validi.
- Budget fisso di 4.000 caratteri (nomi + descrizioni delle skill di frammento). Oltre, tutte le Aree passano insieme a skill indice `trama-req-<area>` con introduzione, General per intero ed elenco dei frammenti, che diventano file nella cartella della skill.
- Il passaggio (in un senso o nell'altro) è riportato nel resoconto della rigenerazione e da `trama validate`, che avvisa senza bloccare.
- Un frammento oltre 12 KB produce un avviso non bloccante in `trama validate` e `trama analyze`.
- La divisione la sceglie l'agente: se una Proposal scrive in un frammento che è o diventa troppo grande, lo divide in quella stessa Proposal prima di consegnarla.
- Migrazione: `trama update-skills` sposta ogni `requirements/<area>.md` in `requirements/<area>/area.md` più un unico frammento `main.md`; l'agente lo divide poi come sopra.
- La scheda Requirements mostra Area › frammento (con descrizione) › sezioni.
- Per la scansione dopo l'approvazione conta solo il testo delle sezioni (e descrizione/introduzione dell'Area): spostare sezioni fra frammenti o cambiare la descrizione di un frammento non fa scansionare nulla.

Scelte mie, da verificare:
- L'inizializzazione crea per ogni Area di partenza solo `area.md`, senza frammenti; il primo frammento lo scrive l'agente.
- Un file `requirements/<area>.md` rimasto al primo livello è un errore che dice di lanciare `trama update-skills`; la migrazione salta, dicendolo, un'Area che ha già sia il file sia la cartella.
- La descrizione di `main.md` creata dalla migrazione è quella dell'Area; il suo titolo è quello dell'Area.
- Quando Trama nomina una skill di Requisiti (per esempio in `trama requirements` o in un rimando a un'Area intera), nomina quella che esiste nella modalità corrente.
- Il budget conta solo i frammenti con almeno una sezione non vuota; la soglia di 12 KB è sui byte del file, front matter compreso.
- Nella scheda Requirements: frammenti in ordine di nome file, General per prima nel suo frammento, riga `No fragments.` per un'Area vuota, etichette `new fragment` / `fragment removed` come per le Aree, e una sezione spostata mostrata solo nel frammento di arrivo con `moved from <frammento>`.
- Nella modalità indice, General è riportata nell'indice e non ripetuta nel file del suo frammento.
