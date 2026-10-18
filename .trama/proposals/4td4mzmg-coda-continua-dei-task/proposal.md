---
status: approved
requires:
  - suahhze5
base:
  work/task.md: f846edcf5b4ae790b56acb165d6d220abb230b51e6e85ad10df93c3e2ad661e9
  requirements/rules/tasks.md: 7abd8941a573a673247a2fe9f89913d8cfe38376ac998a63f091cd6a55bacdd6
  requirements/rules/models.md: fa7d44c415ab30e8dc5546c797726942ef8126b36d959fcb63e2030e38597faf
  requirements/tech/work.md: 8bf34cae8512f33b6c68d0c586a69f019a81714407e647f24be845b643a5a64a
  requirements/tech/models.md: 700d304529ad9727c9f83179c7dc665c5967e91160f695dd7208ce8734403c88
  requirements/data/proposals.md: 04cc9a16d63cc1b9381079845ce2f09b93e821a4a2d5976fd8b5ecb1a2cbf27c
delete: []
created: 2026-10-18T19:49:39.629Z
label: Coda continua
---
# Coda continua dei Task

Perché: nei Run registrati (progetto Axi) l'implementazione è il 67-82% del tempo e un gruppo di Task dura quanto il suo Task più lento: nel secondo Run il Task tipico finisce in ~92 s, ma i gruppi durano 320-470 s, perché la corsa chiede il gruppo seguente solo quando hanno finito tutti. Senza dipendenze l'implementazione sarebbe durata 470 s invece di 1572 s. Inoltre ogni Run comincia con un pre-flight che confronta di nuovo codice già confrontato con successo subito prima (tipicamente dalla scansione dopo l'approvazione): 192 s nel secondo Run.

Decisioni prese nei round di domande:
- Coda continua: appena un sotto-agente finisce, la corsa chiede a Trama i Task eseguibili per i posti liberi e li affida subito, senza aspettare gli altri.
- Il pre-flight salta, riferimento per riferimento, ciò che è già stato confrontato con successo con lo stesso codice e con lo stesso testo di Modello e Requisiti.
- L'impronta del codice viene da git (commit corrente e modifiche del working tree, esclusi `.trama/` e le cartelle che Trama installa); senza git il pre-flight si fa sempre.

Scelte mie, da controllare:
- Un Task non parte se riguarda la stessa cosa di un Task già In progress preso dall'agente, come oggi non sta nello stesso gruppo di uno che la riguarda.
- Nel Run automatico la delega si ricontrolla prima di affidare ogni Task, non più fra i gruppi.
- La verifica finale, la scansione di fine corsa e la History partono quando nessun sotto-agente lavora più e Trama non restituisce Task, come oggi dopo l'ultimo gruppo.
- Contano come confronto riuscito le archiviazioni in blocco riuscite (`trama compare file`, anche vuote) di ogni scansione, pre-flight e scansione di fine corsa. Un confronto ritirato o rifiutato non conta.
- Un riferimento è coperto se esso, o un elemento che lo contiene, è stato confrontato con l'impronta del codice di adesso e con lo stesso testo; il pre-flight elenca a parte i riferimenti saltati.
- Il registro è locale e non versionato, sotto `.trama/compared/`, come `short-numbers/`.
