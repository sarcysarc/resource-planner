// Batches of screenshots go in one at a time (issue #3): a batch shared while step 1 still
// asks about the last one, or reads it, waits its turn instead of replacing it.

/** Reads one batch; it settles once the batch is in, questions and all. */
export type ReadBatch = (files: File[]) => Promise<void>;

/**
 * Gives a function that queues each batch behind the ones before it. `onWait` hears how
 * many screenshots wait behind the batch being read, 0 once none do.
 */
export function queueBatches(read: ReadBatch, onWait: (waiting: number) => void): (files: File[]) => void {
  let tail = Promise.resolve();
  let pending = 0;
  let waiting = 0;
  return (files) => {
    if (!files.length) return;
    const waits = pending > 0;
    pending += 1;
    if (waits) onWait((waiting += files.length));
    const turn = async () => {
      if (waits) onWait((waiting -= files.length));
      await read(files).catch(() => undefined);
      pending -= 1;
    };
    // With none before it, a batch starts now, so its status shows at once.
    tail = waits ? tail.then(turn) : turn();
  };
}

/** Says in `note` how many screenshots wait behind the batch being read. */
export function waitingNote(note: HTMLElement): (waiting: number) => void {
  return (waiting) => {
    const what = waiting === 1 ? '1 more screenshot' : `${waiting} more screenshots`;
    note.textContent = waiting ? `${what} will be read after these.` : '';
    note.hidden = !waiting;
  };
}
