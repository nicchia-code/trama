---
status: approved
base:
  work/task.md: e1cb8cd455bc7182e50578f634f838443c33ea399e25104ba09fabddf23cba1f
  work/drift.md: b19708f220a81c0eb81259f01130924f03bcaecec321f6142c4ab80741c5acc7
  model-changes/proposal.md: 703010734e67b2a60c714e22c0f6d797ff00add4840a175557a4e094c0cb2f52
  work/feature.md: 6e7c86668246cbc0e8b78d0aa6d6d9bb5eb28976aace4666e00427a1a12d6ddd
  model-changes/feature.md: e18daab4ac75987d2afe2d9377016ce5c25e6fd35e4b6a16a3ba9efb2cdaf760
  requirements/data.md: 3d3c930f49d298705e835b639297172c140bc8277b0f9ac0f770af0dcd51a922
  requirements/rules.md: 448c1130bb363529e861611eb3975e6d657f3655db950225f67af3e771690e35
  requirements/ui.md: 1e0a9cbf4164e3fb8f2e4f46201eed6ebeed7d864c2198d9947877930f24e459
  requirements/tech.md: 26b038dd028ffde293d3fb3f73c69b3864f1b78c0e122443f526c05042fbcaac
delete: []
request: 2026-10-05T11-51-45
created: 2026-10-05T09:59:17.172Z
---
# Numero breve temporaneo per Proposal, Task e Drift

Perché: gli id di otto caratteri casuali (per esempio `dx9jcb0d`) vanno bene a lungo termine, ma a breve (leggere la Board, verificare, capire cosa succede, citare una scheda in una conversazione) un elenco di simboli è molto più difficile da seguire di un numero. Si aggiunge un numero breve temporaneo accanto all'identità permanente alfanumerica, che resta com'è.

Decisioni dell'intervista:
- Ambito: Proposal, Task e Drift (non solo i Task).
- Assegnazione: numero locale a ogni copia di lavoro, in un file non versionato; il più basso libero, stabile finché la scheda è viva, liberato alla chiusura. Due copie possono dare numeri diversi alla stessa scheda.
- Rilascio: Proposal quando è approvata, rifiutata o scartata; Drift quando è risolto; Task quando va in Done (se torna indietro, ne prende uno nuovo).
- Forma: prefisso del tipo, `P3`, `T3`, `D3`.
- Uso: il numero si vede ovunque al posto dell'id permanente (che si mostra solo per le schede senza numero); ogni comando lo accetta come argomento, anche quelli di decisione del developer, e accetta ancora l'id permanente.
- Agente: nei messaggi al developer cita «T3 – titolo»; nei file e nei comandi che scrive usa sempre l'id permanente.

Assunzioni (da verificare):
- Anche una Proposal in Draft prende il numero alla nascita, così l'agente può nominarla.
- Le schede ancora numerate `NNNN-<slug>` hanno un'identità permanente invece di un numero breve già assegnato: prendono un numero breve temporaneo come le altre; i loro `NNNN` restano accettati come id permanente nei comandi, e non si confondono con `T3` perché il prefisso lo distingue.
- Le schede arrivate da un altro branch o da un worktree prendono il numero alla prima lettura della copia, in ordine di `created`.
- L'istruzione inviata all'agente (`Use the trama-implement skill on Task <id>.`) e ogni campo dei file usano l'id permanente.
