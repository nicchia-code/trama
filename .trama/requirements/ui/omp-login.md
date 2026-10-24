---
description: "Usa quando costruisci o cambi la sezione Providers del login ai fornitori di omp e il suo terminale."
---
# Login dei fornitori di omp

## developer.LOG_IN_PROVIDER
- La sezione `Providers` sta, nel gruppo `omp` della scheda Settings e nel passo `omp` del wizard, subito sotto il riquadro dello stato di omp e prima delle impostazioni; è lo stesso componente nei due posti, con gli stessi testi. C'è solo quando `rules#developer.LOG_IN_PROVIDER` dice; quando manca non lascia spazio vuoto.
- In cima alla sezione il sottotitolo «Providers», come intestazione del livello successivo a quello del gruppo (nella scheda) o del passo (nel wizard); sotto, in testo secondario, «Log in to the model providers you use with omp.».
- Sotto, un elenco con nome accessibile «Providers», una riga per fornitore nell'ordine di `rules#developer.LOG_IN_PROVIDER`, separate da un bordo sottile. Ogni riga ha a sinistra il nome breve in grassetto e, sotto, l'abbonamento in testo secondario; poi lo stato; a destra il pulsante. Nei pannelli più stretti di circa 480 px il pulsante va sotto il nome e lo stato, allineato a sinistra. Nulla si sovrappone o esce dalla colonna, a qualunque larghezza da circa 300 px e in entrambi i temi; i testi lunghi vanno a capo.
- Stato, sempre anche a parole e non solo con il colore: collegato, l'icona lucide `CircleCheck` nel colore di successo e «Connected»; non collegato, «Not connected» in testo secondario, senza icona; sconosciuto, nessuno stato e nessuno spazio vuoto. Un cambio di stato non sposta il fuoco e non cambia l'altezza delle altre righe.
- Pulsante: `Button` di shadcn/ui nella variante `outline`, piccolo, con l'icona lucide `LogIn` a sinistra del testo: «Log in» per un fornitore non collegato o di stato sconosciuto, «Log in again» per uno collegato. Tooltip «Open a terminal that logs omp in to <nome breve>»; nome accessibile «Log in to <nome breve>» o «Log in again to <nome breve>».
- Google Gemini CLI e Google Antigravity hanno in più un tooltip che li distingue, al passaggio del puntatore sul nome e sul pulsante e al fuoco del pulsante, collegato al pulsante con `aria-describedby`: Google Gemini CLI «Gemini models through Google Cloud Code Assist, the Gemini CLI login.»; Google Antigravity «Gemini, Claude and GPT-OSS models through Google's Antigravity login.». Sul pulsante il tooltip mostra questa frase sopra quella del pulsante.
- Nessun tooltip compare da solo, come in `ui#setup-wizard`. Tutto si raggiunge e si usa da tastiera.
- Il terminale di login si chiama «Log in to <nome breve>» (per esempio «Log in to Anthropic»), si apre nell'area dei terminali qualunque sia `trama.terminalLocation`, diventa il terminale visibile con il cursore dentro e non ha ghost. Nessun avviso dell'editor alla fine del login.
- Tutti i testi sono in inglese e non seguono `trama.language`.
