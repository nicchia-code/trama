# Requirements: Qualità, Quality of agent instruction files

Use for the security, privacy and reliability of finding agent instruction files in the setup wizard and of leaving them out of omp launches.

## setup-wizard/omp

- Riservatezza: la ricerca legge solo i percorsi elencati in `rules#setup-wizard` e, dei file, solo quanto basta per sapere se sono vuoti; il loro contenuto non entra nel webview, in un log o nell'overlay. Il webview riceve solo percorsi ed etichette, mostrati come testo, mai come markup.
- Sicurezza: l'host apre soltanto un file dell'ultima ricerca; un percorso che il webview manda e che non vi compare è rifiutato. Il wizard non cancella né cambia mai un file di istruzioni.
- Prestazioni: la ricerca non blocca il passo: i controlli si usano subito e il riquadro compare quando la risposta arriva. Non scende nelle sottocartelle del progetto.

## agent-terminal/Agent running

- Sicurezza: `trama.ignoreInstructionFiles` si legge soltanto dalle impostazioni utente, così un repository clonato non può accenderla né spegnerla. Un file del progetto può solo aggiungere esclusioni con la sua `.omp/config.yml`, come già fa in omp; Trama non toglie mai un'esclusione del developer. L'overlay sta fuori dal repository e ogni valore vi entra come stringa YAML.
- Affidabilità: una ricerca o una lettura della configurazione di omp che fallisce non ferma il lancio: Trama lancia con le esclusioni che ha potuto calcolare, al limite nessuna, come con l'opzione spenta.
