# September 2026 Tasks

## Tasks Completed

### 2026-09-16: Fix Homebrew Install Instructions

- Root cause: README documented `brew install romankurnovskii/BrewMate/brewmate --cask`, which makes Homebrew clone the non-existent `romankurnovskii/homebrew-BrewMate` repo (404), surfacing as `could not read Username for 'https://github.com'`.
- Fixed `README.md` to install from the existing, auto-updated `romankurnovskii/homebrew-awesome-brew` tap, plus a conditional `brew trust` note.
- Verified the tap cask resolves to 1.0.40 and its sha256 matches the released universal DMG.
- Merged as [#441](https://github.com/romankurnovskii/BrewMate/pull/441) (squash `de72acb`); issue #433 closed.
- Sibling-repo docs fixed via `brewmate-web#13` and `romankurnovskii.github.io#201`.
- See: [160926_fix_homebrew_install_docs.md](./160926_fix_homebrew_install_docs.md)
