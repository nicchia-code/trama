/** The one line-ending normalisation of Trama's text: CRLF and lone CR become LF. Every read, hash, comparison and parse of `.trama/` or skill text goes through it, so a CRLF checkout behaves like Linux. It imports nothing, so the webview bundle can use it without Node modules. */
export const normalizeLf = (text: string): string => text.replace(/\r\n?/g, "\n");
