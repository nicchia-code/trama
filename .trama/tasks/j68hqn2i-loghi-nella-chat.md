---
column: done
technical: true
refs:
  - specs#frameworks
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T10:35:31.947Z
---
# Loghi nella chat

Le righe delle chiamate agli strumenti di omp Chat mostrano il logo del linguaggio o del tipo di file al posto dell'icona per tipo, quando Trama lo riconosce (`ui#omp-chat-conversation`, punto «Loghi delle chiamate»; `tech#omp-chat`, punto dei loghi). Questo Task fa solo quei punti di quelle sezioni.

Quando è fatto:
- Dipendenza `simple-icons` (licenza CC0) aggiunta come in `specs#frameworks`, con i loghi importati uno per uno (`siPython`, `siJavascript`, `siTypescript`, …) così che il bundle porti solo quelli usati. `extension/THIRD-PARTY-NOTICES.md` riporta la licenza CC0 di `simple-icons` e che i loghi sono marchi dei loro proprietari. La rimozione di `fantasticon` da `specs.yaml` e dal progetto non è di questo Task: la fa il Task della barra di stato.
- Una funzione pura in `extension/src/webview/omp-chat/`, provata con `bun:test`, dal titolo della chiamata e dal primo percorso di `locations` di ACP dà il logo e il titolo da mostrare:
  - titolo che comincia con `[py] ` o `[js] ` (celle di codice di omp): logo di Python o JavaScript, prefisso tolto dal titolo; un prefisso sconosciuto (per esempio `[?]`) resta nel titolo con l'icona per tipo;
  - titolo che comincia con `$ ` (comando della shell): resta l'icona `SquareTerminal`, il `$ ` iniziale si toglie;
  - lettura, ricerca o modifica di un file: logo scelto dall'estensione, senza distinguere maiuscole: Python (`.py`), JavaScript (`.js`, `.mjs`, `.cjs`, `.jsx`), TypeScript (`.ts`, `.tsx`, `.mts`, `.cts`), JSON (`.json`), Markdown (`.md`), HTML (`.html`, `.htm`), CSS (`.css`), YAML (`.yml`, `.yaml`), Rust (`.rs`), Go (`.go`), Java (`.java`), Swift (`.swift`), Kotlin (`.kt`, `.kts`), C (`.c`, `.h`), C++ (`.cpp`, `.cc`, `.cxx`, `.hpp`), C# (`.cs`), Ruby (`.rb`), PHP (`.php`), script della shell (`.sh`, `.bash`, `.zsh`). Ogni altro file, o un tipo che `simple-icons` non ha, tiene l'icona per tipo.
- Il disegno (`ToolIcon` / `ToolCall` in `extension/src/webview/omp-chat/blocks.tsx`, accanto a `TOOL_ICONS`): `<svg viewBox="0 0 24 24">` con il `path` del logo e `fill="currentColor"`, alla stessa misura delle icone per tipo che sostituisce (le stesse classi di `TOOL_ICONS`, oggi `size-3.5`) e nel colore del testo della riga, con `role="img"` e `aria-label` il nome del linguaggio o del tipo (`Python`, `TypeScript`, `Shell script`…), letto prima del titolo; nessun tooltip. Lo stesso vale per la riga della chiamata dentro una richiesta di permesso.
- Test `bun:test` della funzione di scelta (prefissi, `$ `, estensioni, maiuscole, tipi sconosciuti) e un test del webview che una riga `[py] …` mostra il logo con `aria-label` `Python` e il titolo senza prefisso.
