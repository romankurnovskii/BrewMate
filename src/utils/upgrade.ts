/**
 * Pure helpers for scoped/selected package upgrades.
 *
 * These functions operate on the minimal shape shared by the renderer's
 * `OutdatedApp` and the main process `upgrade-all` handler:
 * `{ name: string; type: 'cask' | 'formula' }`.
 *
 * Note: `src/utils/format.ts` mirrors `truncateVersion` inside the renderer
 * (`src/renderer/renderer.ts`) because the renderer is compiled as an
 * import-free standalone script (tsconfig.renderer.json, `module: none`).
 * The same pattern applies here — the renderer keeps an inline copy of the
 * tiny filter logic below; this module is the tested source of truth.
 */

export interface UpgradeTarget {
  name: string;
  type: 'cask' | 'formula';
}

export type UpgradeScope = 'all' | 'cask' | 'formula';

/**
 * Composite key identifying a package: `"cask:visual-studio-code"`.
 */
export function upgradeTargetKey(target: UpgradeTarget): string {
  return `${target.type}:${target.name}`;
}

/**
 * Returns only the packages that fall inside `scope`. `'all'` is a non-mutating
 * passthrough of the full list (new array, same order).
 */
export function filterUpgradeScope(
  outdated: Array<UpgradeTarget>,
  scope: UpgradeScope
): Array<UpgradeTarget> {
  if (scope === 'all') {
    return outdated.filter(() => true);
  }
  return outdated.filter((app) => app.type === scope);
}

/**
 * Resolves a set of selected composite keys against the current outdated list.
 *
 * The result preserves the "outdated list" order and only includes keys that are
 * still present in the list, so stale selections (from packages that were already
 * upgraded between renders) are never sent to the `upgrade-all` IPC handler.
 */
export function buildUpgradeTargets(
  outdated: Array<UpgradeTarget>,
  selectedKeys: Set<string>
): Array<UpgradeTarget> {
  return outdated.filter((app) => selectedKeys.has(upgradeTargetKey(app)));
}
