# Requirements: Qualità, Raffinamento delle Proposal obsolete

Usa per sicurezza, affidabilità e collaudo di Auto-update Stale Proposals.

## raffinamento

- Sicurezza: `trama.autoUpdateStaleProposals` si legge soltanto dalle impostazioni utente, così un repository clonato non può accenderla. Solo il clic del developer su `Approve`, tenuto nella memoria della finestra, fa partire un raffinamento e la sua approvazione finale; nessun file del progetto, `refining: true` compreso, avvia un raffinamento o approva una Proposal.
- Affidabilità: un raffinamento che finisce in qualunque modo non perde la Proposal né il lavoro fatto: una Draft riallineata resta riprendibile con `Approve`, un'approvazione rifiutata la lascia Open con l'avviso, e una Proposal riallineata non si approva finché non è consegnata. Il raffinamento non toglie mai dal Modello ciò che altre Proposal approvate hanno cambiato.
- L'accettazione esercita, con l'impostazione accesa: due design che toccano lo stesso file, il primo approvato e il secondo `to refine`; `Approve` che lo raffina e lo approva con i suoi Task; tre Proposal premute di fila che si raffinano una alla volta nell'ordine del Backlog; `Cancel` su una in coda; il terminale chiuso a metà, con la Draft che torna `to refine` e riprende con `Approve`; un'altra approvazione durante il raffinamento, con la Proposal che rientra in coda; la modifica già nel Modello con `Remove` e con `Keep`; e, con l'impostazione spenta, il badge `stale` e `Approve` disabilitato come prima.
