// One native full-screen ad/fallback flow across every mounted screen.
let owner: symbol | null = null;
export class AdFlowCancelledError extends Error {
  constructor() { super('Ad flow is already active or its screen is no longer active'); this.name = 'AdFlowCancelledError'; }
}
export const isAdFlowCancelled = (error: unknown) => error instanceof AdFlowCancelledError;
export const isAdPresentationBusy = () => owner !== null;
export const ownsAdPresentation = (token?: symbol) => !!token && owner === token;
export function acquireAdPresentation(): symbol | null {
  if (owner) return null;
  owner = Symbol('ad-presentation');
  return owner;
}
export function releaseAdPresentation(token: symbol) { if (owner === token) owner = null; }
export function assertAdActionAvailable(token?: symbol) {
  if (owner && owner !== token) throw new AdFlowCancelledError();
}
