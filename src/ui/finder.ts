import { z } from 'zod';
import { inferSpreads, type Bar, type Match, type Observation, type Stars } from '../core/infer';
import { MAX_POWER_UP_LEVEL } from '../data/powerUpCosts';
import { fieldValues, firstError, optional, type Result } from './form';
import type { SpeciesIndex } from './species';

const MAX_SHOWN = 12;
const bar = optional(z.coerce.number().int().min(0).max(3));

const FinderFields = z.object({
  form: z.string(),
  cp: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number({ error: 'enter the number shown in game' }).int().min(10)),
  seenHp: optional(z.coerce.number().int().min(1)),
  dust: optional(z.coerce.number().int().min(1)),
  level: optional(z.coerce.number().min(1).max(MAX_POWER_UP_LEVEL).multipleOf(0.5)),
  variant: z.enum(['normal', 'shadow', 'purified']),
  lucky: z.boolean(),
  stars: optional(z.coerce.number().int().min(0).max(4)),
  atkBar: bar,
  defBar: bar,
  hpBar: bar,
});

type Fields = z.infer<typeof FinderFields>;

function toObservation(fields: Fields, base: Observation['base']): Observation {
  return {
    base,
    cp: fields.cp,
    mods: { variant: fields.variant, lucky: fields.lucky },
    hp: fields.seenHp,
    dust: fields.dust,
    level: fields.level,
    appraisal: {
      stars: fields.stars as Stars | undefined,
      bars: { atk: fields.atkBar as Bar | undefined, def: fields.defBar as Bar | undefined, hp: fields.hpBar as Bar | undefined },
    },
  };
}

export interface FinderSource {
  root: ParentNode;
  index: SpeciesIndex;
}

export function readObservation({ root, index }: FinderSource): Result<Observation> {
  const parsed = FinderFields.safeParse(fieldValues(root));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const form = index.lookup.get(parsed.data.form);
  if (!form) return { ok: false, error: 'Pick the Pokémon you will battle with first' };
  return { ok: true, value: toObservation(parsed.data, form.base) };
}

const matchLabel = ({ ivs, level }: Match) => `${ivs.atk}/${ivs.def}/${ivs.hp} · Lv ${level}`;

function summary(count: number): string {
  if (count === 0) return 'No IV spread fits. Check the form, CP and HP.';
  if (count === 1) return 'One spread fits. Pick it to fill in the IVs:';
  if (count <= MAX_SHOWN) return `${count} spreads fit. Pick the one you have:`;
  return `${count} spreads fit. Showing ${MAX_SHOWN}; add HP, Stardust or appraisal to narrow it down.`;
}

function say(root: ParentNode, message: string, ...buttons: HTMLButtonElement[]): void {
  const text = document.createElement('p');
  text.textContent = message;
  root.querySelector('.matches')!.replaceChildren(text, ...buttons);
}

function pick(root: ParentNode, match: Match): void {
  const values = { atk: match.ivs.atk, def: match.ivs.def, hp: match.ivs.hp, level: match.level };
  for (const [name, value] of Object.entries(values)) {
    root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value = String(value);
  }
  say(root, `Filled in ${matchLabel(match)}.`);
}

function renderMatches(root: ParentNode, matches: Match[]): void {
  const buttons = matches.slice(0, MAX_SHOWN).map((match) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = matchLabel(match);
    button.addEventListener('click', () => pick(root, match));
    return button;
  });
  say(root, summary(matches.length), ...buttons);
}

/** Hooks up a candidate fieldset's "Find IVs" button. */
export function wireFinder(source: FinderSource): void {
  source.root.querySelector('[data-find]')!.addEventListener('click', () => {
    const observation = readObservation(source);
    if (observation.ok) renderMatches(source.root, inferSpreads(observation.value));
    else say(source.root, observation.error);
  });
}
