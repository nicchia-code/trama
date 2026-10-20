---
technical: true
refs:
  - requirements/tech#General
---
# Release senza blocchi

Quando il Task è fatto, ogni job del workflow `Release` (`.github/workflows/release.yml`: `plan`, `package` per ogni piattaforma, `release`) ha `timeout-minutes: 15`, così un blocco fa fallire il job invece di occupare il runner per ore.

La suite di test non si blocca più su nessuna piattaforma. Due run della release si sono fermati dentro `bun test --isolate`: su Linux (run 39323773655, circa 6 ore, ultimo output nei test `trama compare file and the registry`) e su macOS (run 39380019299, annullato dopo 1 ora e 11 minuti, ultimo output in `test/compared.test.ts` dopo il primo test `text fingerprint > … CRLF`). Si trova il test che resta appeso (un processo, un file, un lock o una connessione che non finisce) e lo si corregge in modo che finisca sempre, con successo o con un errore, anche con `--isolate`; non basta saltarlo o alzarne il timeout.
