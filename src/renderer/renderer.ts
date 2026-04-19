// Uses window.electronAPI exposed via contextBridge

// Inline constants to avoid CommonJS exports issue
const CATEGORIES = [
  'All',
  'Installed',
  'Business',
  'Photo/Video',
  'Graphic/Design',
  'Social',
  'Menubar',
  'Developer Tools',
  'Wallets/Crypto',
  'Productivity',
  'Music',
  'Education',
  'Reference',
  'Games',
  'Health/Fitness',
  'News',
  'Utilities',
  'Other',
];

const VIRTUAL_SCROLL_CONFIG = {
  rowHeight: 220,
  bufferRows: 5,
  debounceMs: 300,
  scrollThrottleMs: 50,
  scrollThreshold: 50,
};

// App type definition
interface App {
  name: string;
  description: string;
  homepage: string;
  version: string;
  type: 'cask' | 'formula';
  _category?: string;
  _nameLower?: string;
  _descLower?: string;
  _homeLower?: string;
}

// Immediate console log to verify script is loading
console.log('[Renderer] renderer.ts script loaded');

const ipcRenderer = (window as any).electronAPI;
console.log('[Renderer] ipcRenderer loaded:', !!ipcRenderer);

// State
let allApps: Array<App> = [];
let installedApps = new Set<string>();
let filteredApps: Array<App> = [];
let selectedCategory = 'All';
let selectedType: 'All' | 'cask' | 'formula' = 'All';
let searchTerm = '';
let terminalVisible = false;
let commandToRun: string | null = null;
let isLoading = true;
let terminalPrompt = 'user@brewmate ~ %';

// Virtual scrolling state
let visibleStartIndex = 0;
let visibleEndIndex = 0;
let itemsPerRow = 4;
let rowHeight = VIRTUAL_SCROLL_CONFIG.rowHeight;
let bufferRows = VIRTUAL_SCROLL_CONFIG.bufferRows;
let debounceTimer: NodeJS.Timeout | null = null;
let scrollDebounceTimer: NodeJS.Timeout | null = null;
let lastScrollTop = 0;

// DOM elements - will be initialized in init()
let searchInput: HTMLInputElement;
let categoryChips: HTMLElement;
let typeFilter: HTMLElement;
let appsGrid: HTMLElement;
let terminalContainer: HTMLElement;
let terminalOutput: HTMLElement;
let terminalToggle: HTMLButtonElement;
let terminalToggleIcon: HTMLElement | null;
let appCount: HTMLElement;
let loadingMessage: HTMLElement;
let logPath: HTMLElement;

// Initialize
function init(): void {
  // Get DOM elements
  searchInput = document.getElementById('searchInput') as HTMLInputElement;
  categoryChips = document.getElementById('categoryChips') as HTMLElement;
  typeFilter = document.getElementById('typeFilter') as HTMLElement;
  appsGrid = document.getElementById('appsGrid') as HTMLElement;
  terminalContainer = document.getElementById('terminalContainer') as HTMLElement;
  terminalOutput = document.getElementById('terminalOutput') as HTMLElement;
  terminalToggle = document.getElementById('terminalToggle') as HTMLButtonElement;
  terminalToggleIcon = document.getElementById('terminalToggleIcon') as HTMLElement | null;
  appCount = document.getElementById('appCount') as HTMLElement;
  loadingMessage = document.getElementById('loadingMessage') as HTMLElement;
  logPath = document.getElementById('logPath') as HTMLElement;

  const versionInfo = document.getElementById('versionInfo') as HTMLElement;

  // Check if all required elements exist
  if (
    !searchInput ||
    !categoryChips ||
    !typeFilter ||
    !appsGrid ||
    !terminalContainer ||
    !terminalOutput ||
    !terminalToggle ||
    !appCount ||
    !loadingMessage
  ) {
    console.error('Missing required DOM elements:', {
      searchInput: !!searchInput,
      categoryChips: !!categoryChips,
      typeFilter: !!typeFilter,
      appsGrid: !!appsGrid,
      terminalContainer: !!terminalContainer,
      terminalOutput: !!terminalOutput,
      terminalToggle: !!terminalToggle,
      appCount: !!appCount,
      loadingMessage: !!loadingMessage,
    });
    return;
  }

  // Check if ipcRenderer is available
  if (!ipcRenderer) {
    console.error('ipcRenderer is not available');
    return;
  }

  // Initialize terminal output
  terminalOutput.textContent = `Welcome to BrewMate terminal.\nLast login: ${new Date().toLocaleString()}\n`;

  // Load version info
  if (versionInfo && ipcRenderer) {
    ipcRenderer.send('get-version-info');
  }

  console.log('Initializing BrewMate...');
  setupEventListeners();
  loadData();
  renderCategories();
}

