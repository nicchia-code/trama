---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
  - requirements/quality#cursor-chat
drift: null
proposal: null
agent: false
---
# Aggiornare documentazione e script di accettazione per la consegna alla chat di Cursor senza controllo dei dieci secondi

La documentazione dell'estensione e lo script di accettazione descrivono la consegna alla chat di Cursor come dice ora il Requisito: la chat nuova vale come inviata se Cursor non segnala un errore, e Trama non avvisa più il developer quando la chat non riporta il prompt entro dieci secondi. Nessun testo promette o verifica più quell'avviso; il passo di accettazione controlla invece che non compaia la conferma «Create chat with prompt» né «Scan now» dopo una consegna riuscita.
