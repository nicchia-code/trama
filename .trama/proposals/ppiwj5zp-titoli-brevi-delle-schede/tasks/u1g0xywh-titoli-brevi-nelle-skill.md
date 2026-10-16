---
technical: true
refs:
  - requirements/tech#General
---
# Titoli brevi nelle skill

Le skill distribuite `trama-design`, `trama-setup`, `trama-scan`, `trama-implement`, `trama-import` e `trama-resolve-drifts` dicono all'agente di dare a ogni Proposal, Task e Drift che crea, e al suo annuncio (`trama announce …`), un titolo breve: un nome di al massimo cinque parole, circa 40 caratteri, non una frase che descrive il lavoro, con un esempio come «Testo fantasma» al posto di «Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma». Il dettaglio va nel corpo della scheda, anche se il titolo perde informazioni.

Quando il lavoro è finito:
- la regola compare in ogni skill nominata, accanto a dove la skill insegna a creare le schede (`trama proposal new`, `trama task new`, `trama drift new`, `proposal edit … tasks/<slug>.md`, `trama announce`);
- nessun comando controlla, avvisa o rifiuta per la lunghezza del titolo;
- i titoli composti da un altro titolo restano come sono: il Task di correzione `Fix code to match the …` creato da Trama, `Import: <Feature>` di `trama-import` e i titoli dei check (`Final check of …`, `Pre-flight of …`, `Scan of …`);
- le skill installate nei progetti si aggiornano con Update skills come ogni altra modifica delle skill distribuite; nessuna scheda esistente viene riscritta.
