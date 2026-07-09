/**
 * Tests for configuration file changes introduced in this PR:
 * - .gitignore: Added memory-bank/ pattern
 * - electron-builder.yml: Removed node_modules exclusion pattern (node_modules now bundled in ASAR)
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.join(__dirname, '../../..');
const GITIGNORE_PATH = path.join(REPO_ROOT, '.gitignore');
const ELECTRON_BUILDER_PATH = path.join(REPO_ROOT, 'electron-builder.yml');

// ---------------------------------------------------------------------------
// .gitignore
// ---------------------------------------------------------------------------

describe('.gitignore', () => {
  let lines: string[];

  beforeAll(() => {
    const content = fs.readFileSync(GITIGNORE_PATH, 'utf8');
    lines = content.split('\n').map((l) => l.replace(/\r$/, '')); // normalise CRLF
  });

  it('should contain the .memory-bank/ pattern added in this PR', () => {
    expect(lines).toContain('.memory-bank/');
  });

  it('should have .memory-bank/ as a standalone entry (exact line match)', () => {
    const matchingLines = lines.filter((l) => l.trim() === '.memory-bank/');
    expect(matchingLines).toHaveLength(1);
  });

  it('.memory-bank/ pattern should use the trailing-slash directory syntax', () => {
    const entry = lines.find((l) => l.trim() === '.memory-bank/');
    expect(entry).toBeDefined();
    // Gitignore directory patterns end with '/'
    expect(entry!.endsWith('/')).toBe(true);
  });

  it('should still ignore node_modules/ (regression – pre-existing entry)', () => {
    expect(lines).toContain('node_modules/');
  });

  it('should still ignore dist/ (regression – pre-existing entry)', () => {
    expect(lines).toContain('dist/');
  });

  it('.memory-bank/ should appear only once (no duplicate entries)', () => {
    const count = lines.filter((l) => l.trim() === '.memory-bank/').length;
    expect(count).toBe(1);
  });

  it('should not have a blank line inserted between .memory-bank/ and the previous entry', () => {
    const idx = lines.findIndex((l) => l.trim() === '.memory-bank/');
    expect(idx).toBeGreaterThan(0);
    // The line directly before should not be another .memory-bank/ and should exist
    const previous = lines[idx - 1];
    expect(previous).toBeDefined();
    expect(previous.trim()).not.toBe('.memory-bank/');
  });

  it('should be readable as a UTF-8 text file without errors', () => {
    expect(() => fs.readFileSync(GITIGNORE_PATH, 'utf8')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// electron-builder.yml – files section
// ---------------------------------------------------------------------------

describe('electron-builder.yml', () => {
  let content: string;
  let lines: string[];

  beforeAll(() => {
    content = fs.readFileSync(ELECTRON_BUILDER_PATH, 'utf8');
    lines = content.split('\n').map((l) => l.replace(/\r$/, ''));
  });

  // -- Change introduced in this PR ------------------------------------------

  it('should NOT contain the !**/node_modules/**/* exclusion pattern', () => {
    // This exclusion was removed so that node_modules are bundled in the ASAR
    const hasExclusion = lines.some((l) => l.includes('!**/node_modules/**/*'));
    expect(hasExclusion).toBe(false);
  });

  it('node_modules should not be excluded anywhere in the files section', () => {
    // Any variant that explicitly excludes node_modules would break the bundle
    const nodeModulesExclusionPattern = /!\*\*\/node_modules/;
    const hasAnyNodeModulesExclusion = lines.some((l) =>
      nodeModulesExclusionPattern.test(l)
    );
    expect(hasAnyNodeModulesExclusion).toBe(false);
  });

  // -- Regressions: existing file patterns should be preserved ---------------

  it('should include dist/**/* in the files section', () => {
    const hasDistPattern = lines.some((l) => l.trim() === "- 'dist/**/*'");
    expect(hasDistPattern).toBe(true);
  });

  it('should include locales/**/* in the files section', () => {
    const hasLocalesPattern = lines.some((l) => l.trim() === "- 'locales/**/*'");
    expect(hasLocalesPattern).toBe(true);
  });

  it('should include package.json in the files section', () => {
    const hasPackageJson = lines.some((l) => l.trim() === "- 'package.json'");
    expect(hasPackageJson).toBe(true);
  });

  it('should still exclude src files via !**/src/**/*', () => {
    const hasSrcExclusion = lines.some((l) => l.includes('!**/src/**/*'));
    expect(hasSrcExclusion).toBe(true);
  });

  it('should still exclude .DS_Store and git metadata files', () => {
    const hasDsStoreExclusion = lines.some(
      (l) => l.includes('.DS_Store') && l.includes('!')
    );
    expect(hasDsStoreExclusion).toBe(true);
  });

  it('should still exclude common build/tool config files', () => {
    const hasBuildExclusion = lines.some((l) => l.includes('appveyor.yml'));
    expect(hasBuildExclusion).toBe(true);
  });

  // -- ASAR bundling configuration -------------------------------------------

  it('should have asar set to true so node_modules are bundled correctly', () => {
    const asarLine = lines.find((l) => l.trim().startsWith('asar:'));
    expect(asarLine).toBeDefined();
    expect(asarLine!.trim()).toBe('asar: true');
  });

  // -- General file integrity -------------------------------------------------

  it('should be readable as a UTF-8 text file without errors', () => {
    expect(() => fs.readFileSync(ELECTRON_BUILDER_PATH, 'utf8')).not.toThrow();
  });

  it('should start with the directories section (valid YAML structure check)', () => {
    const firstNonEmpty = lines.find((l) => l.trim().length > 0);
    expect(firstNonEmpty).toBe('directories:');
  });

  it('should define the output directory as dist-app', () => {
    const hasOutputDir = lines.some((l) => l.trim() === 'output: dist-app');
    expect(hasOutputDir).toBe(true);
  });

  it('should define the appId as com.app.brewmate', () => {
    const hasAppId = lines.some((l) => l.trim() === 'appId: com.app.brewmate');
    expect(hasAppId).toBe(true);
  });
});
