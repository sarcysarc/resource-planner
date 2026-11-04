// The moves sit under "GYMS & RAIDS": one fast move, then one or two charged moves.
const MOVES_HEADER = /\bGYMS\b/;
// OCR can miss NEW on the button's gradient; ATTACK in capitals before a Stardust price
// still gives it away (a move named "Attack Order" is mixed case, with its power after it).
const NEW_ATTACK = /\bNEW\s+ATTACK\b|\bATTACK\s+\D?\d{1,3},000\b/;
// The unlock price is the same number of thousands of Stardust as Candy: "§90,000 £90".
const UNLOCK_COST = /(\d{2,3}),000\D{1,4}(\d{2,3})\b/;
const BONUS = /\bBON\w{0,3}\b/i;
const MOVE_NAME = /[A-Za-z]{3,}/;
const ORIGIN = /\b(CAUGHT|HATCHED|RECEIVED|OBTAINED|TRADED)\b/;

function isUnlockCost(line: string): boolean {
  const cost = UNLOCK_COST.exec(line);
  return !!cost && cost[1] === cost[2];
}

const locks = (line: string) => NEW_ATTACK.test(line) || isUnlockCost(line);

// Move lines after the header, skipping weather and Shadow bonus lines. The count only
// stands when the origin label comes straight after them; anything else (a button, a
// garbled label) could be an unread NEW ATTACK, so it gives 0.
function countMoves(lines: string[]): number {
  let moves = 0;
  for (const line of lines) {
    if (BONUS.test(line)) continue;
    if (ORIGIN.test(line)) return moves;
    if (locks(line) || !MOVE_NAME.test(line)) return 0;
    moves += 1;
  }
  return 0;
}

/** Whether the second charged move is unlocked; undefined when the screen cannot tell. */
export function readSecondMove(lines: string[]): boolean | undefined {
  const header = lines.findIndex((line) => MOVES_HEADER.test(line));
  if (header === -1) return undefined;
  const below = lines.slice(header + 1);
  if (below.some(locks)) return false;
  return countMoves(below) >= 3 || undefined;
}
