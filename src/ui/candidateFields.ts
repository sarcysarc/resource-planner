const options = (labels: string[]) =>
  ['<option value="">Not sure</option>', ...labels.map((label, i) => `<option value="${i}">${label}</option>`)].join('');

const STAR_OPTIONS = options(['0 stars', '1 star', '2 stars', '3 stars', '3 red stars (perfect)']);
const BAR_OPTIONS = options(['0', '1', '2', '3 (full)']);

// Static markup only: no user data goes into this string. The legend is set as text.
const FIELDS = `
  <legend></legend>
  <p class="muted" data-scan-status aria-live="polite"></p>
  <label>Current form <select name="form"></select></label>
  <div class="row">
    <label>Attack IV <input name="atk" type="number" min="0" max="15" inputmode="numeric" /></label>
    <label>Defense IV <input name="def" type="number" min="0" max="15" inputmode="numeric" /></label>
    <label>HP IV <input name="hp" type="number" min="0" max="15" inputmode="numeric" /></label>
  </div>
  <p class="hint" data-hint="ivs">IVs are three hidden scores from 0 to 15. The appraisal shows them as bars.</p>
  <div class="row">
    <label>Level <input name="level" type="number" min="1" max="50" step="0.5" inputmode="decimal" /></label>
    <label>or CP <input name="cp" type="number" min="10" inputmode="numeric" /></label>
  </div>
  <p class="hint" data-hint="level">Give either one. CP is the number at the top of its screen.</p>
  <label>Type
    <select name="variant">
      <option value="normal">Normal</option>
      <option value="shadow">Shadow</option>
      <option value="purified">Purified</option>
    </select>
  </label>
  <p class="hint" data-hint="variant">Shadow Pokémon have a purple, flame-like aura. Purified ones were Shadow before.</p>
  <label class="check"><input type="checkbox" name="lucky" /> Lucky</label>
  <p class="hint" data-hint="lucky">Lucky Pokémon (from some trades) shine gold and cost half the Stardust to power up.</p>
  <label class="check"><input type="checkbox" name="bestBuddy" /> Best Buddy</label>
  <p class="hint" data-hint="bestBuddy">A Best Buddy gets one level of extra strength while it is your buddy.</p>
  <label class="check"><input type="checkbox" name="secondMove" /> Second charged move unlocked</label>
  <p class="hint" data-hint="secondMove">Tick this if you have already paid for a second charged attack.</p>
  <label>Candy to evolve <input name="evolveCandy" type="number" min="0" placeholder="Not known yet" inputmode="numeric" /></label>
  <p class="hint" data-hint="evolveCandy">The Candy shown on its Evolve button, added up for each evolution to the target. Leave blank if it is already the target.</p>
  <details class="moves">
    <summary>Choose its attacks (optional)</summary>
    <p class="hint">Left alone, the planner picks the best attacks for you.</p>
    <div class="row">
      <label>Raid fast move <select name="fastMove"><option value="">Best</option></select></label>
      <label>Raid charged move <select name="chargedMove"><option value="">Best</option></select></label>
    </div>
    <label>PvP fast move <select name="pvpFastMove"><option value="">PvPoke’s pick</option></select></label>
  </details>
  <details class="finder">
    <summary>Don't know the IVs?</summary>
    <p class="muted">Enter the CP above plus anything else the game shows, then pick the spread that matches.</p>
    <div class="row">
      <label>HP shown <input name="seenHp" type="number" min="1" inputmode="numeric" /></label>
      <label>Stardust to power up <input name="dust" type="number" min="1" inputmode="numeric" /></label>
    </div>
    <label>Appraisal stars
      <select name="stars">${STAR_OPTIONS}</select>
    </label>
    <p class="muted">For each bar, count how many of its 3 segments are completely filled.</p>
    <div class="row">
      <label>Attack bar <select name="atkBar">${BAR_OPTIONS}</select></label>
      <label>Defense bar <select name="defBar">${BAR_OPTIONS}</select></label>
      <label>HP bar <select name="hpBar">${BAR_OPTIONS}</select></label>
    </div>
    <button type="button" class="secondary" data-find>Find IVs</button>
    <div class="matches" aria-live="polite"></div>
  </details>
`;

/** Fills a `[data-candidate]` fieldset with the candidate inputs, titled by `data-legend`. */
export function buildCandidateFields(fieldset: HTMLElement): void {
  fieldset.innerHTML = FIELDS;
  fieldset.querySelector('legend')!.textContent = fieldset.dataset.legend ?? '';
}

/** Every candidate fieldset in this part of the page, as it is now. */
export const candidateRoots = (area: ParentNode) => [...area.querySelectorAll<HTMLElement>('[data-candidate]')];
