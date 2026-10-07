---
column: done
technical: true
refs:
  - requirements/tech#announcement
  - requirements/rules#announcement
  - requirements/rules#task
drift: null
proposal: null
agent: false
created: 2026-10-07T06:05:13.785Z
finished: 2026-10-07T06:12:14.156Z
---
# Completare la frase troncata sul controllo in trama-implement e togliere da trama-implement e trama-scan i resti di worktree e prosecuzione automatica

Le istruzioni che le skill danno all'agente sul controllo e sullo scan di fine corsa devono dire solo ciò che i Requisiti vigenti prevedono, per intero.

- **trama-implement, Announcing the check**: il paragrafo finisce a metà parola («Announce no check when the instruction s…»), quindi l'agente legge una regola monca. Va chiuso in modo completo, dicendo che un sotto-agente non annuncia controlli (tech#announcement) e senza l'eccezione per un'istruzione che vieta il controllo: nessuna istruzione di Trama lo fa più, dopo la rimozione del giro di worktree.
- **trama-implement, passo 7**: la frase «Skip this step when the instruction you were given says not to scan the whole System at the end» è un resto del giro di worktree; rules#task fa partire lo scan del System intero ogni volta che le sue condizioni sono vere, senza altre eccezioni.
- **trama-scan, Announcing the check**: «a scan after an approval that goes on to implement closes its check before the first Task» è un resto della prosecuzione automatica con i Task, tolta insieme a `trama.autoImplement`; «Announce no check when the instruction says not to» è un resto del giro di worktree. rules#announcement fa annunciare il controllo a ogni scansione fuori da una corsa di trama-implement, senza eccezioni oltre al sotto-agente.

Fatto quando le due skill non contengono più testo troncato né eccezioni che i Requisiti non prevedono, e dicono ancora che un sotto-agente non annuncia controlli.
