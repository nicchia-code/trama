---
status: approved
requires:
  - fvmbg0r7
base:
  system.md: 6d2c8bb39e2282fab9a89779085694703ecf4d40ba8a25cf98bf3312a9ac6e96
  team/feature.md: 683c68354b699c2149530d741dc61d088609c0e5768fd9daf00bbe50fb4fee03
  team/issue.md: new
  team/github-project.md: new
  model-changes/feature.md: 1ec047445bcbda6c70816a6677aeb6351edc0feab44eb19d371882be703e8b97
  model-changes/proposal.md: 4c216b09e19329e906120bd7c9529a4a6f1cbad73c1e134c0baaae9bcd5eb17c
  agent-launching/design-request.md: 39a5982bf4b176f8a6831a137d9c062ff1b9c9a6b54c9105d862ad8b98a30d90
  editor-panel/panel.md: af07d087388d18cd19283160cbb5b47302a60bbc9f06a0899cf2bd639cf01e43
  editor-panel/menu-laterale.md: 3144e2c7d99974666722b9b833f760d6ad43670e705b9f4dd7e308a31ab27479
  actors/developer.md: 0588040652031fe3f0b1af9a2f854b81b879f02bd9c562f7291d3e66c4df54f7
  actors/agent.md: 17d391e816ebce119bf41a228a55d54136f639cf5634079dfe129f7c6b6b51d7
  requirements/ui/handoff.md: new
  requirements/data/handoff.md: new
  requirements/rules/handoff.md: new
  requirements/tech/handoff.md: new
  requirements/cli/handoff.md: new
  requirements/quality/handoff.md: new
  requirements/tech/general.md: 227f1c0c6db9b3961b44c20fcf449ef6c2fdee000d4184386a846bbbee7c97e8
  requirements/quality/agents.md: b989a2f8b8b701adb5c9add50aaaff43c7e537199f1798ab0c1d0c6c3927a191
  requirements/ui/team.md: bda82739aab5a37f4d65524be86bdfb641307e46ed1d6b977eb1e62b2ca1fce1
  requirements/tech/team.md: 1a284c2ea27ad70e6753858fd236def0da4452948f2e8f7b199c52976d73f355
  requirements/ui/menu-laterale.md: dbfc7bbdaf4ff4293fe4803f55fe6b72cd49f054ada00e5c7de3b835e095305d
  specs.yaml: 88348ab179b91929ba92a88ddfd14a5c70437bb08b23033fa3b07bceef9f6c98
  requirements/data/work.md: 9d7254538fb9c7cfcacb2621db71e117436e86c6f59ccdee4b937e62845206ad
  requirements/rules/agent-terminal.md: be506ded0a8530bd3552e7931214d2b1c58e9c518f256341f3a58081f0922098
  requirements/rules/models.md: 129ff0f149e2c78ff8ce7188cc72c16bf09fb842046f8c3ebb21917495e0bc1a
  requirements/rules/project.md: 1af16e80aedc0f36697f7dd21a04ce2361268fb48a53b395b062d21fe6044add
  requirements/data/proposals.md: 90d4d1855c504f2f983da4480587fbdd04fae2cd1f0e725201aba5ff1a09cd0b
  requirements/cli/main.md: 7dd654e355e709b13b229d8578d477fefd5dc339e6b8b77671f9a5b754bd7a9e
  requirements/ui/agents.md: 57714e2536de9d8eb74b32058042209685a8073357b86238d82120f7c4e5f437
delete: []
created: 2026-10-25T14:31:40.694Z
label: Team
---
# Handoff verso GitHub

Seconda parte di Team: il Manager scrive una richiesta, l'agente ne fa una handoff, una Proposal leggera che porta issue GitHub per le persone del team invece dei Task per l'agente; il Manager la vede in anteprima, cambia i campi proposti e la approva nella vista Team; l'agente pubblica le issue su GitHub e sul GitHub Project collegato.

Decisioni:
- Nuovo tipo di Proposal `handoff`, con meno controlli: la copertura dello scope e le stime oltre 3 giorni sono solo avvisi. Restano i controlli comuni: Modello valido, file registrati, obsolescenza.
- Una handoff può cambiare Modello e Requisiti insieme alle issue, oppure portare solo issue.
- Le handoff si decidono solo nella vista Team: la Board resta il lavoro dell'agente e non le mostra né le conta. La voce Team del menu conta le handoff in attesa.
- Anteprima di ogni issue come su GitHub; il Manager cambia direttamente assegnatario, reviewer, stima, sprint e campi del Project (con Undo); il testo si cambia con Rework with feedback.
- Un'issue stimata più di 3 giorni mostra un avviso con `Split`, che fa dividere quell'issue all'agente.
- Dopo l'approvazione le issue le pubblica l'agente con `gh`; Trama legge GitHub da sé solo in lettura.
- Le issue bastano a se stesse, sono nella lingua di `trama.language`, non hanno immagini e si adattano al livello dell'assegnatario. Tranne in Solo mode chiudono con un blocco richiudibile di riferimenti al Modello per chi usa Trama.
- Sprint di una settimana dal campo `Iteration` del Project; stima in giorni; un'issue di norma al massimo 3 giorni.
- La nuova handoff parte da un pulsante nella vista Team. L'aspetto segue il mockup `Trama · Team view.html`.

Scelte dell'agente, da verificare:
- Il Project collegato e la cache delle letture stanno in file e chiavi locali alla copia di lavoro, mai committati.
- Il reviewer è scritto nel corpo dell'issue, perché le issue GitHub non hanno reviewer, e nel campo del Project se esiste.
- L'etichetta dell'epica è `epic: <label>` e l'agente la crea se manca nel repository.
- Trama legge GitHub all'apertura della vista Team e con Refresh, mai a tempo; il login di `gh` chiede l'accesso ai Project (`--scopes project`).
- La frase del Sistema su cosa Trama manda fuori dalla macchina ora comprende le letture `gh`.
- Una handoff obsoleta non si raffina da sola: si rielabora.
- Le issue non ancora pubblicate sono nominate per titolo nelle dipendenze; quelle che dipendono da un'issue rifiutata non si pubblicano.
