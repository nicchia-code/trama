---
column: done
technical: false
refs:
  - notice/Sending
  - requirements/ui#notice
  - requirements/rules#notice
  - requirements/tech#notice
  - requirements/data#notice
  - requirements/quality#away-notifications
drift: null
proposal: b3982601
agent: false
created: 1970-01-01T00:00:00.116Z
---
# Comporre titolo, testo, priorità e tag dell'avviso con una funzione pura

Dato un fatto (avviso su una domanda con nome del progetto, domanda corrente, posizione nel round e etichette delle opzioni; oppure avviso sulla fine con nome del progetto, esito e conteggi della Board) si ottengono titolo, messaggio, priorità e tag, senza editor né rete. Domanda: titolo 'Trama: the agent asks', priorità 4, tag question, righe progetto / 'Question <n> of <total>: <testo>' / una riga '- <etichetta>' per opzione nell'ordine dell'agente, senza descrizioni né marcatura della raccomandata. Fine: titolo 'Trama: the agent stopped', righe progetto / 'The agent finished.' (stato 0, priorità 3, tag white_check_mark), 'The agent failed (exit code <n>).' (stato diverso da 0, priorità 4, tag warning) o 'The agent command ended.' (esito non riportato, priorità 3, tag white_check_mark) / 'To decide: <n>', 'To do: <n>', 'In progress: <n>'. Il titolo è solo ASCII. Il messaggio non supera 4000 byte UTF-8: se è più lungo si taglia a un confine di carattere e termina con '…', tagliando prima le ultime opzioni e lasciando sempre la riga del progetto e la posizione nel round. I testi sono in inglese e non seguono trama.language; solo domanda ed etichette restano nella lingua dell'agente. Non contiene mai risposte, percorsi, contenuto di file, Proposal, Task o Drift.
