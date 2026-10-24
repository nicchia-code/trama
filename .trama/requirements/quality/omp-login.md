---
description: "Usa quando il lavoro sul login ai fornitori di omp tocca credenziali, sicurezza del terminale o accessibilità."
---
# Login dei fornitori di omp

## developer.LOG_IN_PROVIDER
- Riservatezza: Trama non legge mai credenziali né account di omp. Non esegue `omp token`, `omp auth export` né `omp usage accounts`, non apre il database di omp e non legge l'uscita né l'input del terminale di login, dove il developer può scrivere codici o chiavi. Lo stato dei fornitori viene solo dal campo del fornitore dei modelli di `omp models --json`; nessun nome di account o indirizzo email entra nel webview o in un log.
- Sicurezza: il comando del terminale lo compone l'host, con un id preso dall'elenco fisso e il programma omp quotato per la shell; un id che il webview manda e che non è nell'elenco è rifiutato e non apre nulla.
- Accessibilità: lo stato di un fornitore si legge a parole e non solo dal colore; ogni pulsante ha un nome accessibile che nomina il fornitore e si usa da tastiera.
