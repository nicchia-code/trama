---
technical: false
refs:
  - announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
---

# Annuncio al lancio in chat

Quando il lavoro è finito, con la chat (`chat` = `cursor` o `editor`) l'annuncio che Trama scrive al lancio (la Proposal di un design o di Resolve Drifts, il controllo di uno scan, il lavoro di un import) viene scritto appena parte il passo di consegna che invia da solo il testo, cioè subito prima di `composer.createNew` in Cursor e di `workbench.action.chat.open` in VS Code, senza aspettare che il comando ritorni.

Se la consegna finisce in modo diverso da `sent` (testo pronto nel deeplink, testo negli appunti, non inviato), l'estensione cancella subito quell'annuncio, senza alcun avviso: in particolare non compare l'avviso che l'agente ha finito senza consegnare.

I lanci nel terminale restano come prima. Lo stesso codice serve sia i lanci dai pulsanti sia quelli dell'autopilot dei Drift.
