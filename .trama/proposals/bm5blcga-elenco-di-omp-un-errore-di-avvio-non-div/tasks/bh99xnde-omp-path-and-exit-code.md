---
technical: false
refs:
  - panel/Settings
  - requirements/tech#panel/Settings
---

# Lanciare omp con il PATH di bun e riportare l'exit code

Quando la scheda Settings chiede l'elenco a omp, il processo parte con il PATH dell'editor preceduto dalla cartella giusta: quella di `trama.ompPath` se è impostato, altrimenti la cartella di bun (`BUN_INSTALL/bin` se la variabile è impostata, altrimenti `~/.bun/bin`). Così lo script di omp trova bun anche con il launcher del desktop. Se omp esce con un codice diverso da 0, l'elenco è vuoto e `error` è `omp exited with code N`, con N il codice di uscita; il contenuto di stdout non viene letto come elenco, anche se è un JSON valido. Lo stderr non entra in `error`. Un JSON non valido o senza `models` resta `omp models did not return a valid list`. I test di `test/model-lists.test.ts` che fissavano un'uscita con errore come elenco valido vanno sostituiti con questi casi.
