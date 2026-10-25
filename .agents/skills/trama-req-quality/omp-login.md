# Requirements: Qualità, Login dei fornitori di omp

Usa quando il lavoro sul login ai fornitori di omp o sulla chiave API di Cursor tocca credenziali, sicurezza del terminale o accessibilità.

## developer.LOG_IN_PROVIDER

- Riservatezza: Trama non legge mai credenziali né account di omp; l'unica credenziale che tiene è la chiave API di Cursor che il developer le dà (`quality#developer.SET_CURSOR_API_KEY`). Non esegue `omp token`, `omp auth export` né `omp usage accounts`, non apre il database di omp e non legge l'uscita né l'input del terminale di login, dove il developer può scrivere codici o chiavi. Of the logout command (`rules#developer.LOG_OUT_PROVIDER`) it reads only the exit code and the error output, to tell the reason of a failure. Lo stato dei fornitori viene solo dal campo del fornitore dei modelli di `omp models --json`; nessun nome di account o indirizzo email entra nel webview o in un log.
- Sicurezza: il comando del terminale lo compone l'host, con un id preso dall'elenco fisso e il programma omp quotato per la shell; un id che il webview manda e che non è nell'elenco è rifiutato e non apre nulla. The logout command runs without a shell, with fixed arguments and an id from the same list, only after the developer confirmed in a modal dialog of the editor; no file of the repository and no message of the webview can log out without that confirmation.
- Accessibilità: lo stato di un fornitore si legge a parole e non solo dal colore; ogni pulsante ha un nome accessibile che nomina il fornitore e si usa da tastiera.

## developer.SET_CURSOR_API_KEY

- Riservatezza: la chiave API di Cursor sta solo nel portachiavi dell'editor e nella memoria dell'host. Non entra mai nel webview, in un messaggio fra host e webview, in un log, nella console, in un file (impostazioni, progetto, `.trama/`, stato dell'estensione), in un'istruzione all'agente, negli argomenti di un processo o in una riga scritta in un terminale. Arriva a omp solo come valore di `CURSOR_ACCESS_TOKEN` nell'ambiente del processo.
- Riservatezza: Trama non manda la chiave in rete, non la scambia e non la verifica; la usa soltanto omp. Come ogni variabile d'ambiente, è visibile ai comandi che omp esegue nel suo processo, compresi quelli dell'agente: Trama non la nasconde all'agente.
- Sicurezza: il nome della variabile è fisso; nessun file del repository e nessun messaggio del webview sceglie la variabile, il suo valore o il processo che la riceve. Un messaggio del webview non può portare né leggere una chiave.
- Accessibilità: «API key saved» si legge a parole; i pulsanti della chiave hanno nomi accessibili che nominano Cursor e si usano da tastiera; la casella è quella dell'editor, con le sue tecnologie assistive.