function setupEventListeners(): void {
  // Search with debouncing
  searchInput.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    searchTerm = value.trim();
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      visibleStartIndex = 0;
      appsGrid.scrollTop = 0;
      filterApps();
    }, VIRTUAL_SCROLL_CONFIG.debounceMs);
  });

  // Virtual scrolling - handle scroll with throttling
  appsGrid.addEventListener(
    'scroll',
    () => {
      const currentScrollTop = appsGrid.scrollTop;
      if (Math.abs(currentScrollTop - lastScrollTop) > VIRTUAL_SCROLL_CONFIG.scrollThreshold) {
        lastScrollTop = currentScrollTop;
        if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
        scrollDebounceTimer = setTimeout(() => {
          updateVisibleItems();
        }, VIRTUAL_SCROLL_CONFIG.scrollThrottleMs);
      }
    },
    { passive: true }
  );

  // Calculate items per row on resize
  window.addEventListener('resize', () => {
    calculateItemsPerRow();
    updateVisibleItems();
  });

  calculateItemsPerRow();

  // Type filter buttons
  typeFilter.querySelectorAll('.type-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedType = (btn as HTMLElement).dataset.type as 'All' | 'cask' | 'formula';
      document.querySelectorAll('.type-toggle').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      visibleStartIndex = 0;
      appsGrid.scrollTop = 0;
      filterApps();
    });
  });

  // Brew command buttons
  document.querySelectorAll('.brew-command-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const command = (btn as HTMLElement).dataset.command;
      if (command) runCommand(command);
    });
  });

  // Keyboard shortcuts - Cmd+J to toggle terminal
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
      e.preventDefault();
      console.log('[Renderer] Cmd+J pressed in renderer');
      toggleTerminal();
    }
  });

  // Terminal toggle button
  terminalToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTerminal();
  });

  // IPC listeners
  if (!ipcRenderer) {
    console.error('[Renderer] Cannot setup IPC listeners - ipcRenderer not available');
    return;
  }

  ipcRenderer.on('toggle-terminal', toggleTerminal);
  ipcRenderer.on('terminal-output', (_event: any, data: string) => {
    terminalOutput.appendChild(document.createTextNode(data));
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  });
  ipcRenderer.on('all-apps', (_event: any, apps: Array<App>) => {
    console.log('[Renderer] Received all-apps:', apps.length);
    allApps = apps;
    isLoading = false;
    filterApps();
    setTimeout(() => {
      updateVisibleItems();
    }, 100);
  });
  ipcRenderer.on(
    'installed-apps',
    (_event: any, apps: Array<{ name: string; type: string }>) => {
      installedApps = new Set(apps.map((app) => app.name));
      renderCategories();
      if (filteredApps.length > 0) {
        updateVisibleItems();
      } else {
        filterApps();
      }
    }
  );
  ipcRenderer.on(
    'install-complete',
    (_event: any, { appName, success }: { appName: string; success: boolean }) => {
      if (success) {
        installedApps.add(appName);
        renderCategories();
        filterApps();
      }
    }
  );
  ipcRenderer.on(
    'uninstall-complete',
    (_event: any, { appName, success }: { appName: string; success: boolean }) => {
      if (success) {
        installedApps.delete(appName);
        renderCategories();
        filterApps();
      }
    }
  );
  ipcRenderer.on(
    'loading-status',
    (_event: any, { loading, message }: { loading: boolean; message?: string }) => {
      console.log('[Renderer] Loading status:', loading, message);
      isLoading = loading;
      if (loadingMessage) {
        loadingMessage.textContent = message || 'Loading...';
      }
      if (loading) {
        if (!appsGrid.querySelector('.loading')) {
          appsGrid.replaceChildren();

          const loadingDiv = document.createElement('div');
          loadingDiv.className = 'loading';

          const spinnerDiv = document.createElement('div');
          spinnerDiv.className = 'loading-spinner';

          const msgDiv = document.createElement('div');
          msgDiv.className = 'loading-message';
          msgDiv.textContent = message || 'Loading apps...';

          loadingDiv.appendChild(spinnerDiv);
          loadingDiv.appendChild(msgDiv);
          appsGrid.appendChild(loadingDiv);
        }
      }
    }
  );
  ipcRenderer.on('all-apps-updated', (_event: any, apps: Array<App>) => {
    allApps = apps;
    isLoading = false;
    filterApps();
    if (loadingMessage) {
      loadingMessage.textContent = 'Apps updated';
    }
  });
  ipcRenderer.on(
    'terminal-prompt-info',
    (
      _event: any,
      { username, hostname, dir }: { username: string; hostname: string; dir: string }
    ) => {
      terminalPrompt = `${username}@${hostname} ${dir} %`;
    }
  );

  // Get log file path on startup
  ipcRenderer.on('log-path', (_event: any, logFilePath: string) => {
    console.log('[Renderer] Log file location:', logFilePath);
    if (logPath) {
      logPath.textContent = `Logs: ${logFilePath}`;
    }
  });

  ipcRenderer.on(
    'version-info',
    (_event: any, versionData: { version: string; commit?: string }) => {
      const versionInfo = document.getElementById('versionInfo');
      if (versionInfo) {
        let versionText = `v${versionData.version}`;
        if (versionData.commit) {
          versionText += ` (${versionData.commit.substring(0, 7)})`;
        }
        versionInfo.textContent = versionText;
      }
    }
  );
}

