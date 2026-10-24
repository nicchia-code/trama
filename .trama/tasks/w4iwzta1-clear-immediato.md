---
column: done
technical: false
refs:
  - developer.CLEAR_DONE
  - requirements/ui#developer.CLEAR_DONE
  - requirements/tech#developer.CLEAR_DONE
  - requirements/quality#developer.CLEAR_DONE
drift: null
proposal: kbcic7up
agent: false
created: 2026-10-24T13:41:10.442Z
finished: 2026-10-24T13:58:50.277Z
---
# Clear immediato in Done

Oggi Clear cancella i Task di Done, ma su un progetto con qualche centinaio di Task impiega molti secondi (15,5 s con 336 Task, 294 Proposal e 83 voci di History), perché `clearDoneTasks` (`src/core/clear-done.ts`) rilegge tutte le Proposal in `copyOf` e tutta la History per ogni Task. Intanto l'host è bloccato e la Board non cambia, così sembra che Clear non faccia nulla.

Quando il Task è finito:

- **Lettura unica.** La funzione di Clear legge Proposal, voci di History e Drift aperti una sola volta per chiamata, prima del primo Task, e tiene in memoria le voci che aggiorna. Restano uguali le regole di `rules#developer.CLEAR_DONE` e l'ordine dei passi per ogni Task: copia in ogni voce di History che lo cita (con file provvisorio poi rinominato), riga in `.trama/last-scan/cleared` quando serve, poi cancellazione del file, della percentuale e delle immagini; al primo errore si ferma prima di cancellare quel Task. I test esistenti di `src/core/clear-done.ts` restano verdi senza cambiare ciò che verificano.
- **Rimozione ottimistica.** Al clic su `Clear` le schede dei Task che Clear cancella (tutte quelle di Done tranne quelle col badge `kept`) spariscono subito dalla colonna, senza aspettare l'editor, e restano nascoste anche se arriva un quadro nuovo prima della fine. Numero della colonna, gruppi per giorno, `Nothing done yet` e lo stato di `Clear` (`Nothing to clear`) seguono le schede rimaste. Il focus va alla chevron della colonna come oggi.
- **Fine della cancellazione.** Dopo il quadro aggiornato l'host manda il messaggio nuovo `clearDoneEnded { cleared: string[] }` in ogni caso: riuscita, rifiuto (`A run is in progress`, `cleared` vuoto) o fallimento. Il webview smette allora di nascondere le schede: quelle cancellate non ci sono più, le altre tornano al loro posto, e il rifiuto o il fallimento mostra l'avviso in cima alla Board come oggi.
- **Test.** Il calcolo delle schede nascoste è una funzione pura in `extension/src/webview/board/logic.ts`, provata con `bun:test`: schede nascoste dopo il clic, `kept` mai nascoste, numero e gruppi della colonna, schede che tornano dopo un rifiuto o un fallimento.
