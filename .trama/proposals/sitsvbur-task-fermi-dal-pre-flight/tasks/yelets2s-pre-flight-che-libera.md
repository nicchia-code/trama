---
technical: false
refs:
  - task
  - requirements/rules#task
  - requirements/tech#task
  - requirements/quality#task
---
# Pre-flight che libera i Task

Il pre-flight di ogni Run (un Task, `Run all`, il Run automatico) blocca solo i Task che la differenza di un suo Drift tocca davvero, e il Run continua anche sui Task lasciati liberi.

In `skills/trama-implement/SKILL.md`, passo del pre-flight:
- Ogni confronto dei riferimenti rimasti usa `trama compare brief --pre-flight`, sia quando l'agente del Run confronta da sé una sola Machine sia con più Machine, un sotto-agente per Machine che archivia solo Drift senza origine; l'incarico dei sotto-agenti dice che il giudizio del pre-flight vale sempre.
- Per ogni Drift che archivia, chi lo archivia giudica i candidati del briefing e mette in `notBlocking`, con il motivo, i Task che la differenza non tocca (criterio in `rules#work`).
- La frase «A Drift the pre-flight finds blocks the Tasks that concern the same element» diventa: un Drift del pre-flight blocca solo i Task che la differenza tocca, e il Run continua sugli altri, compresi quelli lasciati liberi.
- Il resoconto della corsa elenca, accanto ai riferimenti già confrontati, i Task lasciati liberi da un Drift del pre-flight, ciascuno con il Drift e il motivo.
- Con il blocco sperimentale spento, i Drift del pre-flight che non bloccano nessun Task restano Drift aperti: la skill non li mette in una risoluzione `nonBlocking`.

`skills/trama-implement/SKILL.md` si aggiorna nel sorgente del repository; le copie installate si aggiornano con Update skills.