function loadData(): void {
  console.log('[Renderer] Loading data...');
  console.log('[Renderer] ipcRenderer available:', !!ipcRenderer);

  if (!ipcRenderer) {
    console.error('[Renderer] ipcRenderer is not available - cannot load data');
    if (loadingMessage) {
      loadingMessage.textContent = 'Error: Cannot connect to main process';
    }
    return;
  }

  try {
    console.log('[Renderer] Sending get-all-apps');
    ipcRenderer.send('get-all-apps');

    console.log('[Renderer] Sending get-installed-apps');
    ipcRenderer.send('get-installed-apps');

    console.log('[Renderer] IPC messages sent successfully');
  } catch (error: any) {
    console.error('[Renderer] Error sending IPC messages:', error);
    if (loadingMessage) {
      loadingMessage.textContent = `Error: Cannot connect to main process - ${error.message}`;
    }
  }
}

function renderCategories(): void {
  categoryChips.replaceChildren();

  CATEGORIES.forEach((cat) => {
    const isInstalled = cat === 'Installed';
    const isActive = selectedCategory === cat;

    const btn = document.createElement('button');
    btn.className = `category-chip ${isInstalled ? 'installed-category' : ''} ${isActive ? 'active' : ''}`;
    btn.dataset.category = cat;
    btn.textContent = `${cat}${isInstalled ? ' (' + installedApps.size + ')' : ''}`;

    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.category || 'All';
      document.querySelectorAll('.category-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      visibleStartIndex = 0;
      appsGrid.scrollTop = 0;
      filterApps();
    });

    categoryChips.appendChild(btn);
  });
}

function getCategoryForApp(app: App): string {
  const desc = (app.description || '').toLowerCase();
  const name = (app.name || '').toLowerCase();
  const text = desc + ' ' + name;

  if (
    text.includes('developer') ||
    text.includes('code') ||
    text.includes('git') ||
    text.includes('terminal')
  ) {
    return 'Developer Tools';
  }
  if (
    text.includes('photo') ||
    text.includes('video') ||
    text.includes('image') ||
    text.includes('media')
  ) {
    return 'Photo/Video';
  }
  if (text.includes('design') || text.includes('graphic') || text.includes('draw')) {
    return 'Graphic/Design';
  }
  if (text.includes('music') || text.includes('audio') || text.includes('sound')) {
    return 'Music';
  }
  if (text.includes('productivity') || text.includes('note') || text.includes('todo')) {
    return 'Productivity';
  }
  if (text.includes('social') || text.includes('chat') || text.includes('message')) {
    return 'Social';
  }
  if (text.includes('business') || text.includes('email') || text.includes('finance')) {
    return 'Business';
  }
  if (text.includes('game') || text.includes('play')) {
    return 'Games';
  }
  if (text.includes('utility') || text.includes('tool') || text.includes('manager')) {
    return 'Utilities';
  }
  return 'Other';
}

function calculateItemsPerRow(): void {
  const gridWidth = appsGrid.offsetWidth;
  itemsPerRow = Math.max(1, Math.floor(gridWidth / 304));
}

