# 160926_fix_homebrew_install_docs

## Objective

Resolve [#433](https://github.com/romankurnovskii/BrewMate/issues/433): `brew install romankurnovskii/BrewMate/brewmate --cask` failed with `fatal: could not read Username for 'https://github.com'`, because the documented tap does not exist.

## Root Cause

- Upstream `README.md:49` documented `brew install romankurnovskii/BrewMate/brewmate --cask`.
- Homebrew auto-resolves that to the repo `romankurnovskii/homebrew-BrewMate`, which **does not exist** (`gh api repos/romankurnovskii/homebrew-BrewMate` → 404).
- Git reports a missing repository the same way it reports a private one; with `GIT_TERMINAL_PROMPT=0` it fails with `could not read Username for 'https://github.com'`.
- The cask is actually published in `romankurnovskii/homebrew-awesome-brew` (`Casks/brewmate.rb`).
- Introduced by `0ad8ff1 feat: add in-repo Homebrew cask support`, which switched the command to an in-repo tap path that was never created.

## Gap Analysis

- Docs are never validated in CI; nothing checks that documented taps/repos resolve.
- When the cask moved to the `awesome-brew` tap, the README kept a path assuming the `BrewMate` repo is itself a `homebrew-` tap.

## Fix

- `README.md` macOS Option 1 now installs from the existing tap:

  ```sh
  brew install romankurnovskii/awesome-brew/brewmate --cask
  ```

- Added a conditional trust note: `brew trust --cask romankurnovskii/awesome-brew/brewmate`.

## Verification

- `gh api repos/romankurnovskii/homebrew-BrewMate` → 404 (confirms the failing clone).
- `brew info --cask romankurnovskii/awesome-brew/brewmate` → resolves `1.0.40` from `homebrew-awesome-brew/Casks/brewmate.rb`.
- Tap cask `sha256 f948777c...` matches the released `BrewMate-1.0.40-universal.dmg` asset digest.
- `git grep` → no remaining `romankurnovskii/BrewMate/brewmate` or `romankurnovskii/cask/brewmate` references.

## Outcome

- ✅ Fix merged: [#441](https://github.com/romankurnovskii/BrewMate/pull/441), squash commit `de72acb` — `docs: fix Homebrew install instructions (#433)`
- ✅ CI green: `build-and-test`, `build-and-test-linux`, GitGuardian, Sourcery, CodeRabbit
- ✅ Issue #433 auto-closed; remote branch deleted

## Files Modified

- `README.md` — replaced the non-existent tap command, added the trust note (+5/-1)

## Integration Points

- No source code touched. The distributed cask is unchanged; only the documented install path was corrected to the tap that actually publishes it.

## Follow-ups

- Same stale command in sibling repos, fixed via separate PRs:
  - `romankurnovskii/brewmate-web` → PR [#13](https://github.com/romankurnovskii/brewmate-web/pull/13) (`frontend/src/App.tsx:717`)
  - `romankurnovskii/romankurnovskii.github.io` → PR [#201](https://github.com/romankurnovskii/romankurnovskii.github.io/pull/201) (`content/apps/brewmate/{en,ru}.mdx`, `public/md/apps/brewmate/{en,ru}.md`)

## Known Gaps (Out of Scope)

- Docs link/command validation is not automated; a CI check would prevent this class of regression. Candidate for a separate task.
