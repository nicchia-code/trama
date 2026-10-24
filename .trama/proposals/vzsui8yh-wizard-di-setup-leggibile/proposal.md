---
status: approved
base:
  project-setup/setup-wizard.md: 559b9d4d0add0aa4e35283599d5a500d0dd83859f27437cbd7f9af50c6889407
  actors/developer.md: e39bbdc3ac82820255a957e4becc090e6222e0657c880106278d67f3500c048d
  requirements/ui/get-started.md: 47795ae1de2604a0e7d77075fb7334a42ebcb12926a063353c7633c73657a17d
  requirements/ui/setup-wizard.md: new
  requirements/ui/settings-specs.md: a5ceeda20aa68d1d4a4ff63f24a675a711233dbc62026b496346f16aab7833c5
  requirements/ui/general.md: 34c74ece614be45a6c686dfd5fa3dc5dfbc19d81fc4108f65d2cdc475d1e8c56
  requirements/ui/setup-wizard-steps.md: new
delete: []
request: 2026-10-24T13-56-52
created: 2026-10-24T12:24:54.582Z
label: setup-wizard
---
# Wizard di setup leggibile

Il wizard di setup chiede le informazioni giuste ma è graficamente confuso: sotto ogni impostazione restano 60–90 px vuoti, le caselle stanno su una riga separata dal titolo, il fumetto della «i» copre il campo sotto e il tooltip «About …» resta a schermo sopra la frase del passo, la tendina dei modelli copre il campo vicino, il passo corrente quasi non si vede, l'avviso `.trama` occupa ogni passo e Next finisce fuori schermo nei passi lunghi. Questa Proposal rende ogni passo chiaro e senza nulla di sovrapposto.

Decisioni del developer:
- Ogni passo è una colonna singola centrata di circa 720 px, una impostazione per riga, campi a tutta larghezza, caselle sulla riga del loro titolo, nessuno spazio vuoto sotto i campi.
- L'indicatore dei passi è una fila di passi numerati: spunta sui passi già fatti, il corrente pieno nel colore primario; nei pannelli stretti «Step <n> of <N> · <passo>» con una barra di avanzamento.
- I passi prima del corrente si cliccano nell'indicatore e portano lì conservando le scelte; i successivi no.
- Back, Skip, Next, Cancel e la conferma stanno in una barra fissa in fondo al pannello, con sfondo e bordo propri; il contenuto non le finisce mai sotto; l'errore della conferma compare nella barra, sopra i pulsanti, come avviso con icona.
- In Get Started l'avviso sulla cartella `.trama` compare solo in Path e in Summary.
- Nel wizard la spiegazione di ogni impostazione è testo secondario sotto il titolo, senza «i» né fumetti; per un enum, sotto il controllo, la spiegazione del valore scelto. La scheda Settings tiene la «i».
- I difetti dei controlli condivisi si correggono anche nella scheda Settings, che tiene la sua griglia: tooltip «About …» che resta a schermo, spazio vuoto sotto ogni campo, casella separata dal titolo, casella non spuntata quasi invisibile nel tema chiaro, tendina dei modelli che esce dal campo e copre il campo vicino.
- Path: due schede con un'icona lucide, un segno radio che si riempie e bordo e tinta leggera del colore primario quando sono scelte; il passaggio del puntatore cambia solo il bordo.
- Models: la frase del passo diventa «Choose the model for each kind of work.» e il consiglio sta sotto ogni ruolo.
- omp: lo stato della verifica sta in un riquadro in cima al passo, con `Install omp` dentro quando serve; poi i campi; poi il riquadro dei file di istruzioni.
- Advanced: sottogruppi con titolo Appearance, Drifts, Agents, omp Chat.
- Summary: una scheda per passo con un pulsante Edit che porta al passo; righe che cambiano con sfondo tinto, badge `changed` e «was …» accanto al valore.
- Il wizard ha un titolo: «Set up Trama» nel primo setup, «Guided setup» negli altri modi.
- Folders: icona di cartella o file per voce, nome intero nel tooltip quando è accorciato, rientro più piccolo nei pannelli stretti.

Scelte dell'agente da verificare:
- Icone delle schede di Path: `FolderCode` per Import from Code e `Sparkles` per Start from Scratch.
- Soglia dei pannelli stretti per l'indicatore compatto: sotto circa 480 px.
- In Summary l'avviso `.trama` sta sotto la frase del passo, sopra le schede.
- Il motivo per cui omp non risponde non finisce mai con due punti di fila prima di « Trama cannot work without omp.».
- La casella non spuntata ha un bordo con contrasto almeno 3:1 con lo sfondo in entrambi i temi, ovunque nel pannello.
