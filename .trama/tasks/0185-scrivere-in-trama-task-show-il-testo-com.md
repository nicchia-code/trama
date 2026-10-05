---
column: done
technical: false
refs:
  - task
  - requirements/tech#task
drift: null
proposal: "0038"
agent: false
---
# Scrivere in trama task show il testo completo per realizzare il task

Quando si legge un Task, il testo contiene tutto ciò che serve a realizzarlo, senza rimandi ad altri comandi né a skill. Un riferimento a una macchina include l'albero degli stati e gli eventi con chi li riceve, gli stessi fatti che si vedono guardando la macchina. Un riferimento a uno stato include le transizioni in uscita, anche quelle ereditate dagli stati che lo contengono, segnate come ereditate. Un riferimento a un evento include le transizioni che vi reagiscono. Un riferimento a un'area intera include il testo di ogni sua sezione. Nella parte dei Requisiti, ogni sezione General che ha testo è scritta per intero, e la lettura non nomina le skill dei Requisiti da caricare.
