// A "stage" is a spot on a page where the flying notebook lands: the hero's showcase slot,
// the story section's pinned reading desk. Pages declare them with <FlyingNotebookStage>;
// the flying notebook engine reads the registry every frame to learn where to fly next.
// Kept in a module of its own (no three.js) so pages can render stages without
// pulling the 3D chunk into the main bundle.

export interface StageConfig {
  /** Swing the notebook open and write on the page while it rests here. */
  open?: boolean
  /** Resting yaw (radians) while closed - a three-quarter view reads best. */
  rotY?: number
  /** Share of the stage the closed book may fill. */
  fit?: number
  /** Stick to the middle of the screen while the stage scrolls past, the way a
   *  CSS `position: sticky` child would. For tall stages. */
  pin?: boolean
  /** Take off once the stage's bottom edge climbs above this fraction of the
   *  viewport height (0 = top, 1 = bottom). */
  leaveAt?: number
  /** Land once the stage's top edge climbs above this fraction. */
  arriveAt?: number
  /** Handwritten message, when the book opens here. */
  message?: { lines: readonly [string, string]; sign: string }
  /** Let visitors drag the book and tap it open / shut. Default true. */
  interactive?: boolean
}

export interface StageEntry {
  id: string
  el: HTMLElement
  config: StageConfig
}

const stages = new Map<string, StageEntry>()

export function registerStage(entry: StageEntry): () => void {
  stages.set(entry.id, entry)
  return () => {
    // A re-mount may have already replaced this id with a fresh element.
    if (stages.get(entry.id)?.el === entry.el) stages.delete(entry.id)
  }
}

export function getStages(): IterableIterator<StageEntry> {
  return stages.values()
}
