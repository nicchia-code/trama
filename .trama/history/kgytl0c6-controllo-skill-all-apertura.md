---
created: 2026-10-21T04:14:12.811Z
updated: 2026-10-21T04:14:12.811Z
summary: Ogni apertura ordinaria di Trama dall'editor controlla in sottofondo le skill installate e le porta in pari con questa versione, con un avviso solo se qualcosa è cambiato.
tasks:
  - yn1brdud
---
# Controllo skill all'apertura

Il pulsante Trama, l'icona e il comando Open Trama e il Reopen delle domande avviano, dopo aver aperto il pannello, un controllo che usa lo stesso codice di `trama project edit` (senza migrare né creare le Aree) e scrive solo i file il cui contenuto cambia. `project edit --json` riporta anche `agentsChanged`. L'errore è «Trama: could not update the agent skills: <motivo>.» e si riprova alla prossima apertura.
