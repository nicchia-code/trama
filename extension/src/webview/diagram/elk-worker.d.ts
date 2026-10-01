declare module "elkjs/lib/elk-worker.min.js" {
  /** elkjs's in-thread stand-in for a web worker: layouts run on the calling thread. */
  export const Worker: new () => globalThis.Worker;
}
