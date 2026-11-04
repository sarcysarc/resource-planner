// What is kept of the grid on the device (ADR 0015), checked when it is read back.
import { z } from 'zod';

const SavedTile = z.object({
  id: z.string().regex(/^t\d+$/),
  /** Field name to value, as typed; checkboxes as true or false. */
  values: z.record(z.string(), z.union([z.string(), z.boolean()])),
  /** The species picked for its form list, when there is one. */
  chosen: z.string().optional(),
  current: z.boolean(),
  transfer: z.boolean(),
  /** Only the cropped thumbnail, never the screenshot. */
  thumb: z.string().startsWith('data:image/jpeg;base64,').optional(),
  /** Fields read from screenshots or set by the player. */
  known: z.array(z.string()),
  /** What was first read (cp, hp, family) to find the tile again, and the fields edited by hand. */
  marks: z.partialRecord(z.enum(['cp', 'hp', 'family', 'edited']), z.string()).optional(),
});

const SavedGridSchema = z.object({
  version: z.literal(1),
  target: z.string(),
  tiles: z.array(SavedTile),
});

export type SavedTile = z.infer<typeof SavedTile>;
export type SavedGrid = z.infer<typeof SavedGridSchema>;

/** The saved grid, or undefined when there is none or it is not one this version can use. */
export function parseSaved(value: unknown): SavedGrid | undefined {
  const parsed = SavedGridSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
