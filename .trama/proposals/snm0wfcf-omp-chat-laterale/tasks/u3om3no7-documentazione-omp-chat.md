---
technical: true
---
# Documentazione di omp Chat

La documentazione del progetto spiega omp Chat.

Quando è finito:
- Un ADR nuovo in `docs/adr/` (il numero successivo all'ultimo) registra il ritorno di ACP solo per omp Chat: l'estensione è client ACP di `omp acp`, una conversazione per lavoro e un processo per conversazione, con le stesse regole del terminale di omp; dice perché ADR 0004, superato, non torna (niente altri agenti, niente scheda Agent nel pannello) e che ADR 0011 resta valido.
- `README.md` descrive omp Chat fra le funzioni del gruppo Features: che vale solo con omp, dove compare la vista, che ogni comando gira senza chiedere (modalità yolo di omp), che la sessione riceve solo i server MCP dei file nativi di omp e che senza omp raggiungibile il lavoro parte nel terminale.
- `docs/uat.md` ha i passi di accettazione di `quality#omp-chat-conversation`.
- `CHANGELOG.md` ha la voce della funzione.
- Testi in inglese, come il resto della documentazione.
