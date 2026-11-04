import type { Reading } from '../core/screen/types';

const VARIANT_NAMES = { normal: 'Normal', shadow: 'Shadow', purified: 'Purified' } as const;

const input = (root: ParentNode, name: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
const tick = (root: ParentNode, name: string, on: boolean) => {
  (input(root, name) as HTMLInputElement).checked = on;
};

// Each sets one field when the reading has it and says what it set.
type Setter = (root: ParentNode, reading: Reading) => string | undefined;

const SETTERS: Setter[] = [
  (root, { variant }) => {
    if (!variant) return undefined;
    input(root, 'variant').value = variant;
    return VARIANT_NAMES[variant];
  },
  (root, { lucky }) => {
    if (!lucky) return undefined;
    tick(root, 'lucky', true);
    return 'Lucky';
  },
  (root, { secondMove }) => {
    if (secondMove === undefined) return undefined;
    tick(root, 'secondMove', secondMove);
    return `second move ${secondMove ? 'unlocked' : 'locked'}`;
  },
  // Only the next step's cost: the total to the target is filled by evolveMemory.
  (_root, { evolveCandy }) => (evolveCandy === undefined ? undefined : `${evolveCandy} Candy for the next evolution`),
];

/**
 * Sets the choices the screen showed and leaves the rest as they are, since a missing
 * label may just be off screen. Returns what was set, for the status line.
 */
export function fillDetails(root: ParentNode, reading: Reading): string[] {
  return SETTERS.map((set) => set(root, reading)).filter((part) => part !== undefined);
}
