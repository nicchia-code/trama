---
status: approved
base:
  requirements/rules/run-paralleli.md: dd7a85ab7a7ca6612ee8630c92ce5a3b57adb5c9dc1fdf1f30f8738a86e7b846
  requirements/ui/run-estimate.md: e79bc75dc583150496522c605a5d7fe0bcb788c32f3f14f9338b9efe602ffdbc
  requirements/tech/run-estimate.md: 53028741ef54b5deb1161a6e4122d447f0f2d24e86dcdfed88280eeee096c15f
delete: []
request: 2026-10-24T21-11-00
created: 2026-10-24T19:17:10.434Z
label: Run all bar
---
# Barra di Run all

Durante un `Run all` il pulsante mostra oggi la forchetta della stima come numeri (`~15–35 min left`). La richiesta chiede di mostrare la stessa stima come una barra di caricamento dentro il pulsante: stesso principio, cambia solo la visualizzazione.

Decisioni:
- Il riempimento si basa sulla stima centrale: parte fatta = tempo passato dal lancio / (tempo passato + stima centrale rifatta).
- Il testo del pulsante durante il Run all è `Running…`, senza numeri.
- L'icona `Clock` resta a sinistra del testo.
- Finché la stima è in calcolo la barra è indeterminata (una striscia che scorre), ferma con la riduzione del movimento attiva.
- Quando il Run all è più lungo del previsto la barra si ferma al 95% e il testo diventa `Taking longer than expected`; la barra non supera mai il 95% prima della fine vera.
- La barra non torna mai indietro: resta dov'era finché il tempo non la raggiunge.
- La forchetta resta come prima riga del tooltip.
- Il nome accessibile dice percentuale e forchetta, per esempio `Run all, 40 percent done, about 15 to 35 minutes left`.
- La barra avanza al ritmo della stima (una volta al minuto e a ogni registrazione dei tempi), con una transizione morbida di qualche secondo.

Assunzioni:
- Anche in calcolo il testo è `Running…`; il tooltip e il nome accessibile dicono che la stima è in calcolo, come oggi.
- Oltre la stima il nome accessibile è `Run all, <p> percent done, taking longer than expected`.
- La barra è solo disegno: il pulsante resta l'unico elemento per le tecnologie assistive, senza un `progressbar` a parte, così nulla si annuncia due volte.
- Il colore della barra è il primario del tema del pannello, trasparente quanto basta per leggere il testo sopra.
