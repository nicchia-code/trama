---
column: done
technical: false
refs:
  - design-request/Writing
  - design-request/Sent
  - requirements/data#General
  - requirements/data#design-request
  - requirements/rules#design-request
drift: null
proposal: a1657b14
agent: false
created: 1970-01-01T00:00:00.149Z
---
# Store written design requests in .trama/requests and derive their title

Una richiesta di design inviata diventa il file `.trama/requests/<id>.md`, con un ID nuovo di sei lettere minuscole e cifre casuali (come gli annunci) e solo il testo del developer, così com'è: nessun front matter, titolo o sezione aggiunti, nessuna riformattazione. La cartella ha un proprio `.gitignore` che ignora tutto, scritto insieme alla prima richiesta, così le richieste non sono mai versionate. Un nuovo invio della stessa richiesta riusa lo stesso file.

Due regole pure e testabili: il titolo della richiesta è il primo titolo `#` di primo livello fuori dai blocchi di codice (senza i `#` e gli spazi), altrimenti la prima riga non vuota senza spazi attorno; un testo è vuoto quando, tolti spazi e a capo, non resta nulla.
