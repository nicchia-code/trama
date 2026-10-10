---
column: done
technical: true
refs:
  - requirements/ui#question-round
drift: g8hejv2d
proposal: null
agent: false
created: 2026-10-10T10:36:32.807Z
finished: 2026-10-10T10:38:21.938Z
---
# Fix code to match the Requirements: Digit key clears the selected single-choice option instead of selecting it

## What happens

In una domanda a **scelta singola**, premere il tasto numerico dell'opzione già selezionata la **deseleziona**, come un clic sulla sua riga. Alla prima visita l'opzione raccomandata è già selezionata: premendo il suo numero, per esempio `1` per confermarla, il developer resta senza nessuna scelta e `Next` si disabilita finché non sceglie di nuovo o scrive un testo. Lo stesso accade premendo due volte lo stesso numero.

## What should happen

Il Requisito dice che i tasti da 1 a 9 **selezionano** l'opzione corrispondente; solo nella scelta multipla la spuntano o la tolgono. Nella scelta singola il tasto di un'opzione già selezionata la lascia selezionata. Deselezionare con un gesto resta possibile solo cliccando l'opzione già scelta, così si può rispondere con il solo testo.

## Chosen option

**Il tasto seleziona soltanto**

Nella scelta singola il tasto numerico seleziona sempre la sua opzione e non la toglie mai; nella scelta multipla continua a spuntarla o toglierla, e il clic sulla riga resta com'è. Cambia solo la scorciatoia da tastiera, come chiede il Requisito; costa una piccola modifica e l'aggiornamento della verifica della scorciatoia.

## Where in the code

extension/src/webview/questions/index.ts (gestore dei tasti dell'overlay, che manda sempre `toggleOption`); extension/src/host/question-state.ts (`applyQuestionAction`, caso `toggleOption`)
