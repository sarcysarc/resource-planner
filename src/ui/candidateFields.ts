// Static markup only: no user data goes into this string. The legend is set as text.
const FIELDS = `
  <legend></legend>
  <label>Current form <select name="form"></select></label>
  <div class="row">
    <label>Attack IV <input name="atk" type="number" min="0" max="15" inputmode="numeric" /></label>
    <label>Defense IV <input name="def" type="number" min="0" max="15" inputmode="numeric" /></label>
    <label>HP IV <input name="hp" type="number" min="0" max="15" inputmode="numeric" /></label>
  </div>
  <div class="row">
    <label>Level <input name="level" type="number" min="1" max="50" step="0.5" inputmode="decimal" /></label>
    <label>or CP <input name="cp" type="number" min="10" inputmode="numeric" /></label>
  </div>
  <label>Type
    <select name="variant">
      <option value="normal">Normal</option>
      <option value="shadow">Shadow</option>
      <option value="purified">Purified</option>
    </select>
  </label>
  <label class="check"><input type="checkbox" name="lucky" /> Lucky</label>
  <label class="check"><input type="checkbox" name="bestBuddy" /> Best Buddy</label>
  <label class="check"><input type="checkbox" name="secondMove" /> Second charged move unlocked</label>
  <label>Candy to evolve <input name="evolveCandy" type="number" min="0" value="0" inputmode="numeric" /></label>
`;

/** Fills a `[data-candidate]` fieldset with the candidate inputs, titled by `data-legend`. */
export function buildCandidateFields(fieldset: HTMLElement): void {
  fieldset.innerHTML = FIELDS;
  fieldset.querySelector('legend')!.textContent = fieldset.dataset.legend ?? '';
}
