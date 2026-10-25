---
status: approved
requires:
  - qf161zkz
base:
  team/feature.md: f495b908c22054f69cfe42e3d1a6cf729226a4594042d0fd4d1bd6e3e8f708f6
  team/issue.md: f969ce2afa87f67f73dbe0078e81b0ad6545a2fbc86b6d2aed1c311c4ed64ee4
  actors/github.md: new
  actors/developer.md: 04cc41e5d1e6957f15d594478d10d1e7b9b0dc7227241d9cc61256eb866a77d8
  actors/agent.md: 770ad5a5258d1e975520b5e44badfc6c039b67d640e249258657ae5c2abc7e27
  editor-panel/panel.md: 00a0284f113978ea36ef80a7a812bc8852365e8b85fdd52e0aaccce712f2f869
  editor-panel/menu-laterale.md: adbf23d63b8bc96bc4815c241b1a4bcfd06ba43608a0fff656e73e4b3b80d754
  solo-mode/feature.md: 13e6d4079fd35e743883cf50b9c0613096c5aeec27f850fbf36230b71caa5777
  requirements/ui/timeline.md: new
  requirements/rules/timeline.md: new
  requirements/tech/timeline.md: new
  requirements/data/handoff.md: 068eb6f34c75ed867cf4576f1d35472f8ab0b6c18ff68a95c29b5ffc015a4641
  requirements/cli/handoff.md: 940a989c9e9001bef8ca6cc674c910dc125586c4494715f1d6425898080e51e6
  requirements/ui/handoff.md: 7822fbcfc4ec053fe1aa87fbdd83fd165bf98c81dde6eb5fe33405be7142c19b
  requirements/ui/team.md: 367047f300a24e0baf93aea72010e114bbd5d50ade93646fa261bb03311fd9c9
  requirements/ui/panel.md: 9da6e043568eeede7597aab62a769823a3d4e43695a841caac1db59aaeca0e68
  requirements/rules/scans.md: c6c24dd581fa8f7ae8c743116dbc786082b9b4d4d21938bbb55b08b65a480dc5
  requirements/tech/menu-laterale.md: 5fb205577c6090775b38dfb55f83a32479f52ac5b70ab1c5777386d669e563b1
delete: []
created: 2026-10-25T14:43:53.912Z
label: Team
---
# Timeline degli sprint

Terza parte di Team: dopo la pubblicazione Trama segue le issue su GitHub, segnala dove il piano non regge e dà al Manager una roadmap nel tempo sugli sprint settimanali, separata dalla Board.

Decisioni:
- Sprint di una settimana dal campo `Iteration` del GitHub Project; stime in giorni.
- Timeline per persona e per epica, con carico e capacità per sprint e assenze. La vista è a sola lettura: la ripianificazione si fa a mano su GitHub.
- Segnali: issue superata dal Modello, carry-over, dipendenza non rispettata, sovraccarico. Nessuna correzione automatica.
- Issue superata dal Modello: un pulsante fa scrivere all'agente un commento di aggiornamento; il corpo resta com'era.
- Issue chiusa: un pulsante `Scan` fa confrontare all'agente solo i riferimenti dell'issue. Un Drift sul lavoro di un'issue pende verso correggere il codice, anche nel Merge di Solo mode.
- Trama rilegge GitHub all'apertura della vista Team e con Refresh, mai a tempo.
- L'aspetto segue il mockup `Trama · Team view.html`.

Scelte dell'agente, da verificare:
- Stato dell'issue ricavato da GitHub: `In review` con una pull request aperta non in bozza che la chiude; `In progress` con una bozza, un branch collegato o lo stato `In progress`/`Doing` del Project.
- Il carico conta tutti gli item aperti del Project assegnati alla persona, non solo quelli di Trama; un item senza stima vale 0.
- Capacità di uno sprint: capacità settimanale × giorni lavorativi non assenti ÷ 5, arrotondata a 0,5.
- Il segnale `Stale` del mockup qui significa "il Modello è cambiato dopo la pubblicazione", non "nessuna attività".
- Avviso sugli sprint mancanti quando l'ultima iterazione finisce entro tre settimane.
- `Scan System` non è più l'unico lancio di scan: lo Scan di un'issue chiusa confronta solo i suoi riferimenti e non azzera il numero di Scan System.
