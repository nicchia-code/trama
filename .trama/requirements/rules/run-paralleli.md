---
description: "Usa quando lavori sulla sequenza per modello di Run all lanciata in parallelo e sulla divisione del limite dei sotto-agenti fra i suoi Run."
---
# Regole dei Run per modello in parallelo

## drift-resolution/Running tasks
- Sequenza in parallelo, con `trama.parallelExecution` acceso al lancio di `Run all` e più gruppi di modello (`rules#agent-launching`): l'host divide il limite dei sotto-agenti N (`rules#agent-terminal`) fra i gruppi in proporzione ai loro Task eseguibili al lancio, almeno 1 a gruppo, con la somma che non supera N: a ogni gruppo la parte intera di N per i suoi Task diviso il totale, almeno 1, poi i posti avanzati uno ciascuno ai gruppi con il resto più grande, a parità al gruppo con il Task più vecchio. Le parti non si ricalcolano quando un Run finisce.
- Ogni Run porta la sua parte al posto di N nella frase del limite e nel `max` di `trama task list`; il resto della sua istruzione, il suo modello e il nome del suo terminale sono quelli della sequenza di oggi.
- Partono insieme, nell'ordine dei gruppi, tanti Run quanti ne stanno in N con almeno un posto ciascuno. Con più gruppi che posti, i gruppi rimasti partono uno alla volta, ciascuno con un posto, alla fine normale di un Run già partito.
- Una fine anomala di un Run della sequenza in parallelo non ferma i Run già partiti, che finiscono il loro lavoro: ferma solo i gruppi che non sono ancora partiti.
- Le prenotazioni dei file (`rules#prenotazione-file`) valgono fra i Run della sequenza come fra due Run qualsiasi.
