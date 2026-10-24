---
status: approved
base:
  requirements/tech/instruction-files.md: 6e88a4bd559d52761bb6d1dd439e33219329e328e3024d32c309c97d238d2d19
  requirements/tech/models.md: cf9e885d4a3db082c77121dc1e1c8cb4cf090e042fff61c6fdaf0c4fc8e89043
  requirements/tech/questions-notices.md: 06698dded36ecbbfe6f77136c1bb4b52c21523726512d1df361f6d9b9da0fb74
delete: []
created: 2026-10-24T19:08:37.461Z
label: auto exit
---
# Round senza auto-background

In omp Chat una conversazione di un lavoro si chiudeva (con `trama.autoExit` acceso) o andava a riposo mentre il suo round di domande era ancora aperto: il round finiva Interrupted e il developer perdeva le risposte. Lo strumento bash di omp sposta in background ogni comando che dura più di 60 secondi (`bash.autoBackground.enabled`, acceso per default, anche con `timeout: 0`), così `trama question new` smette di tenere occupato il turno; omp risponde al prompt del lavoro e Trama lo conta come `omp-acp.TURN_ENDED`. Nel terminale non succede, perché l'hook manda il riposo con `session_stop`, che aspetta i job asincroni.

Decisioni:
- La correzione è alla causa: l'overlay `--config` di ogni lancio con l'hook spegne l'auto-background di bash di omp (`bash.autoBackground.enabled: false`).
- Vale per il terminale e per omp Chat, per ogni lavoro con l'hook, così terminale e conversazione si comportano allo stesso modo.

Assunzioni:
- Ask more e General non cambiano: non hanno l'hook né l'overlay, e la loro fine del turno non chiude nulla.
- Nessun controllo nell'host sulla fine del turno con un round aperto: scelta del developer, l'overlay basta.
- Se l'overlay non si può scrivere il lancio parte lo stesso, come oggi, con l'auto-background di omp.
