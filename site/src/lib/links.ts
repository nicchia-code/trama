/** The addresses the site links to; every one of them is a plain link, the site itself requests nothing from them. */
export const REPOSITORY = "https://github.com/nicchia-code/trama";
export const MARKETPLACE = "https://marketplace.visualstudio.com/items?itemName=nicchia.trama";
export const CLI_REFERENCE = `${REPOSITORY}/blob/main/docs/cli.md`;
export const MODEL_FORMAT = `${REPOSITORY}/blob/main/docs/model-format.md`;
export const LICENSE = `${REPOSITORY}/blob/main/LICENSE`;
export const RELEASES = `${REPOSITORY}/releases`;

/** An address inside the site: `withBase("/trama/", "guide/")` is `/trama/guide/`. */
export function withBase(base: string, path: string): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return root + path.replace(/^\/+/, "");
}
