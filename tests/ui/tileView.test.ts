// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildTile, isMarked, setThumb, showProblem, showSuggestion, showTile } from '../../src/ui/tileView';

describe('tile view', () => {
  it('builds a tile with its own Current and Transfer controls', () => {
    const tile = buildTile(document, 't3');
    expect(tile.dataset.tile).toBe('t3');
    expect(tile.querySelector<HTMLInputElement>('input[type="radio"]')).toMatchObject({ name: 'currentTile', value: 't3' });
    expect(isMarked(tile)).toBe(false);
    tile.querySelector<HTMLInputElement>('[data-transfer]')!.checked = true;
    expect(isMarked(tile)).toBe(true);
  });

  it('shows the title and a note per gap', () => {
    const tile = buildTile(document, 't1');
    showTile(tile, { title: 'Ivysaur, CP 900, IVs 15/14/13', notes: ['Add its appraisal for the IVs.'] });
    expect(tile.querySelector('[data-title]')!.textContent).toBe('Ivysaur, CP 900, IVs 15/14/13');
    expect([...tile.querySelectorAll('[data-notes] li')].map((li) => li.textContent)).toEqual(['Add its appraisal for the IVs.']);
  });

  // Issue #10: what stops the comparison stands apart from the optional notes.
  it('shows and hides what stops it being compared, apart from its notes', () => {
    const tile = buildTile(document, 't1');
    showProblem(tile, 'No level gives CP 437 with those IVs');
    const problem = tile.querySelector<HTMLElement>('[data-problem]')!;
    expect([problem.hidden, problem.textContent, tile.classList.contains('problem')]).toEqual([false, 'No level gives CP 437 with those IVs', true]);
    expect(problem.closest('[data-notes]')).toBeNull();
    showProblem(tile, undefined);
    expect([problem.hidden, tile.classList.contains('problem')]).toEqual([true, false]);
  });

  it('shows and hides the transfer suggestion', () => {
    const tile = buildTile(document, 't1');
    const could = tile.querySelector<HTMLElement>('[data-could]')!;
    showSuggestion(tile, 'Not the best for any kind of battle.');
    expect([could.hidden, could.textContent]).toEqual([false, 'Could transfer. Not the best for any kind of battle.']);
    showSuggestion(tile, undefined);
    expect(could.hidden).toBe(true);
  });

  it('shows a thumbnail only when there is one', () => {
    const tile = buildTile(document, 't1');
    const img = tile.querySelector('img')!;
    expect(img.hidden).toBe(true);
    setThumb(tile, 'data:image/jpeg;base64,AA');
    expect([img.hidden, img.getAttribute('src')]).toEqual([false, 'data:image/jpeg;base64,AA']);
  });
});
