# Requirements: Regole di business, Regole dell'approvazione

Usa quando implementi ciò che succede all'approvazione di una Proposal.

## proposal/Approved

- Lo scope di una Proposal ordinaria è calcolato dal vivo, per Draft e aperte, confrontando il Modello e i Requisiti di prima e di dopo (sopra le Proposal richieste); non si salva. Contiene, con motivo `changed`, ogni State, Transition ed Event aggiunto o cambiato, con ciò che contiene; la descrizione cambiata di una Machine, di una Feature o di un Actor, come tale; ogni sezione di Requisiti aggiunta o cambiata. Una Machine nuova entra intera. Con motivo `leads into a change`, le Transitions di qualunque Machine che entrano in un elemento cambiato o reagiscono a un suo Event cambiato. Un elemento tolto entra con il suo contenitore più vicino che esiste ancora, motivo `removed, its container`. Una sezione General cambiata entra da sola. La descrizione del System, il titolo e la descrizione di un frammento non aggiungono nulla.
- Le sezioni si confrontano per Area e riferimento, indipendentemente dal frammento: una sezione spostata con lo stesso testo non conta come cambiata, né la nascita o la scomparsa di un frammento.
- Lo scope serve alla copertura dei Task (vedi `proposal`). Le Proposal già approvate con il vecchio campo `scanScope` restano leggibili; nessuna migrazione.
- L'approvazione, senza agente, crea nello stesso passo in cui copia i file un Task in To do per ogni file dei Task della Proposal, con la stessa identità, `proposal` uguale alla Proposal, `drift` vuoto e `created` uguale all'istante dell'approvazione per tutti (fra loro si ordinano per identità).
- Per ogni elemento del Modello tolto dalla Proposal, solo il più alto, l'approvazione crea anche un Task `Remove code of <ref>` (riferimento dell'elemento tolto, nella forma dei `refs` dei Task) legato alla Proposal, che punta al contenitore più vicino ancora vivo (per una Machine la sua Feature); il corpo dice cosa togliere. Una Feature o un Actor tolti danno un Technical Task senza riferimenti. Le sezioni di Requisiti tolte non creano Task.
- L'approvazione controlla tutto prima di scrivere: se un'identità è già presa da un Task del progetto è rifiutata, senza stato parziale.
