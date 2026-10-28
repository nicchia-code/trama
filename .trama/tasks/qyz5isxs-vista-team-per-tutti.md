---
column: done
technical: false
refs:
  - editor-panel
  - team
  - panel
  - menu-laterale
  - manager-mode
  - developer.SHOW_TEAM
  - developer.LOG_IN_GITHUB
  - developer.REFRESH_TEAM
  - requirements/rules#manager-mode
  - requirements/tech#menu-laterale
  - requirements/tech#panel
  - requirements/tech#team
  - requirements/ui#menu-laterale
  - requirements/ui#panel/Team
drift: null
proposal: e4joewta
agent: false
created: 2026-10-28T10:21:27.991Z
finished: 2026-10-28T10:31:45.139Z
---
# Vista Team per tutti

La vista Team non dipende più dal Manager mode: c'è in ogni progetto Trama la cui origin è su GitHub, con il Manager mode acceso o spento.

Quando è fatto:
- Il menu laterale mostra la voce `Team` (icona `Users`, dopo `History`) appena origin è su GitHub, con il Manager mode acceso o spento; senza origin su GitHub la voce non c'è. Il numero degli handoff in attesa compare solo con il Manager mode acceso (Team available); con il Manager mode spento la voce non ha badge. `menuState` porta `team: boolean` (origin su GitHub in un progetto Trama) e `manager: boolean` (Team available).
- `Show Team` (voce del menu e comando della palette) apre il pannello sulla vista Team con origin su GitHub, con il Manager mode acceso o spento; senza origin su GitHub fa l'apertura ordinaria, o lascia la vista com'è a pannello aperto. Se origin smette di essere su GitHub mentre il pannello mostra Team, il pannello passa alla Board.
- Con il Manager mode acceso le schede della vista sono, in quest'ordine, `Decisions`, `Issues`, `Pull Requests`, `Timeline` e `People`, e la vista si apre su `Decisions`. Con il Manager mode spento la barra delle schede contiene solo `Pull Requests`, la vista si apre lì e sulla riga del titolo non c'è il pulsante del GitHub Project, solo `Updated …` e `Refresh`.
- Quando il Manager mode si spegne mentre il pannello mostra Team (`manager-mode.TURNED_OFF`), la vista resta su Team, tiene solo `Pull Requests` e la mostra, invece di passare alla Board.
- `Refresh` legge di nuovo lo stato della riga di comando di GitHub, le pull request aperte e, solo con il Manager mode acceso, il GitHub Project collegato con campi e iterazioni.
- Senza Manager mode gli stati di GitHub in cima alla vista non mostrano `GitHub CLI can't read Projects`; `Log in to GitHub` resta disponibile a chiunque, mentre `Give access` (accesso ai Projects) solo con il Manager mode acceso.
- Le descrizioni del Manager mode nella scheda Settings e nel wizard non cambiano: il Manager mode aggiunge le schede del Manager, il GitHub Project e il numero degli handoff.
- I test che fissano "nessuna voce Team senza Manager mode" e il passaggio alla Board allo spegnimento del Manager mode si riscrivono con il comportamento nuovo.
