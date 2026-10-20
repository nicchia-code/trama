declare module "*.md" {
  const text: string;
  export default text;
}

declare module "*.css" {
  const text: string;
  export default text;
}

/** The panel's Tailwind stylesheet, compiled by `scripts/build-extension.ts`. */
declare module "tailwind:css" {
  const text: string;
  export default text;
}
