---
technical: true
refs:
  - requirements/quality
---
# Qualità di omp

Le regole di qualità che riguardano omp valgono dopo le altre modifiche di questa Proposal. Alla fine:

- Sicurezza: l'installer di omp parte solo quando il developer preme `Install omp`, sempre in un terminale visibile, con il comando fisso; nessun file del repository né impostazione del workspace cambia il comando, il programma omp o le cartelle in cui si cerca. `omp update --check`, `omp update` e `omp --version` partono senza shell, con argomenti fissi.
- Privacy: installare e aggiornare omp scarica omp dalla rete con gli strumenti ufficiali di omp; nulla del progetto, delle impostazioni o del developer esce dalla macchina, e non c'è nessun'altra chiamata di rete nuova.
- Affidabilità: un controllo o un aggiornamento che fallisce non ferma mai un lavoro quando omp c'è; lo ferma soltanto omp che manca. Senza rete un lancio aspetta il controllo al più una volta all'ora.
- La sezione della qualità del passo del wizard si chiama ora `setup-wizard/omp` (la ricerca dei file di istruzioni non cambia), e l'accettazione di omp Chat prova che con `trama.ompPath` sbagliato il lavoro non parte e compare l'avviso di omp mancante.
- `docs/uat.md` ha i passi di accettazione per: omp mancante al lancio (avviso, nessun ghost), Install omp dal wizard e dalla scheda Settings, omp da aggiornare (notifica, lancio con la versione nuova), controllo senza rete (avviso una volta, lancio con l'omp di prima, nessun nuovo controllo per un'ora), omp installato da Homebrew.
