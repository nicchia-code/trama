---
column: done
technical: false
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: m8luoq0k
agent: false
created: 2026-10-09T20:04:56.745Z
finished: 2026-10-09T20:31:39.000Z
---
# Withdraw a hooked terminal's announcements after the quiet period and restart it on heartbeat and read-only commands

Gli annunci in attesa di un terminale il cui agente ha un hook (omp) seguono i quindici minuti di quiete come quelli di ogni altro agente: scaduti, sono ritirati e il developer riceve lo stesso avviso di quando finisce il comando. Oggi sono esclusi dalla quiete.

Quando è fatto:
- il segnale di vita (`agent-alive`) che l'editor riceve da un terminale fa ripartire i quindici minuti dei soli annunci con quel terminale; l'editor tiene in memoria, per ogni terminale, il momento dell'ultimo segnale, senza scrivere nulla su disco né toccare `touched`;
- l'attività di sola lettura che l'editor riceve dall'agente riconosciuto (un comando di `trama` di sola lettura lanciato da un terminale di Trama o dall'agente della chat di Cursor) fa ripartire i quindici minuti di ogni annuncio in attesa, qualunque sia il suo terminale; l'editor ne tiene in memoria l'ultimo momento, senza scrivere i file degli annunci né il loro `touched`;
- un annuncio è in quiete quando sono passati quindici minuti dal più recente fra `touched`, l'ultima attività di sola lettura, l'ultimo segnale di vita del suo terminale e la chiusura dell'ultimo round di domande; i quindici minuti restano fermi mentre un round è aperto;
- un agente con hook interrotto, bloccato o ucciso, che non manda più segnali né comandi, perde i suoi annunci dopo quindici minuti.

Il modo in cui la riga di comando riferisce i comandi di sola lettura e in cui l'hook manda il segnale di vita fa parte del Task wyn38oe4; qui conta come l'editor usa queste attività per gli annunci.
