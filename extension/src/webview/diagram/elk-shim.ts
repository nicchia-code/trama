// elkjs's UMD wrapper probes `typeof require`. Bun's browser bundles rewrite that probe to a helper called
// `__require` and do not always emit the helper, which throws a ReferenceError when elkjs loads.
// Declaring the name first makes the probe see "no require", which is what a browser has.
(globalThis as { __require?: unknown }).__require = undefined;
