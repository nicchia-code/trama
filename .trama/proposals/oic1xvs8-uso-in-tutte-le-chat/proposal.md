---
status: approved
base:
  agent-launching/omp-chat.md: 1e329924a64ecc419a4a7c44ceb41e84b25883987ffc39165ec2e14f3373679c
  agent-launching/omp-chat-general.md: c8196f557d8eb76f52187da92fa3c4d35175d94ed3a2464359788419817f8205
  requirements/rules/omp-chat.md: 0493da3269a818f131d27400356b3b1e6c2b961cdea3e7415ce797a56bd391c4
  requirements/rules/omp-chat-general.md: 2c7919c9c210bb452e104bbfa3aef28b184faba57409f4ba38114032ba26a73a
  requirements/tech/omp-chat.md: 6cfdd29b315bfc95fdd2e1f1969521aff8fff910b55ae79e410fa3dadb7a8305
  requirements/tech/omp-chat-general.md: e7e43553bb549955602394fc4d77e106c0bc3a7c6a1833a2fcfc78848aef1348
  requirements/ui/omp-chat.md: 1499f5bba75410fc59a09bc89854558d31b9fee2eb73c95888ecce03dcf58c06
  requirements/ui/omp-chat-general.md: new
  requirements/data/omp-chat.md: a0bb3d393a38ec80449e00b223139ad7ae15c840829fd0e22ce05a5c9f12fa04
  requirements/quality/omp-chat.md: f56be8435a4340d7a88d5d8e3668073f63bb6161f1158325969bb58cf87f5b79
delete: []
request: 2026-10-24T18-08-53
created: 2026-10-24T16:13:53.468Z
label: uso omp Chat
---
# Uso in tutte le chat

La barra dell'uso dell'abbonamento oggi compare solo in General; la richiesta scritta chiede che compaia in tutte le conversazioni di omp Chat. L'uso diventa della vista omp Chat della finestra, non di General: la descrizione e i Requisiti dell'uso passano da `omp-chat-general` a `omp-chat`.

## Decisioni
- La barra compare in ogni conversazione della vista: General, ogni conversazione di un lavoro e Ask more, nello stesso posto (a destra del selettore del modello).
- Ogni barra mostra il fornitore del modello scelto nel selettore della propria conversazione; cambiarlo cambia subito quella barra.
- La barra è identica in ogni conversazione: voci, colori, tooltip, pulsante compatto `Usage` e dialogo.
- L'uso si chiede anche quando la finestra non ha General ma ha conversazioni di lavori (omp Chat spenta con lavori aperti, o ripresi a omp Chat spenta); solo una finestra senza nessuna conversazione non lo chiede.
- Pochi processi `omp usage`: il resoconto resta uno per finestra, condiviso da tutte le schede. Quando compare una conversazione (General compresa) o è ripresa, si chiede solo se la finestra non ha ancora un resoconto riuscito né una richiesta in corso.
- A fine turno di un agente si chiede solo se l'ultima richiesta è finita da più di 60 secondi; l'apertura del dialogo chiede sempre.

## Assunzioni
- Il limite dei 60 secondi conta dalla fine dell'ultima richiesta, riuscita o fallita, così un omp che fallisce non riparte a ogni turno; una fine turno saltata non lascia nessuna richiesta in attesa e non c'è nessun timer.
- Senza General, `omp usage` gira nella cartella che vale per il pannello, la stessa che usa General.