function filterApps(): void {
  if (isLoading && allApps.length === 0) {
    return;
  }

  requestAnimationFrame(() => {
    // Move invariant search transformation outside the loop
    const searchLower = (searchTerm || '').toLowerCase();
    const isSearching = searchLower.length > 0;

    // Reset filtered apps before filtering
    filteredApps = [];

    // Filter array without creating closures/IIFEs per item
    filteredApps = allApps.filter((app) => {
      // 1. Type check (fastest)
      if (selectedType !== 'All' && app.type !== selectedType) {
        return false;
      }

      // 2. Category check
      if (selectedCategory === 'Installed') {
        if (!installedApps.has(app.name)) return false;
      } else if (selectedCategory !== 'All') {
        // Cache calculated category
        if (!app._category) {
          app._category = getCategoryForApp(app);
        }
        if (app._category !== selectedCategory) return false;
      }

      // 3. Search check (slowest string operations)
      if (isSearching) {
        if (!app._nameLower) app._nameLower = (app.name || '').toLowerCase();
        if (app._nameLower.includes(searchLower)) return true;

        if (!app._descLower) app._descLower = (app.description || '').toLowerCase();
        if (app._descLower.includes(searchLower)) return true;

        if (!app._homeLower) app._homeLower = (app.homepage || '').toLowerCase();
        if (app._homeLower.includes(searchLower)) return true;

        return false;
      }

      return true;
    });

    // Reset scroll position and visible items when filtering
    visibleStartIndex = 0;
    visibleEndIndex = 0;
    appsGrid.scrollTop = 0;

    // Update display
    updateVisibleItems();
    appCount.textContent = filteredApps.length.toString();
  });
}

function updateVisibleItems(): void {
  // If no filtered apps, ensure renderApps handles empty state
  if (filteredApps.length === 0) {
    renderApps();
    return;
  }

  const scrollTop = appsGrid.scrollTop;
  const containerHeight = appsGrid.clientHeight || appsGrid.offsetHeight;

  const totalRows = Math.ceil(filteredApps.length / itemsPerRow);
  const viewportRows = Math.ceil(containerHeight / rowHeight);

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
  const endRow = Math.min(totalRows, startRow + viewportRows + bufferRows * 2);

  visibleStartIndex = Math.max(0, startRow * itemsPerRow);
  visibleEndIndex = Math.min(filteredApps.length, endRow * itemsPerRow);

  renderApps();
}

function renderApps(): void {
  // Clear the grid first to prevent showing old apps
  if (isLoading && allApps.length === 0) {
    appsGrid.replaceChildren();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';

    const spinnerDiv = document.createElement('div');
    spinnerDiv.className = 'loading-spinner';

    const msgDiv = document.createElement('div');
    msgDiv.className = 'loading-message';
    msgDiv.textContent = 'Loading apps from Homebrew...';

    loadingDiv.appendChild(spinnerDiv);
    loadingDiv.appendChild(msgDiv);
    appsGrid.appendChild(loadingDiv);
    return;
  }

  // Show empty state when no filtered apps (but apps are loaded)
  if (filteredApps.length === 0 && allApps.length > 0) {
    appsGrid.replaceChildren();
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No apps found matching your criteria.';
    appsGrid.appendChild(emptyState);
    // Reset scroll position
    appsGrid.scrollTop = 0;
    return;
  }

  if (filteredApps.length === 0 && allApps.length === 0 && !isLoading) {
    appsGrid.replaceChildren();
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No apps available. Please check your connection.';
    appsGrid.appendChild(emptyState);
    appsGrid.scrollTop = 0;
    return;
  }

  // Calculate visible items and render
  const visibleApps = filteredApps.slice(visibleStartIndex, visibleEndIndex);
  const totalRows = Math.ceil(filteredApps.length / itemsPerRow);
  const startRow = Math.floor(visibleStartIndex / itemsPerRow);
  const endRow = Math.ceil(visibleEndIndex / itemsPerRow);

  const topSpacerHeight = Math.max(0, startRow * rowHeight);
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * rowHeight);
  const totalHeight = totalRows * rowHeight;

  appsGrid.replaceChildren();

  const outerDiv = document.createElement('div');
  outerDiv.style.height = `${totalHeight}px`;
  outerDiv.style.position = 'relative';

  const topSpacer = document.createElement('div');
  topSpacer.className = 'apps-grid-spacer';
  topSpacer.style.height = `${topSpacerHeight}px`;

  const container = document.createElement('div');
  container.className = 'apps-grid-container';

  visibleApps.forEach((app) => {
    const isInstalled = installedApps.has(app.name);
    const card = renderAppCard(app, isInstalled);
    container.appendChild(card);
  });

  const bottomSpacer = document.createElement('div');
  bottomSpacer.className = 'apps-grid-spacer';
  bottomSpacer.style.height = `${bottomSpacerHeight}px`;

  outerDiv.appendChild(topSpacer);
  outerDiv.appendChild(container);
  outerDiv.appendChild(bottomSpacer);

  appsGrid.appendChild(outerDiv);
}

