---
status: approved
base:
  agent-launching/agent-terminal.md: 79239ae81798a10873213f53bb3617586996e1964832efa43641b9c7a10512e2
  requirements/tech/agent-terminal.md: 7124c9e1911f99835213f055967a9dadddc7ba2e0cadab5da67df9357ec3775f
  requirements/quality/agents.md: dbc22214ed589eecac5f6e8512b3d89c32efe53f9b72810f23f5dd98d2032230
delete: []
request: 2026-10-21T12-26-15
created: 2026-10-21T10:32:02.689Z
label: Avvio di omp
---
# Comando dopo la shell pronta

Run all ha lasciato il comando di omp scritto al prompt di zsh invece di eseguirlo. Causa: Trama apre il terminale e scrive subito la riga, prima che la shell sia pronta; in quel momento il terminale è in modalità canonica e su macOS una riga ne tiene al massimo 1024 byte (su Linux 4096), quindi il resto e l'Invio si perdono. L'istruzione di Run all con Advisor Scanner, esecuzione parallela, Drift blocker e Async Drift Resolver accesi supera i 1024 byte. Riprodotto con zsh in uno pty: 981 byte scritti prima del prompt partono, 1071 no; dopo il prompt partono anche 6000 byte.

Decisioni:
- Trama scrive il comando solo quando la shell del terminale è pronta, cioè quando la sua shell integration si attiva.
- Lo scrive con `terminal.shellIntegration.executeCommand(riga)`.
- Se la shell integration non si attiva entro 10 secondi, scrive comunque il comando con `sendText`.
- Il lavoro (annuncio, Run, pulsanti indisponibili) comincia all'apertura del terminale, come oggi subito dopo il clic; se il terminale si chiude prima che il comando sia scritto, il lavoro finisce come per un terminale chiuso.
- Un test dell'host con il terminale finto protegge dal ritorno del guasto.
