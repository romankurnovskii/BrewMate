import { filterUpgradeScope, buildUpgradeTargets, upgradeTargetKey } from '../upgrade';

describe('upgrade scope helpers', () => {
  const outdated = [
    { name: 'visual-studio-code', type: 'cask' as const },
    { name: 'node', type: 'formula' as const },
    { name: 'pgadmin4', type: 'cask' as const },
    { name: 'python', type: 'formula' as const },
  ];

  describe('filterUpgradeScope', () => {
    it('returns every package unchanged (in order) for scope "all"', () => {
      const result = filterUpgradeScope(outdated, 'all');
      expect(result).toEqual(outdated);
    });

    it('returns a new array for scope "all" (does not mutate or alias input)', () => {
      const result = filterUpgradeScope(outdated, 'all');
      expect(result).not.toBe(outdated);
      expect(outdated).toHaveLength(4);
    });

    it('returns only casks for scope "cask"', () => {
      const result = filterUpgradeScope(outdated, 'cask');
      expect(result).toEqual([
        { name: 'visual-studio-code', type: 'cask' },
        { name: 'pgadmin4', type: 'cask' },
      ]);
    });

    it('returns only formulas for scope "formula"', () => {
      const result = filterUpgradeScope(outdated, 'formula');
      expect(result).toEqual([
        { name: 'node', type: 'formula' },
        { name: 'python', type: 'formula' },
      ]);
    });

    it('handles an empty input list', () => {
      expect(filterUpgradeScope([], 'all')).toEqual([]);
      expect(filterUpgradeScope([], 'cask')).toEqual([]);
      expect(filterUpgradeScope([], 'formula')).toEqual([]);
    });

    it('does not mutate the input list', () => {
      const snapshot = JSON.stringify(outdated);
      filterUpgradeScope(outdated, 'cask');
      expect(JSON.stringify(outdated)).toBe(snapshot);
    });
  });

  describe('upgradeTargetKey', () => {
    it('builds a composite key from type and name', () => {
      expect(upgradeTargetKey({ name: 'node', type: 'formula' })).toBe('formula:node');
      expect(upgradeTargetKey({ name: 'visual-studio-code', type: 'cask' })).toBe(
        'cask:visual-studio-code'
      );
    });
  });

  describe('buildUpgradeTargets', () => {
    it('returns only the selected packages that exist in the outdated list, in list order', () => {
      const selected = new Set(['formula:node', 'cask:pgadmin4']);
      const result = buildUpgradeTargets(outdated, selected);
      expect(result).toEqual([
        { name: 'node', type: 'formula' },
        { name: 'pgadmin4', type: 'cask' },
      ]);
    });

    it('skips selected keys that are not present in the current outdated list (stale keys)', () => {
      const selected = new Set(['formula:node', 'cask:gone', 'formula:also-gone']);
      const result = buildUpgradeTargets(outdated, selected);
      expect(result).toEqual([{ name: 'node', type: 'formula' }]);
    });

    it('returns an empty array when nothing is selected', () => {
      expect(buildUpgradeTargets(outdated, new Set<string>())).toEqual([]);
    });

    it('returns an empty array when every selected key is stale', () => {
      const selected = new Set(['cask:nope', 'formula:also-nope']);
      expect(buildUpgradeTargets(outdated, selected)).toEqual([]);
    });

    it('does not mutate the input list', () => {
      const snapshot = JSON.stringify(outdated);
      buildUpgradeTargets(outdated, new Set(['formula:node']));
      expect(JSON.stringify(outdated)).toBe(snapshot);
    });
  });
});
