---
created: 2026-10-23T11:17:24.105Z
updated: 2026-10-23T11:39:01.233Z
summary: "Con omp il developer può lavorare in una chat nell'editor al posto del terminale: conversazioni ACP, vista a schede, impostazione facoltativa e documentazione."
tasks:
  - 3elmhdqy
  - bgfu7ep9
  - laijjek7
  - u3om3no7
  - xz2z7ep0
  - yan34axq
---
# omp Chat

omp Chat è una funzione facoltativa, spenta finché il developer non la accende nel gruppo Features delle impostazioni, e vale solo con omp. Quando è accesa, ogni istruzione che Trama manda all'agente apre una conversazione in una vista a schede invece di un terminale: ogni conversazione ha il suo processo di omp parlato in ACP, segue le stesse regole del terminale (hook, Task presi, controllo di esecuzione, Stop e chiusura con conferma) e, se la finestra si chiude o si ricarica, viene ripresa nella stessa sessione. Se omp non parte, l'istruzione ricade in un terminale con un avviso. La vista mostra i messaggi, il ragionamento, gli strumenti, i piani e i moduli di domanda dell'agente, con il campo del messaggio e la scelta del modello. La vista sta nel pannello inferiore perché Cursor non accetta una barra laterale secondaria dichiarata dall'estensione. Il README, l'ADR e la guida UAT descrivono la funzione.
