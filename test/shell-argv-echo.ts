// Program run by the shell-quoting tests: prints its arguments as one JSON array per line, with every non-ASCII
// character escaped, so the output is ASCII whatever the console's code page is.
console.log(JSON.stringify(process.argv.slice(2)).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`));
