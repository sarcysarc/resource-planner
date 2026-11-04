// Screenshots already read are known by a fingerprint of their bytes (ADR 0017), never by
// keeping the image: a file shared again is skipped without OCR.

/** The first 16 bytes of the file's SHA-256, in hex. */
export async function fingerprint(file: Blob): Promise<string> {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'));
    reader.readAsArrayBuffer(file);
  });
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...hash.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The files not read before, each one's fingerprint, and how many were left out. */
export interface Fresh {
  files: File[];
  printOf: Map<File, string>;
  skipped: number;
}

/** Leaves out files whose fingerprint is in `seen`, and a file chosen twice. */
export async function freshFiles(files: File[], seen: ReadonlySet<string>): Promise<Fresh> {
  const prints = await Promise.all(files.map(fingerprint));
  const kept = new Set(seen);
  const fresh = files.filter((_, i) => !kept.has(prints[i]) && kept.add(prints[i]));
  return { files: fresh, printOf: new Map(files.map((f, i) => [f, prints[i]])), skipped: files.length - fresh.length };
}

/** The sentence about skipped files, or '' when none were. */
export function skippedNote(skipped: number): string {
  return skipped ? ` Skipped ${skipped} already added.` : '';
}
