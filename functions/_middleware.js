// Keep the Pages middleware pass-through so production hosts serve the same
// application while API and other Pages Functions continue to run normally.
export async function onRequest({ next }) {
  return next();
}
