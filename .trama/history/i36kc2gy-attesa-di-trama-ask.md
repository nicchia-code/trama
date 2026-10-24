---
created: 2026-10-18T09:23:45.014Z
updated: 2026-10-18T09:23:45.014Z
summary: Le skill che lanciano trama ask aspettano la risposta sul comando stesso, anche quando Cursor lo porta in background, senza timer né sleep.
tasks:
  - f1d5lk1t
cleared:
  f1d5lk1t:
    title: Attesa di trama ask
    proposal: v3vw3m0r
    tag: Attese di Cursor
    finished: 2026-10-18T09:13:40.304Z
    refs:
      - question-round
      - requirements/tech#question-round
---
# Attesa di trama ask

Quando Cursor sposta il comando trama ask in background, la skill lo riprende con AwaitShell sul suo identificativo e non smette di aspettare. Se l'attesa scade, la skill riprende sullo stesso comando. Le letture periodiche e i timer sono vietati: l'agente aspetta finché il comando non termina o il developer non risponde. Le skill toccate sono trama-design, trama-import e trama-resolve-drifts.
