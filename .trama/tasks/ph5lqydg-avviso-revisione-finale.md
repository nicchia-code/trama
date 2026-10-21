---
column: done
technical: false
refs:
  - chat-advisor/Finita senza revisione finale
  - requirements/ui#chat-advisor
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:57:20.395Z
---
# Avviso revisione finale mancata

Quando un Run della chat finisce senza l'esito della revisione finale dell'Advisor della chat (interrotto o in errore, turno finito prima che Trama potesse continuarlo, o terza richiesta senza esito), la Board mostra in cima, con gli avvisi dei ghost e nello stesso stile, `The Run finished without the Advisor's final review: <motivo>.` con il motivo inglese (`the run was interrupted`, `the turn ended before Trama could ask for it`, `the agent did not wait for the review`) e il pulsante `Close` con icona `X`. Un avviso per Run, che resta fino alla chiusura manuale o del pannello; il testo non segue `trama.language`. Nessun avviso per una corsa che ha avuto un esito finale (pulito o no) né per una conversazione chiusa dal developer. Le revisioni non hanno ghost, badge né altri segni sulla Board.

Oggi gli avvisi in cima alla Board nascono solo dal messaggio `withdrawn` (`extension/src/host/controller.ts`, `protocol.ts`) con il testo di `withdrawnNotice` (`board/logic.ts`): questo avviso ha bisogno di un suo messaggio dall'host al webview, che entra nella stessa lista di avvisi di `BoardPage` con lo stesso `Close`.
