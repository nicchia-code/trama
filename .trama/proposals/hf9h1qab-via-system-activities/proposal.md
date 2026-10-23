---
status: approved
base:
  work/announcement.md: e378d448a30a2d45f2c2b7abac86100e7aa6c5b0d4cd2e8baf5634c452b121fa
  editor-panel/panel.md: 5d62236f1f7c0afac8f57d6fcb3f91180b0f175b851932b438b9234a47e534b3
  actors/developer.md: f2ccb2387713863887c903af5d93e0a523e1e42533d5f5763eedf1200ba62b79
  agent-launching/agent-terminal.md: 5558c77f4e97ebb3e4890ad0524c5dc860a82adf71d5142360b20feb41cf5954
  agent-launching/design-request.md: b8b13b38e2a40ac5ad4e245b899d04016af1742d457c4d89ffa35031bb5813b3
  work/voce-history.md: 8da4ac0b6e98216aaf2e9234c64115a9ebb65f1db0433f174952eda7cd04c916
  work/feature.md: f419db752fcf6940bef6c50cd85ad7c5b28f828f71600e4fdb7ca08aaf974657
  requirements/ui/ghosts.md: ed80563a8c0a5ad92f3b88011ff250b0b7d12f8a446b535793998273bcf8f8cf
  requirements/ui/board.md: 1e63ffc0b42397a1d5d5518d0b98fe283e65a169cd221cb13e3df27c65984dea
  requirements/ui/ask-more.md: 2bb4f86523e3244aab221fc5bb7808ae741c9b3d7bf005a82b09cf6a64fc08e1
  requirements/ui/quick-task.md: cab45f5e3b7bc52c1c0b0a613634a7cf29d9cec5cd6098f7d5d90475ae29e3c1
  requirements/ui/unify-drifts.md: b8aa28278d7ee80e3823be2f5a6c6cc1a9c3be898d26aba52250a1269ea4117c
  requirements/ui/work.md: 550bcfcfb303402c5360d838ebf9e1d38569a1cdb8b3b88f3cd4b51e4c4b8c80
  requirements/rules/announcements.md: c2d520e5852244425dbeeec06d9bdcf193866af20894888f649e7c2789fc2a84
  requirements/data/work.md: c3efd8fafb537c51634c665e05dcd00c5872f82c686ec493ec49f5d52e6b8fb1
  requirements/tech/announcements.md: 649697fe1100bb997a3161ebbc51dcd751dd3b9770374bcde0c13c0cf94dbb7c
delete: []
request: 2026-10-23T14-24-10
created: 2026-10-23T12:35:42.630Z
label: System Activities
---
# Via System Activities

La colonna System Activities sparisce dalla Board. Ogni ghost sta dove arriverà la sua scheda: i ghost di Proposal (anche di design e di risoluzione) e di Drift (anche dell'unificazione) in Backlog, quelli dei Task in Active. I ghost che non hanno una colonna (controlli, confronti di Machine, lavori come import, Quick e Ask) diventano un solo elemento nella barra di stato dell'editor; cliccandolo si vedono i dettagli.

## Decisioni

- Ghost in Backlog e Active: in fondo alla colonna, dopo le schede vere, nell'ordine in cui sono stati annunciati; la scheda vera ne prende il posto.
- Una colonna con soli ghost mostra ancora il suo testo di colonna vuota (`Nothing to decide`, `Nothing active`), sopra i ghost; i ghost continuano a non contare.
- Barra di stato: un solo elemento riassuntivo per tutti i ghost senza colonna, che mostra il ghost annunciato più di recente e quanti altri ce ne sono.
- Testo dell'elemento: icona che gira, titolo e `+N`; tipo, fase, durata e ultima nota nel tooltip.
- Posizione: in fondo al gruppo di sinistra della barra, il punto più vicino al centro che l'editor consente (non esiste un allineamento al centro).
- L'elemento si vede sempre, anche a pannello chiuso.
- Clic: un elenco dell'editor con i ghost della barra, il più recente in cima, con titolo, fase e ultima nota; scelto un ghost (o subito, se è uno solo) Trama apre il pannello sulla Board con la finestra dei suoi dettagli.
- Le immagini della richiesta non vanno ai Task.

## Assunzioni da controllare

- L'elemento ha un nome suo nel menu della barra di stato, `Trama Activities`, così il developer può nasconderlo a parte; il pulsante con il logo di Trama non cambia.
- Ogni finestra dell'editor aperta sul progetto mostra nella barra tutti i ghost senza colonna del progetto, come la Board mostra tutti i ghost.
- Gli avvisi dei ghost ritirati restano in cima alla Board (e per ora restano spenti); quello del controllo di esecuzione non cambia.
- Quando la finestra dei dettagli di un ghost della barra si chiude, o si chiude da sola perché il ghost è sparito, il focus va alla colonna Backlog; per un ghost di Backlog o Active va alla sua colonna, come oggi va a System Activities.
- Se il ghost scelto nell'elenco è sparito nel frattempo, il pannello si apre sulla Board senza finestra.
- Testi dell'elemento e dell'elenco in inglese, senza seguire `trama.language`, come gli altri testi di Trama nell'editor.
- Scelte tecniche dell'agente: l'elemento è dell'host, con l'icona `loading~spin` e priorità `-10000`; l'host legge gli annunci da sé sul watcher di `.trama/` già attivo; una sola funzione pura in `src/core` decide la colonna di ogni ghost per la Board e per la barra; i dettagli si aprono con una nuova opzione `ghost` del messaggio `navigate`; `Running for` nel suggerimento si aggiorna ogni 30 s.
