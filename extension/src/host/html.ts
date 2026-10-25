/**
 * The page the webview panel loads: one mount point and the bundled script, under a strict CSP. `mermaidUri` is where the
 * `mermaid.js` bundle can be loaded from (a webview URI, so from `cspSource`): the first diagram of the page adds a script
 * with the page's nonce and that address (`mermaid-loader.ts`). The CSP does not change.
 */
export function webviewHtml(input: { cspSource: string; nonce: string; scriptUri: string; mermaidUri?: string }): string {
  const { cspSource, nonce, scriptUri, mermaidUri } = input;
  // The webview injects its stylesheet and styles elements from script, which only `'unsafe-inline'` allows.
  const csp = [
    "default-src 'none'",
    `style-src ${cspSource} 'unsafe-inline'`,
    `img-src ${cspSource} data:`,
    `font-src ${cspSource}`,
    `script-src 'nonce-${nonce}'`,
    // DevTools fetches `webview.js.map` through the page; without this it is blocked by `default-src 'none'`.
    `connect-src ${cspSource}`,
  ].join("; ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trama</title>
</head>
<body${mermaidUri === undefined ? "" : ` data-mermaid-src="${mermaidUri}"`}>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
