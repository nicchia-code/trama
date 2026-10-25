---
status: approved
base:
  actors/developer.md: fb6488be60fe9ed200ceba4a447d4dffe744946f4d06fccdba1c6869dac37d42
  agent-launching/feature.md: e24855e4b770cad66a841271b13c701e16f019808694f98de6560dee5c613209
  editor-panel/panel.md: a616571b909c0482864d571d45f93416a824b39b4d1d8871be8f1f472a4d571c
  project-setup/setup-wizard.md: 4d2f52280b136440090354efa7bd98dbcb960705ff36c16dcada4c6ee1203373
  requirements/tech/system-certificates.md: new
  requirements/rules/system-certificates.md: new
  requirements/ui/system-certificates.md: new
  requirements/quality/system-certificates.md: new
  requirements/tech/settings.md: 4510c062f71f3c3bfbe912dc7c2d909fd790bab8ad51bfe3fe583f6d965d3693
  requirements/ui/settings-specs.md: 43094a2e2f8f5e9cab8c918e49ac22485777acfdb90c2b92f18ec3169d44cc30
  requirements/ui/setup-wizard-steps.md: 720b26778f527da6553cfeebfac6173795d809b7821ed8f992235d6466b76cd3
  requirements/ui/agents.md: 5b35e9673d15fba8e79bfcc400c7576de856657405965f07a2ca0cb9cdd6e3a0
  requirements/rules/setup-wizard.md: 29d46aed2a99cbcdb9712a964b1855e3d8405859a7d41710db648cdf2bd6cd26
delete: []
created: 2026-10-25T06:55:30.502Z
label: System certificates
---
# Certificati di sistema

Dietro un proxy che ispeziona il traffico HTTPS (per esempio Zscaler) omp e i comandi dell'agente falliscono con errori di certificato, perché non si fidano della CA del proxy installata nello store del sistema. Trama non apre connessioni da sé: la soluzione è preparare l'ambiente dei processi che avvia e dire chiaramente quando un errore è di certificato.

## Decisioni
- Modalità `System Certificates` (`trama.systemCertificates`), un interruttore spento di default; Trama non la accende mai da sola e non la propone mai.
- Accesa, Trama esporta lo store di sistema con i comandi del sistema: macOS `security find-certificate -a -p` sui portachiavi di sistema (`/Library/Keychains/System.keychain` e `/System/Library/Keychains/SystemRootCertificates.keychain`), senza il portachiavi `login`; Windows PowerShell su `Cert:\LocalMachine\Root`; Linux il bundle della distribuzione in `/etc/ssl/certs` e simili.
- Il bundle unisce lo store esportato alle radici pubbliche che l'editor porta con sé, senza duplicati, ed è scritto in una cartella di Trama per l'utente, con percorso fisso e scrittura atomica.
- Il bundle va a ogni processo che Trama avvia (terminali dei lavori, omp Chat compresa General, login, installer, `omp models`/`usage`/`--version`/`update`, logout) e quindi anche ai comandi dell'agente, con le variabili `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`, `CURL_CA_BUNDLE`, `GIT_SSL_CAINFO`, `PIP_CERT`, `CARGO_HTTP_CAINFO`, `AWS_CA_BUNDLE`, `DENO_CERT`, che **sovrascrivono** quelle dell'ambiente dell'editor.
- Rigenerazione: all'accensione, all'avvio dell'estensione quando il bundle manca o ha più di 24 ore, e a mano con un pulsante `Refresh` accanto allo stato e con un comando della palette.
- Esportazione fallita: con un bundle precedente Trama continua a usarlo e lo dice; senza, non imposta nessuna variabile e dice il motivo. Lo stato (numero di certificati, data, ultimo errore) si vede accanto all'interruttore.
- L'interruttore sta nel gruppo `omp` della scheda Settings e nel passo `omp` del wizard, così chi è dietro un proxy lo accende prima che la verifica di omp blocchi `Next`.
- Un errore di certificato riconosciuto nel motivo di un fallimento di omp si mostra con un testo fisso e chiaro, che nomina come causa probabile un proxy aziendale senza nominare prodotti e non propone di accendere la modalità; con la modalità accesa dice che l'errore è avvenuto anche con la modalità accesa.
- Trama non disattiva mai la verifica TLS.

## Assunzioni da verificare
- Su Windows si esporta solo lo store della macchina (`LocalMachine`), non quello dell'utente, per la stessa ragione per cui su macOS si esclude il portachiavi `login`.
- Nel wizard il valore dell'interruttore vale subito per la verifica del passo `omp`, come il percorso di omp del passo, anche prima della conferma, e si salva alla conferma come le altre scelte.
- Spegnere la modalità smette di passare le variabili ai processi avviati dopo; il bundle resta nella cartella di Trama senza essere usato.
- Cambiare la modalità, o rigenerare il bundle, rifà in silenzio la verifica di omp e i suggerimenti dei modelli, come dopo un cambio della chiave API di Cursor.
- I Run in un terminale (omp Chat spenta) ricevono il bundle, ma i loro errori restano scritti nel terminale come sono: Trama non legge l'uscita del terminale.
- Java resta fuori: vuole un truststore, non un bundle PEM.
