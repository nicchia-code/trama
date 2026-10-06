---
status: approved
base:
  agent-launching/agent-terminal.md: f284a7e637faada1d230e0e1dd7ff54479e1b0c3bf4db7975b43ddc1e17b4794
  agent-questions/question-round.md: a3191a99df0d1da3a1585762fab6f2ac33585f188632c929e09daf0a2a5ee905
  actors/time.md: 02bca7ae404fc529f3be590c9ba6d522d0bdafb38c0ac763fac1fe4b479cce99
  requirements/data/agents.md: 366716bde4b55d6adb57fd21834262925c66089d74f95e3b9d7f9682b1ad9175
  requirements/quality/main.md: 3609f0319f9831d5cb519a0f3794b2c72ff1e281af8f6bf511d20b22de828564
  requirements/rules/questions-notices.md: 12039ab63b14c83c77559f6fedb94e59853158f189bf98a3c89e28db7d2ed1df
  requirements/tech/questions-notices.md: ef8a42e006255cb42ebc1606ebf989693f61fcc3489259ead742c85c1df3dcee
  requirements/ui/questions-notices.md: b50402c9b6416a7fbd1e6ef0f39c78c7315d759af962e77822710c653a04d955
  requirements/tech/general.md: 726f868dc86cb4469cd2ffe44d01485aa982d63f95ceef080c705dde30c8109e
  requirements/tech/agent-terminal.md: e7e71d6309eab38eedadff18ffa734f3c5a99d03519ce81085a50f94c9e93987
  requirements/rules/agent-terminal.md: 665c8697beecb3ec28fd3d96d7a7d49d4b3e9c0bd0b3a6b1cab097728d542f6d
  away-notifications/notice.md: 9ce241477db6c57ae8348b5c411377854ee0efa8f2e433ac361a734a9220bc3a
  away-notifications/feature.md: 854a094b7d67fa0526a282bea251d4ae1a73114e915a01164992b1798954c37c
  actors/ntfy.md: 2c342bb9c8c0dc6144a9ba58967360d1fa677d7a3587f25ec67bfb39ff10b04c
delete:
  - away-notifications/notice.md
  - away-notifications/feature.md
  - actors/ntfy.md
created: 2026-10-06T20:05:34.269Z
scanScope:
  - ref: time
    reason: removed, its container
  - ref: agent-terminal
    reason: changed
  - ref: agent-terminal/Agent running/terminal.COMMAND_ENDED
    reason: changed
  - ref: question-round.ROUND_CLOSED
    reason: changed
  - ref: question-round/Queued/question-round.ROUND_CLOSED
    reason: leads into a change
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/tech#cursor-chat
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#question-round
    reason: changed
  - ref: requirements/data
    reason: removed, its container
  - ref: requirements/quality
    reason: removed, its container
  - ref: requirements/rules
    reason: removed, its container
  - ref: requirements/tech
    reason: removed, its container
  - ref: requirements/ui
    reason: removed, its container
---
# Rimuovere ntfy e le notifiche esterne

Trama non gestisce notifiche esterne e non integra servizi di notifica.

- Rimuovere integralmente ntfy, la Feature `away-notifications`, la Machine `notice`, il relativo Actor, le impostazioni, gli invii, i timer e i tentativi.
- Eliminare i collegamenti delle notifiche ai terminali, alla chat di Cursor e ai round di domande, mantenendo i comportamenti utili indipendenti.
- Conservare gli avvisi locali dell’editor e della Board, le segnalazioni di errore e i messaggi necessari alle decisioni, come scelto nel round di domande.
- Trama non effettua chiamate di rete né telemetria; resta il trasporto locale tra CLI ed editor.
- Nessun servizio sostitutivo, nessuna compatibilità per l’impostazione rimossa e nessuna modifica automatica alle impostazioni utente.
