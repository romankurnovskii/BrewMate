// Tests for PTY manager (interactive cask upgrades with sudo support)
import { ipcMain, BrowserWindow } from 'electron';

// Mock node-pty - each spawn creates a new mock instance
const mockPtyInstances: Array<{
  onData: jest.Mock;
  onExit: jest.Mock;
  write: jest.Mock;
  kill: jest.Mock;
  _triggerData: (data: string) => void;
  _triggerExit: (code: number) => void;
}> = [];

jest.mock('node-pty', () => ({
  spawn: jest.fn(() => {
    const onDataCallbacks: Array<(data: string) => void> = [];
    const onExitCallbacks: Array<(data: { exitCode: number }) => void> = [];

    const instance = {
      onData: jest.fn((cb: (data: string) => void) => { onDataCallbacks.push(cb); }),
      onExit: jest.fn((cb: (data: { exitCode: number }) => void) => { onExitCallbacks.push(cb); }),
      write: jest.fn(),
      kill: jest.fn(),
      _triggerData: (data: string) => onDataCallbacks.forEach(cb => cb(data)),
      _triggerExit: (code: number) => onExitCallbacks.forEach(cb => cb({ exitCode: code })),
    };
    mockPtyInstances.push(instance);
    return instance;
  }),
}));

// Mock BrowserWindow
const mockSend = jest.fn();
jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn(() => [
      { webContents: { send: mockSend } },
    ]),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
  },
}));

function getLastPtyInstance() {
  return mockPtyInstances[mockPtyInstances.length - 1];
}

describe('PTY Manager', () => {
  // Load module once
  const ptyManager = require('../ptyManager');

  beforeEach(() => {
    jest.clearAllMocks();
    mockPtyInstances.length = 0;
    // Ensure clean state by killing any active PTY
    try { ptyManager.killPty(); } catch (e) { /* ignore */ }
  });

  it('should be importable without errors', () => {
    expect(ptyManager).toBeDefined();
    expect(typeof ptyManager.setupPtyIpcHandlers).toBe('function');
    expect(typeof ptyManager.startCaskUpgradePty).toBe('function');
    expect(typeof ptyManager.writeToPty).toBe('function');
    expect(typeof ptyManager.isPtyActive).toBe('function');
    expect(typeof ptyManager.killPty).toBe('function');
  });

  it('should set up IPC handlers when setupPtyIpcHandlers is called', () => {
    jest.clearAllMocks();
    ptyManager.setupPtyIpcHandlers();

    expect(ipcMain.handle).toHaveBeenCalledWith('upgrade-cask-pty', expect.any(Function));
    expect(ipcMain.on).toHaveBeenCalledWith('pty-input', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('is-pty-active', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('kill-pty', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('open-external-terminal', expect.any(Function));
  });

  it('should start a PTY and forward pty-data, sudo detection, and pty-exit', async () => {
    const promise = ptyManager.startCaskUpgradePty('test-cask');
    const mockPty = getLastPtyInstance();
    expect(mockPty).toBeDefined();

    // Simulate normal output before sudo prompt
    mockPty._triggerData('==> Downloading test-cask...\n');
    expect(mockSend).toHaveBeenCalledWith('pty-data', '==> Downloading test-cask...\n');

    // Simulate sudo error output
    mockPty._triggerData('sudo: a terminal is required to read the password\n');

    // Verify renderer got cask-sudo-required AND pty-data
    expect(mockSend).toHaveBeenCalledWith('cask-sudo-required', 'test-cask');
    expect(mockSend).toHaveBeenCalledWith('pty-data', 'sudo: a terminal is required to read the password\n');

    // Simulate exit
    mockPty._triggerExit(1);

    // Verify pty-exit was sent with correct payload
    expect(mockSend).toHaveBeenCalledWith('pty-exit', { cask: 'test-cask', code: 1 });

    const result = await promise;
    expect(result.code).toBe(1);
  });

  it('should feed keystrokes to PTY', () => {
    ptyManager.startCaskUpgradePty('test-cask');
    const mockPty = getLastPtyInstance();
    expect(mockPty).toBeDefined();

    // Write a password
    ptyManager.writeToPty('mypassword\n');

    expect(mockPty.write).toHaveBeenCalledWith('mypassword\n');

    // Cleanup - simulate exit so activePty is freed
    mockPty._triggerExit(0);
  });

  it('should not write to PTY when none is active', () => {
    // Should not throw
    expect(() => ptyManager.writeToPty('test')).not.toThrow();
  });

  it('should kill active PTY', () => {
    ptyManager.startCaskUpgradePty('test-cask');
    const mockPty = getLastPtyInstance();
    expect(mockPty).toBeDefined();

    ptyManager.killPty();
    expect(mockPty.kill).toHaveBeenCalled();
  });

  it('should check if PTY is active', () => {
    // Initially no PTY
    expect(ptyManager.isPtyActive()).toBe(false);

    // After starting
    ptyManager.startCaskUpgradePty('test-cask');
    expect(ptyManager.isPtyActive()).toBe(true);

    // Simulate exit to reset state
    const mockPty = getLastPtyInstance();
    mockPty._triggerExit(0);

    expect(ptyManager.isPtyActive()).toBe(false);
  });

  it('should reject concurrent PTY start', async () => {
    ptyManager.startCaskUpgradePty('first-cask');
    await expect(ptyManager.startCaskUpgradePty('second-cask')).rejects.toThrow(
      'Another upgrade is already in progress'
    );

    // Cleanup
    const mockPty = getLastPtyInstance();
    mockPty._triggerExit(0);
  });

  it('open-external-terminal soft-fails with a clear message on non-darwin', async () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'linux' });

    jest.clearAllMocks();
    ptyManager.setupPtyIpcHandlers();
    const handleCalls = (ipcMain.handle as jest.Mock).mock.calls;
    const openExternalCall = handleCalls.find(
      (call: unknown[]) => call[0] === 'open-external-terminal'
    );
    expect(openExternalCall).toBeDefined();
    const handler = openExternalCall[1] as (event: unknown, cask: string) => Promise<void>;

    await expect(handler({}, 'some-cask')).rejects.toThrow(
      /only supported on macOS|in-app terminal/i
    );

    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
  });
});
