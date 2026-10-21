---
created: 2026-10-21T10:39:15.949Z
updated: 2026-10-21T10:39:15.949Z
summary: Il comando di omp si scrive nel terminale solo quando la shell integration è attiva (executeCommand), o dopo 10 secondi con sendText, così parte intero qualunque sia la lunghezza dell'istruzione.
tasks:
  - oep9qxed
---
# Comando dell'agente dopo la shell pronta

Prima `launchAgent` scriveva la riga con `sendText` subito dopo `createTerminal`: una riga oltre 1024 byte su macOS (4096 su Linux) perdeva la coda e l'Invio. Ora la riga si scrive una sola volta quando `terminal.shellIntegration` è presente o si attiva (`onDidChangeTerminalShellIntegration`), con `shellIntegration.executeCommand`; se non si attiva entro 10 secondi si usa `sendText`. Mai in un terminale chiuso nel frattempo. Lavoro, annuncio e `onSent` partono all'apertura del terminale; la fine del comando si riconosce come prima dalla riga scritta.
