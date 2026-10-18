---
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
  - requirements/rules#drift-resolution
---

# Job della chat al click

Con l'agente della chat (Cursor e Copilot), un job di Trama (`run`, `scan`, `resolve`) parte non appena inizia il passo di consegna che invia da solo l'istruzione, cioè subito prima di `composer.createNew` in Cursor o di `workbench.action.chat.open` in VS Code, e non più quando il comando ritorna. L'ordine attuale dei passi di consegna alla chat resta com'è.

Da quel momento la Board conta il job in corso: `Run all` e gli altri pulsanti che un job in corso rende non disponibili diventano non disponibili subito dopo il click, e le altre finestre vengono avvisate che il job è partito. La conversazione nata dopo quel momento si lega a quel job; se la conversazione è già finita prima che il comando ritorni, il job finisce con lei.

Se il passo lancia un errore, o la consegna finisce in modo diverso da `sent` (deeplink, appunti, non inviata), il job finisce subito senza un esito anomalo per l'autopilot, le altre finestre vengono avvisate, il pulsante torna disponibile e una sequenza per modello si ferma come quando l'istruzione di un Run non parte davvero.