function renderAppCard(app: App, isInstalled: boolean): HTMLElement {
  const card = document.createElement('div');
  card.className = 'app-card';

  const topDiv = document.createElement('div');

  const headerDiv = document.createElement('div');
  headerDiv.className = 'app-card-header';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'app-icon';
  // Safe to use innerHTML for static SVG
  iconDiv.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="3" x2="9" y2="21"></line>
    <line x1="15" y1="3" x2="15" y2="21"></line>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="3" y1="15" x2="21" y2="15"></line>
  </svg>`;

  const versionSpan = document.createElement('span');
  versionSpan.className = 'app-version';
  versionSpan.textContent = `v${app.version || 'N/A'}`;

  headerDiv.appendChild(iconDiv);
  headerDiv.appendChild(versionSpan);

  const titleH3 = document.createElement('h3');
  titleH3.className = 'app-title';
  titleH3.textContent = app.name;

  const descP = document.createElement('p');
  descP.className = 'app-description';
  descP.textContent = app.description || 'No description available';

  topDiv.appendChild(headerDiv);
  topDiv.appendChild(titleH3);
  topDiv.appendChild(descP);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'app-actions';

  const button = document.createElement('button');
  button.className = `app-button ${isInstalled ? 'installed' : ''}`;
  button.dataset.app = app.name;
  button.dataset.type = app.type;
  button.textContent = isInstalled ? 'Delete' : 'Install';

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const appName = button.dataset.app;
    const appType = button.dataset.type;
    if (!appName || !appType) return;

    const currentlyInstalled = installedApps.has(appName);

    if (currentlyInstalled) {
      ipcRenderer.send('uninstall-app', appName, appType);
    } else {
      ipcRenderer.send('install-app', appName, appType);
    }

    if (!terminalVisible) {
      toggleTerminal();
    }
  });

  actionsDiv.appendChild(button);

  if (app.homepage) {
    const link = document.createElement('a');
    link.href = app.homepage;
    link.target = '_blank';
    link.className = 'external-link';
    link.title = 'Open homepage';
    // Safe to use innerHTML for static SVG
    link.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>`;
    actionsDiv.appendChild(link);
  }

  card.appendChild(topDiv);
  card.appendChild(actionsDiv);

  return card;
}

function toggleTerminal(): void {
  terminalVisible = !terminalVisible;
  if (terminalVisible) {
    terminalContainer.classList.add('visible');
    if (terminalToggleIcon && terminalToggleIcon.querySelector('path')) {
      (terminalToggleIcon.querySelector('path') as SVGPathElement).setAttribute(
        'd',
        'M19 9l-7 7-7-7'
      );
    }
  } else {
    terminalContainer.classList.remove('visible');
    if (terminalToggleIcon && terminalToggleIcon.querySelector('path')) {
      (terminalToggleIcon.querySelector('path') as SVGPathElement).setAttribute(
        'd',
        'M5 15l7-7 7 7'
      );
    }
  }
}

function runCommand(command: string): void {
  if (commandToRun) return;

  commandToRun = command;
  if (!terminalVisible) {
    toggleTerminal();
  }

  const promptSpan = document.createElement('span');
  promptSpan.className = 'terminal-prompt';
  promptSpan.textContent = terminalPrompt;

  terminalOutput.appendChild(promptSpan);
  terminalOutput.appendChild(document.createTextNode(` ${command}\n`));

  terminalOutput.scrollTop = terminalOutput.scrollHeight;

  ipcRenderer.send('execute-command', command);

  setTimeout(() => {
    commandToRun = null;
  }, 100);
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Renderer] DOMContentLoaded event fired');
    if (ipcRenderer) {
      // Get terminal prompt info
      ipcRenderer.send('get-terminal-prompt');
      // Get log file path
      ipcRenderer.send('get-log-path');
    }
    init();
  });
} else {
  // DOM already loaded
  console.log('[Renderer] DOM already loaded, initializing immediately');
  if (ipcRenderer) {
    ipcRenderer.send('get-terminal-prompt');
    ipcRenderer.send('get-log-path');
  }
  init();
}
