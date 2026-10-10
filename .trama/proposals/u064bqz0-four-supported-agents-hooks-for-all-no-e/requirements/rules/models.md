---
description: "Usa quando implementi la scelta dell'agente, i ruoli dei modelli e lo smistamento della scansione."
---
# Regole di agenti, modelli e smistamento

## agent-launching
- Ruolo di ogni istruzione: quick design request, written design request, Resolve Drifts e import → `trama.analysis`; scan del System, scan di Feature, scansione automatica dopo un'approvazione e scansione in sospeso → `trama.scan`; implement, implement all e implement a design → `trama.execution`, anche per la scansione finale della corsa.
- Dentro ogni istruzione che può scansionare, lo smistamento usa `trama.execution` e l'analisi delle Machine in conflitto usa `trama.analysis`.
- Un ruolo vuoto, o fatto solo di spazi, non passa nessun modello: l'agente usa il suo predefinito. Trama non controlla mai che un nome di modello esista; un nome sbagliato lo segnala l'agente nel suo terminale.
- L'agente si sceglie una volta per tutti i progetti con `trama.agent` (vedi `agent-terminal`): non c'è nessuna scelta al primo avvio e nessun comando personalizzato. I ruoli valgono solo con `omp` e `claude`.
- Frase dei sotto-agenti, aggiunta sulla stessa riga dopo l'istruzione e prima della frase della lingua, solo nelle istruzioni che possono scansionare e solo con `omp` o `claude`: "Triage each Machine with the trama-triage sub-agent and analyse every Machine in conflict with the trama-analysis sub-agent."
- In chat nessuna frase dei sotto-agenti. Quando un'istruzione parte verso la chat e almeno uno fra `trama.analysis`, `trama.scan` e `trama.execution` non è vuoto, la prima volta compare l'avviso dei ruoli (vedi `ui`); da allora non compare più, per nessun progetto.

## work
- Lo smistamento riguarda ogni Machine dell'ambito della scansione, una alla volta. Le sezioni General e quelle che non sono di una Machine restano all'agente che guida la scansione, come oggi, senza smistamento.
- Con `trama.system1` impostata a `jev` e la chiave salvata, la Machine è in conflitto quando la probabilità di Jev è almeno 0,2 e senza conflitto quando è sotto 0,2.
- Ogni errore del classificatore conta come conflitto. `unavailable` (nessun editor, System 1 spento, chiave mancante) fa decidere il sotto-agente di smistamento, che nel dubbio sceglie il conflitto.
- Una Machine senza conflitto non produce Task, Drift né Proposal e non è letta oltre. Una Machine in conflitto è confrontata a fondo e i suoi Task e Drift si archiviano come oggi; l'analisi può anche concludere che non c'è nulla da archiviare.
- Il resoconto della scansione ha una riga sullo smistamento: quante Machine sono state saltate senza conflitto, quante analizzate, chi ha deciso (Jev, il modello di esecuzione o entrambi) e quanti errori del classificatore sono stati contati come conflitto.
