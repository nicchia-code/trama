---
status: approved
base:
  requirements/tech/general.md: 86a141f34f4c0545496b6a33b88859f7b98c526fe0b46a73b94526abd3792384
delete: []
created: 2026-10-07T16:08:44.850Z
scanScope:
  - ref: requirements/tech#General
    reason: changed
---
# Allow the optional System 1 classifier in the General technical Requirements

La sezione General dei Requisiti tecnici vieta ancora qualunque chiamata a un modello linguistico e qualunque chiamata di rete, mentre il Modello del System e la sezione agent-launching prevedono il classificatore System 1 facoltativo (Jev di TypeSafe), chiamato dall'host dell'estensione. Il codice non può rispettare entrambe le cose.

Scelte fatte senza intervista, da verificare:
- Si riscrivono solo le due righe di tech#General che si contraddicono: quella sul modello linguistico e quella sulle chiamate di rete.
- L'eccezione ripete le parole del Modello del System: classificatore System 1 facoltativo, acceso dal developer, chiamato solo su richiesta dell'agente durante una scansione, con ciò che l'agente gli passa, e che risponde solo conflitto o non conflitto.
- Il divieto di telemetria e di servizi di notifica resta com'è.
- Il codice non cambia.
