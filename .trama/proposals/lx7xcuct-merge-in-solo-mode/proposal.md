---
status: approved
requires:
  - 1g19zogu
base:
  solo-mode/feature.md: 14634af46aa2dcdc3ed0f3b2accb1c34012aa834cecb65979b5c302aecfbfeb7
  solo-mode/solo-merge.md: new
  actors/developer.md: fdd81eceeda3a7491e347e76005dba6922a34af2ae73a9094e05336d2cf8e98d
  actors/workspace.md: 1a23e4f75a728011f0afcc770b296106180dad7b2c57fd73caa915fb190ad8db
  editor-panel/menu-laterale.md: df2fab4aa705cc8634433015d387f20147f76898d0c690fc7a74c11115131885
  agent-launching/feature.md: 32bf112862afe2226c06a2d6add328d926dcf4ea388e4c957469bbdf0d6d6857
  work/drift.md: 8c39e3ad5f3f837f256c2142f2ac8fab631761374f803327457aea340bf7fec5
  requirements/ui/solo-merge.md: new
  requirements/ui/menu-laterale.md: fc6081a130afa3254fbc00f44d25ef256cbe890a1e821f4ce7762b90a94bfc79
  requirements/ui/work.md: ef3fdb21233347d77d37ce4aa1f857662616d22b4f6a31fe524d763d3f22fb3d
  requirements/tech/solo-merge.md: new
  requirements/tech/menu-laterale.md: c40645a6dbc337769e5789a4d14d76d30de8d016e2c347cf7b948af009faeb44
  requirements/tech/drifts.md: ef53439a6a3054348eb2162c8c2e6ecdd470f56d79a0baf78e11a3cf2f56bfb7
  requirements/rules/solo-merge.md: new
  requirements/rules/scans.md: bde470b8f80e47134be21e6f24c48fa9d1f5ae787b9ea832a21e4f651610e03b
  requirements/rules/agent-terminal.md: c6d7ebb0c684458cb37dcf926a45b0952a56e03fede6f92d5826a198a93b8d8c
  requirements/rules/drifts.md: 687318f49b9ee5ee252edac6c957ed45d9d5401763f2c3430d007ed8b2b32b0d
  requirements/rules/drift-resolution.md: 3abce8d5cbfaae1d4c795b412598ee099882f157f2cb2ee1c9fb7ca3b8ee369a
  requirements/rules/questions-notices.md: 01de5bfa9de07d56bf8ce2d875d687b49dfd05880934ee9fd7316c34dc515899
  requirements/data/work.md: ff001211a118ec85b7a0cf91a1aa9eb117de0eca2eb234adc79a556ec55c0c6f
  requirements/data/solo-merge.md: new
delete: []
created: 2026-10-25T08:54:53.177Z
label: Solo merge
---
# Merge in Solo mode

Con Solo mode acceso, il menu laterale offre il pulsante primario Merge: porta nel branch corrente il lavoro degli altri e poi fa confrontare all'agente tutto il System con il codice, così ogni differenza che il loro lavoro ha aperto rispetto al Model diventa un Drift. Dipende dalla Proposal di Solo mode.

## Decisioni

- Pulsante primario `Merge` in fondo al menu laterale, accanto a `Scan System`, solo con Solo mode acceso.
- Disattivato, con il motivo scritto sotto (il menu non ha tooltip), quando: ci sono modifiche non committate (i file di Trama non contano); è in corso un merge, rebase o cherry-pick non avviato da Trama; HEAD è staccata; un lavoro dell'agente di questa finestra sta girando.
- Con file di Trama ancora tracciati il pulsante resta attivo e una riga fissa sotto lo ricorda.
- Merge fa `git fetch`; se fallisce si ferma con il motivo.
- Scelta del branch a ogni Merge (QuickPick, upstream per primo), con conferma quando il branch non è l'upstream né il branch remoto con lo stesso nome.
- Già aggiornato: avviso, nessuno scan. Fast-forward: nessun commit di merge, lo scan parte comunque sull'intervallo portato.
- Conflitto: il developer sceglie ogni volta fra editor di merge di VS Code, agente che riconcilia (domande con `trama question new`, lascia i file risolti nell'indice, non committa) e Abort (`git merge --abort`, nessuno scan).
- Il commit del merge lo fa il developer; Trama lo riconosce (MERGE_HEAD sparito e commit che contiene il branch unito) e avvia lo scan. Merge annullato fuori da Trama: nessuno scan.
- Trama ricorda localmente il merge avviato: dopo una chiusura o un ricaricamento della finestra riprende ad aspettare.
- Scan dopo il Merge: intero System, senza conferma, azzera il contatore `· N` come Scan System.
- I Drift il cui codice sta nei file portati dal merge (`merge-base..incoming`) sono segnati come Drift da merge: badge `Merge` sulla scheda e, nella domanda di risoluzione (pronta o di Resolve Drifts), l'opzione «il codice è giusto, si aggiornano Model e Requisiti» c'è sempre ed è la raccomandata. Non è una Fix option: le Fix option non cambiano mai il Model.

## Assunzioni

- Mentre il merge avviato da Trama è aperto, il menu laterale mostra sotto Merge che cosa resta da fare e i pulsanti per andare avanti (editor di merge, agente, nel solo conflitto) e `Abort Merge`; la notifica del conflitto offre le stesse tre scelte.
- La riconciliazione usa una skill nuova, `trama-merge`, installata con le altre.
- Un Drift unificato è da merge quando lo è almeno uno dei Drift che unisce.
- Il segno da merge lo decide l'agente dai file del merge: Trama non legge il codice.

## Raffinamento

- Riallineata al Model attuale: il menu laterale ora porta nell'intestazione della vista il nome del progetto (titolo della vista, `WebviewView.title`); la Proposal mantiene quel testo in `editor-panel/menu-laterale.md`, `requirements/ui/menu-laterale.md` e `requirements/tech/menu-laterale.md` e aggiunge Merge senza toccarlo. Nessuna decisione cambiata; Task invariati.
