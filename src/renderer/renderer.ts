// Uses window.electronAPI exposed via contextBridge

// Inline constants to avoid CommonJS exports issue
let CATEGORIES = ['All', 'Installed'];

interface CategoryData {
  categories: Record<string, { label: string; color: string; keywords?: string[] }>;
  casks: Record<string, string>;
  formulae: Record<string, string>;
}

let categoryDictionary: CategoryData | null = null;

const VIRTUAL_SCROLL_CONFIG = {
  rowHeight: 220,
  bufferRows: 5,
  debounceMs: 300,
  scrollThrottleMs: 50,
  scrollThreshold: 50,
};

let categoryColorMap = new Map<string, string>(); // Optimization: O(1) lookups for category colors
// App type definition
interface App {
  name: string;
  description: string;
  homepage: string;
  version: string;
  type: 'cask' | 'formula';
  _category?: string;
  _nameLower?: string;
  _searchStr?: string;
}

// Pre-compiled category fallbacks for fast string matching
let fallbackCategories: Array<{ label: string; keywords: string[] }> = [];

// Immediate console log to verify script is loading
console.log('[Renderer] renderer.ts script loaded');

const ipcRenderer = (window as any).electronAPI;
console.log('[Renderer] ipcRenderer loaded:', !!ipcRenderer);

// i18n helper
async function t(key: string, options?: object): Promise<string> {
  if (ipcRenderer && ipcRenderer.t) {
    return await ipcRenderer.t(key, options);
  }
  return key;
}

// Translation cache
const uiTranslations = {
  delete: 'Delete',
  install: 'Install',
  upgrade: 'Upgrade',
  noDescription: 'No description available',
  started: 'Started',
  stopped: 'Stopped',
  error: 'Error',
  start: 'Start',
  stop: 'Stop',
  restart: 'Restart',
  loading: 'Loading...',
  loadingApps: 'Loading apps from Homebrew...',
  noAppsFound: 'No apps found matching your criteria.',
  failedLoadApps: 'Failed to load apps.',
  retry: 'Retry',
  noAppsAvailable: 'No apps available. Please check your connection.',
  confirmUpgradeAll: 'Are you sure you want to upgrade all outdated packages?',
  upgradingAll: 'upgrading all packages...',
  upgrading: 'upgrading',
  allUpToDate: 'All your applications are up to date.',
  noAppsInstalled: 'No apps installed',
  update: 'update',
  updates: 'updates',
  available: 'available',
  all: 'All',
  installed: 'Installed',
};

async function updateTranslationCache(): Promise<void> {
  uiTranslations.delete = await t('sidebar.delete');
  uiTranslations.install = await t('sidebar.install');
  uiTranslations.upgrade = await t('updates.upgrade');
  uiTranslations.noDescription = await t('sidebar.none');
  uiTranslations.started = await t('services.status.started');
  uiTranslations.stopped = await t('services.status.stopped');
  uiTranslations.error = await t('services.status.error');
  uiTranslations.start = await t('services.actions.start');
  uiTranslations.stop = await t('services.actions.stop');
  uiTranslations.restart = await t('services.actions.restart');
  uiTranslations.loading = await t('common.loading');
  uiTranslations.loadingApps = await t('explore.loading');
  uiTranslations.noAppsFound = await t('common.no_apps_found');
  uiTranslations.failedLoadApps = await t('common.failed_load_apps');
  uiTranslations.retry = await t('common.retry');
  uiTranslations.noAppsAvailable = await t('common.no_apps_available');
  uiTranslations.confirmUpgradeAll = await t('common.confirm_upgrade_all');
  uiTranslations.upgradingAll = await t('updates.upgrade_all');
  uiTranslations.allUpToDate = await t('dashboard.up_to_date');
  uiTranslations.noAppsInstalled = await t('dashboard.no_apps_installed');
  uiTranslations.all = await t('explore.all_types');
  uiTranslations.installed = await t('dashboard.installed_apps');

  // Update CATEGORIES with translated labels
  CATEGORIES = [uiTranslations.all, uiTranslations.installed];
  if (categoryDictionary) {
    Object.values(categoryDictionary.categories).forEach((cat) => CATEGORIES.push(cat.label));
  }
}

// State
let allApps: Array<App> = [];
let allAppsMap = new Map<string, App>(); // Optimization: O(1) lookups for 100k items
let installedApps = new Set<string>();
let filteredApps: Array<App> = [];
let selectedCategory = 'All';
let selectedType: 'All' | 'cask' | 'formula' | 'trending' = 'All';
let searchTerm = '';
let terminalVisible = false;
let commandToRun: string | null = null;
let isLoading = true;
let terminalPrompt = 'user@brewmate ~ %';
let loadError: string | null = null;

interface OutdatedApp {
  name: string;
  type: 'cask' | 'formula';
  installedVersion: string;
  latestVersion: string;
}

let activeView: 'dashboard' | 'explore' | 'updates' | 'services' = 'dashboard';
let outdatedApps: Array<OutdatedApp> = [];
let cacheSize = 0;

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

// Navigation and Tab Views
let navButtons: NodeListOf<HTMLButtonElement>;
let tabViews: NodeListOf<HTMLElement>;

// Dashboard elements
let dashInstalledCount: HTMLElement;
let dashCaskCount: HTMLElement;
let dashFormulaCount: HTMLElement;
let dashBreakdownProgress: HTMLElement;
let dashCacheSize: HTMLElement;
let dashCleanupBtn: HTMLButtonElement;
let dashUpdatesCount: HTMLElement;
let dashUpdatesMeta: HTMLElement;
let dashUpdatesActions: HTMLElement;
let dashViewUpdatesBtn: HTMLButtonElement;
let dashUpgradeAllBtn: HTMLButtonElement;
let dashScanVulnBtn: HTMLButtonElement;

// Updates View elements
let updatesUpgradeAllBtn: HTMLButtonElement;
let updatesEmptyState: HTMLElement;
let updatesTable: HTMLElement;
let updatesTableBody: HTMLElement;
let updatesBadge: HTMLElement;

// Services View elements
let servicesLoading: HTMLElement;
let servicesEmptyState: HTMLElement;
let servicesTable: HTMLElement;
let servicesTableBody: HTMLElement;

// Sidebar elements
let sidebarOverlay: HTMLElement;
let appSidebar: HTMLElement;
let sidebarTitle: HTMLElement;
let sidebarVersion: HTMLElement;
let sidebarType: HTMLElement;
let sidebarDescription: HTMLElement;
let sidebarHomepage: HTMLAnchorElement;
let sidebarActions: HTMLElement;
let sidebarClose: HTMLButtonElement;
let sidebarDetailsLoader: HTMLElement;
let sidebarExtendedDetails: HTMLElement;
let sidebarSize: HTMLElement;
let sidebarDependencies: HTMLElement;
let sidebarGithubStatsRow: HTMLElement;
let sidebarGithubStars: HTMLElement;
let sidebarVulnRow: HTMLElement;
let sidebarVulns: HTMLElement;
let terminalHistorySelect: HTMLSelectElement;
let trendingToggleBtn: HTMLButtonElement;

// App Data
let trendingApps = new Set<string>();

// Initialize
async function init(): Promise<void> {
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
  terminalHistorySelect = document.getElementById(
    'terminalHistorySelect'
  ) as HTMLSelectElement;
  trendingToggleBtn = document.getElementById('trendingToggleBtn') as HTMLButtonElement;

  sidebarOverlay = document.getElementById('sidebarOverlay') as HTMLElement;
  appSidebar = document.getElementById('appSidebar') as HTMLElement;
  sidebarTitle = document.getElementById('sidebarTitle') as HTMLElement;
  sidebarVersion = document.getElementById('sidebarVersion') as HTMLElement;
  sidebarType = document.getElementById('sidebarType') as HTMLElement;
  sidebarDescription = document.getElementById('sidebarDescription') as HTMLElement;
  sidebarHomepage = document.getElementById('sidebarHomepage') as HTMLAnchorElement;
  sidebarActions = document.getElementById('sidebarActions') as HTMLElement;
  sidebarClose = document.getElementById('sidebarClose') as HTMLButtonElement;
  sidebarDetailsLoader = document.getElementById('sidebarDetailsLoader') as HTMLElement;
  sidebarExtendedDetails = document.getElementById('sidebarExtendedDetails') as HTMLElement;
  sidebarSize = document.getElementById('sidebarSize') as HTMLElement;
  sidebarDependencies = document.getElementById('sidebarDependencies') as HTMLElement;
  sidebarGithubStatsRow = document.getElementById('sidebarGithubStatsRow') as HTMLElement;
  sidebarGithubStars = document.getElementById('sidebarGithubStars') as HTMLElement;
  sidebarVulnRow = document.getElementById('sidebarVulnRow') as HTMLElement;
  sidebarVulns = document.getElementById('sidebarVulns') as HTMLElement;

  navButtons = document.querySelectorAll(
    '.nav-sidebar .nav-button'
  ) as NodeListOf<HTMLButtonElement>;
  tabViews = document.querySelectorAll(
    '.main-layout-wrapper .tab-view'
  ) as NodeListOf<HTMLElement>;

  dashInstalledCount = document.getElementById('dashInstalledCount') as HTMLElement;
  dashCaskCount = document.getElementById('dashCaskCount') as HTMLElement;
  dashFormulaCount = document.getElementById('dashFormulaCount') as HTMLElement;
  dashBreakdownProgress = document.getElementById('dashBreakdownProgress') as HTMLElement;
  dashCacheSize = document.getElementById('dashCacheSize') as HTMLElement;
  dashCleanupBtn = document.getElementById('dashCleanupBtn') as HTMLButtonElement;
  dashUpdatesCount = document.getElementById('dashUpdatesCount') as HTMLElement;
  dashUpdatesMeta = document.getElementById('dashUpdatesMeta') as HTMLElement;
  dashUpdatesActions = document.getElementById('dashUpdatesActions') as HTMLElement;
  dashViewUpdatesBtn = document.getElementById('dashViewUpdatesBtn') as HTMLButtonElement;
  dashUpgradeAllBtn = document.getElementById('dashUpgradeAllBtn') as HTMLButtonElement;
  dashUpgradeAllBtn = document.getElementById('dashUpgradeAllBtn') as HTMLButtonElement;
  dashScanVulnBtn = document.getElementById('dashScanVulnBtn') as HTMLButtonElement;

  updatesUpgradeAllBtn = document.getElementById('updatesUpgradeAllBtn') as HTMLButtonElement;
  updatesEmptyState = document.getElementById('updatesEmptyState') as HTMLElement;
  updatesTable = document.getElementById('updatesTable') as HTMLElement;
  updatesTableBody = document.getElementById('updatesTableBody') as HTMLElement;
  updatesBadge = document.getElementById('updatesBadge') as HTMLElement;

  servicesLoading = document.getElementById('servicesLoading') as HTMLElement;
  servicesEmptyState = document.getElementById('servicesEmptyState') as HTMLElement;
  servicesTable = document.getElementById('servicesTable') as HTMLElement;
  servicesTableBody = document.getElementById('servicesTableBody') as HTMLElement;

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

  setupIpcListeners();

  // Initialize terminal output
  const welcomeMsg = await t('terminal.welcome');
  const lastLoginMsg = await t('terminal.last_login');
  terminalOutput.innerHTML = `${welcomeMsg}\n${lastLoginMsg} ${new Date().toLocaleString()}\n`;

  // Load version info
  if (versionInfo && ipcRenderer) {
    ipcRenderer.send('get-version-info');
  }

  // Translate static UI elements
  await translateUI();
  await updateTranslationCache();

  // Initialize language selection dropdown
  if (ipcRenderer && ipcRenderer.getCurrentLanguage) {
    const currentLang = await ipcRenderer.getCurrentLanguage();
    const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
    if (languageSelect) {
      languageSelect.value = currentLang || 'en';
      languageSelect.addEventListener('change', async (e) => {
        const newLang = (e.target as HTMLSelectElement).value;
        console.log('[Renderer] Changing language to:', newLang);
        if (ipcRenderer.changeLanguage) {
          ipcRenderer.changeLanguage(newLang);

          // Re-translate static UI and rebuild translated caches
          await translateUI();
          await updateTranslationCache();

          // Re-render categories (since they might need new translated labels)
          renderCategories();

          // Re-run other UI rendering updates
          if (activeView === 'dashboard') {
            updateDashboardView();
            renderDashboardDonutChart();
          } else if (activeView === 'explore') {
            filterApps();
          } else if (activeView === 'updates') {
            renderUpdatesView();
          } else if (activeView === 'services') {
            ipcRenderer.send('get-brew-services');
          }
        }
      });
    }
  }

  console.log('Initializing BrewMate...');
  setupEventListeners();

  if (ipcRenderer && ipcRenderer.getCategories) {
    ipcRenderer
      .getCategories()
      .then((data: CategoryData) => {
        categoryDictionary = data;
        CATEGORIES = ['All', 'Installed'];
        categoryColorMap.clear();

        Object.values(data.categories).forEach((c) => {
          CATEGORIES.push(c.label);
          if (c.label && c.color) {
            categoryColorMap.set(c.label, c.color);
          }
        });

        // Pre-compile fallback categories to optimize getCategoryForApp
        fallbackCategories = Object.values(data.categories).filter(
          (c) => c.keywords && c.keywords.length > 0
        ) as Array<{ label: string; keywords: string[] }>;

        renderCategories();
        loadData();
        renderDashboardDonutChart();
      })
      .catch((err: any) => {
        console.error('[Renderer] Failed to load categories.json:', err);
        // Fallback
        CATEGORIES = ['All', 'Installed', 'Developer Tools', 'Utilities', 'Other'];
        renderCategories();
        loadData();

        // Log error in the terminal
        if (terminalOutput) {
          terminalOutput.insertAdjacentHTML(
            'beforeend',
            `<span class="terminal-prompt" style="color: #ff4d4f;">[Error]</span> Failed to load categories. Please check your installation.\n`
          );
        }
      });
  } else {
    CATEGORIES = ['All', 'Installed', 'Developer Tools', 'Utilities', 'Other'];
    renderCategories();
    loadData();
  }
}

async function translateUI(): Promise<void> {
  const elements = document.querySelectorAll('[data-i18n]');
  for (const el of elements) {
    const key = (el as HTMLElement).dataset.i18n;
    if (key) {
      const translation = await t(key);
      if (el instanceof HTMLInputElement && el.placeholder) {
        el.placeholder = translation;
      } else {
        el.textContent = translation;
      }
    }
  }
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
      selectedType = (btn as HTMLElement).dataset.type as
        | 'All'
        | 'cask'
        | 'formula'
        | 'trending';
      document.querySelectorAll('.type-toggle').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      visibleStartIndex = 0;
      appsGrid.scrollTop = 0;

      if (selectedType === 'trending' && trendingApps.size === 0) {
        // Fetch trending apps if we don't have them
        ipcRenderer.send('get-trending-apps');
      } else {
        filterApps();
      }
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

  // Sidebar listeners
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Tab Navigation Click Handlers
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view as 'dashboard' | 'explore' | 'updates' | 'services';
      if (!view) return;

      activeView = view;
      navButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      tabViews.forEach((v) => {
        v.classList.remove('active');
        if (v.id === `${view}View`) {
          v.classList.add('active');
        }
      });

      // Special action on tab switch
      if (activeView === 'dashboard') {
        updateDashboardView();
      } else if (activeView === 'explore') {
        calculateItemsPerRow();
        updateVisibleItems();
      } else if (activeView === 'updates') {
        renderUpdatesView();
      } else if (activeView === 'services') {
        servicesLoading.style.display = 'flex';
        servicesTable.style.display = 'none';
        servicesEmptyState.style.display = 'none';
        ipcRenderer.send('get-brew-services');
      }
    });
  });

  // Dashboard buttons
  if (dashCleanupBtn) {
    dashCleanupBtn.addEventListener('click', () => {
      runCommand('brew cleanup --prune=all');
    });
  }

  if (dashViewUpdatesBtn) {
    dashViewUpdatesBtn.addEventListener('click', () => {
      const updatesBtn = document.querySelector(
        '.nav-button[data-view="updates"]'
      ) as HTMLButtonElement;
      if (updatesBtn) updatesBtn.click();
    });
  }

  if (dashUpgradeAllBtn) {
    dashUpgradeAllBtn.addEventListener('click', () => {
      if (confirm(uiTranslations.confirmUpgradeAll)) {
        upgradeAll();
      }
    });
  }

  if (dashScanVulnBtn) {
    dashScanVulnBtn.addEventListener('click', () => {
      dashScanVulnBtn.innerHTML = `
        <div class="loading-spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
        Scanning...
      `;
      dashScanVulnBtn.disabled = true;
      ipcRenderer.send('scan-vulnerabilities');
    });
  }

  if (updatesUpgradeAllBtn) {
    updatesUpgradeAllBtn.addEventListener('click', () => {
      if (confirm(uiTranslations.confirmUpgradeAll)) {
        upgradeAll();
      }
    });
  }
}

function setupIpcListeners(): void {
  if (!ipcRenderer) {
    console.error('[Renderer] Cannot setup IPC listeners - ipcRenderer not available');
    return;
  }

  ipcRenderer.on('toggle-terminal', toggleTerminal);
  ipcRenderer.on('terminal-output', (_event: any, data: string) => {
    // Optimization: Use insertAdjacentHTML instead of innerHTML += to avoid O(N^2) DOM serialization overhead
    terminalOutput.insertAdjacentHTML('beforeend', escapeHtml(data));
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  });
  ipcRenderer.on('all-apps', (_event: any, apps: Array<App>) => {
    console.log('[Renderer] Received all-apps:', apps.length);
    allAppsMap.clear();
    for (const app of apps) {
      app._nameLower = (app.name || '').toLowerCase();
      app._searchStr = `${app._nameLower}\0${(app.description || '').toLowerCase()}\0${(app.homepage || '').toLowerCase()}`;
      app._category = getCategoryForApp(app);
      allAppsMap.set(app.name, app);
    }
    allApps = apps;
    loadError = null;
    isLoading = false;
    filterApps();
    renderDashboardDonutChart();
    setTimeout(() => {
      updateVisibleItems();
    }, 100);
  });
  ipcRenderer.on(
    'installed-apps',
    (_event: any, apps: Array<{ name: string; type: string }>) => {
      installedApps = new Set(apps.map((app) => app.name));
      renderCategories();
      renderDashboardDonutChart();
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
        renderDashboardDonutChart();
        filterApps();
        // Refresh outdated apps and cache size
        ipcRenderer.send('get-outdated-apps');
        ipcRenderer.send('get-cache-size');
      }
    }
  );
  ipcRenderer.on(
    'uninstall-complete',
    (_event: any, { appName, success }: { appName: string; success: boolean }) => {
      if (success) {
        installedApps.delete(appName);
        renderCategories();
        renderDashboardDonutChart();
        filterApps();
        // Refresh outdated apps and cache size
        ipcRenderer.send('get-outdated-apps');
        ipcRenderer.send('get-cache-size');
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
          appsGrid.innerHTML = '';
          const loadingContainer = document.createElement('div');
          loadingContainer.className = 'loading';

          const spinner = document.createElement('div');
          spinner.className = 'loading-spinner';

          const msgContainer = document.createElement('div');
          msgContainer.className = 'loading-message';
          msgContainer.textContent = message || uiTranslations.loadingApps;

          loadingContainer.appendChild(spinner);
          loadingContainer.appendChild(msgContainer);
          appsGrid.appendChild(loadingContainer);
        }
      }
    }
  );
  ipcRenderer.on('all-apps-updated', (_event: any, apps: Array<App>) => {
    allAppsMap.clear();
    for (const app of apps) {
      app._nameLower = (app.name || '').toLowerCase();
      app._searchStr = `${app._nameLower}\0${(app.description || '').toLowerCase()}\0${(app.homepage || '').toLowerCase()}`;
      app._category = getCategoryForApp(app);
      allAppsMap.set(app.name, app);
    }
    allApps = apps;
    loadError = null;
    isLoading = false;
    filterApps();
    renderDashboardDonutChart();
    if (loadingMessage) {
      loadingMessage.textContent = 'Apps updated';
    }
  });

  ipcRenderer.on('all-apps-error', (_event: any, errorMessage: string) => {
    console.error('[Renderer] Error loading apps:', errorMessage);
    loadError = errorMessage;
    if (loadingMessage) {
      loadingMessage.textContent = `Error: ${errorMessage}`;
    }
    filterApps();
  });

  ipcRenderer.on('installed-apps-error', (_event: any, errorMessage: string) => {
    console.error('[Renderer] Error getting installed apps:', errorMessage);
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

  ipcRenderer.on('app-details', (_event: any, data: { appName: string; details: any }) => {
    const { appName, details } = data;
    if (sidebarTitle.textContent !== appName) return; // Ignore if user clicked another app

    sidebarDetailsLoader.style.display = 'none';
    sidebarExtendedDetails.style.display = 'block';

    if (details) {
      // popuplate size, dependencies, stars
      sidebarSize.textContent = details.size || 'Unknown';

      const deps = details.dependencies || [];
      if (deps.length > 0) {
        sidebarDependencies.textContent = deps.join(', ');
      } else {
        sidebarDependencies.textContent = 'None';
      }

      if (details.githubStats && details.githubStats.stars !== undefined) {
        sidebarGithubStatsRow.style.display = 'flex';
        sidebarGithubStars.textContent = details.githubStats.stars.toLocaleString();
      } else {
        sidebarGithubStatsRow.style.display = 'none';
      }
    } else {
      sidebarSize.textContent = 'Failed to load';
      sidebarDependencies.textContent = '-';
      sidebarGithubStatsRow.style.display = 'none';
    }
  });

  ipcRenderer.on('vulnerabilities-result', (_event: any, vulns: any) => {
    if (dashScanVulnBtn) {
      dashScanVulnBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Scan Complete
      `;
      setTimeout(() => {
        dashScanVulnBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Scan Vulnerabilities
        `;
        dashScanVulnBtn.disabled = false;
      }, 3000);
    }

    // Log results in the terminal activity drawer
    if (!terminalVisible) toggleTerminal();
    terminalOutput.insertAdjacentHTML(
      'beforeend',
      `<span class="terminal-prompt">${terminalPrompt}</span> brew vulns output:\n${escapeHtml(JSON.stringify(vulns, null, 2))}\n`
    );
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  });

  ipcRenderer.on('trending-apps-result', (_event: any, data: any) => {
    trendingApps.clear();
    if (data && data.items) {
      data.items.slice(0, 100).forEach((item: any) => {
        if (item.cask) trendingApps.add(item.cask.toLowerCase());
        if (item.formula) trendingApps.add(item.formula.toLowerCase());
      });
    }
    filterApps();
  });

  // Outdated apps listener
  ipcRenderer.on('outdated-apps', (_event: any, apps: Array<OutdatedApp>) => {
    console.log('[Renderer] Received outdated apps:', apps.length);
    outdatedApps = apps;
    updateUpdatesBadge();
    if (activeView === 'dashboard') {
      updateDashboardView();
    } else if (activeView === 'updates') {
      renderUpdatesView();
    }
  });

  // Cache size listener
  ipcRenderer.on('cache-size', (_event: any, size: number) => {
    console.log('[Renderer] Received cache size:', size);
    cacheSize = size;
    if (activeView === 'dashboard') {
      updateDashboardView();
    }
  });

  // Upgrade individual app complete listener
  ipcRenderer.on(
    'upgrade-complete',
    (_event: any, { appName, success }: { appName: string; success: boolean }) => {
      console.log('[Renderer] Upgrade complete:', appName, success);
      if (success) {
        // Optimistically remove from list
        outdatedApps = outdatedApps.filter((app) => app.name !== appName);
        updateUpdatesBadge();
        if (activeView === 'dashboard') {
          updateDashboardView();
        } else if (activeView === 'updates') {
          renderUpdatesView();
        }
      }
    }
  );

  // Services listeners
  ipcRenderer.on('brew-services-list', (_event: any, services: any[]) => {
    console.log('[Renderer] Received brew services:', services);
    renderServices(services);
  });

  ipcRenderer.on(
    'service-action-complete',
    async (_event: any, { action, service, success, error }: any) => {
      console.log('[Renderer] Service action complete:', action, service, success, error);
      if (success) {
        ipcRenderer.send('get-brew-services');
      } else {
        const failedToMsg = await t('common.error');
        alert(`${failedToMsg} ${action} ${service}: ${error}`);
        ipcRenderer.send('get-brew-services');
      }
    }
  );

  // Upgrade all complete listener
  ipcRenderer.on('upgrade-all-complete', (_event: any, { success }: { success: boolean }) => {
    console.log('[Renderer] Upgrade all complete:', success);
    if (success) {
      ipcRenderer.send('get-outdated-apps');
      ipcRenderer.send('get-installed-apps');
      ipcRenderer.send('get-cache-size');
    }
  });
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

  // Show loading state
  isLoading = true;
  loadError = null;
  if (appCount) {
    appCount.textContent = '...';
  }

  try {
    console.log('[Renderer] Sending get-all-apps');
    ipcRenderer.send('get-all-apps');

    console.log('[Renderer] Sending get-installed-apps');
    ipcRenderer.send('get-installed-apps');

    console.log('[Renderer] Sending get-outdated-apps');
    ipcRenderer.send('get-outdated-apps');

    console.log('[Renderer] Sending get-cache-size');
    ipcRenderer.send('get-cache-size');

    console.log('[Renderer] IPC messages sent successfully');
  } catch (error: any) {
    console.error('[Renderer] Error sending IPC messages:', error);
    if (loadingMessage) {
      loadingMessage.textContent = `Error: Cannot connect to main process - ${error.message}`;
    }
  }
}

function retryLoad(): void {
  console.log('[Renderer] Retrying load...');
  loadData();
}

function renderCategories(): void {
  categoryChips.innerHTML = CATEGORIES.map((cat) => {
    const isInstalled = cat === uiTranslations.installed;
    const isActive = selectedCategory === cat;
    return `
      <button class="category-chip ${isInstalled ? 'installed-category' : ''} ${
        isActive ? 'active' : ''
      }" 
              data-category="${cat}">
        ${cat}${isInstalled ? ' (' + installedApps.size + ')' : ''}
      </button>
    `;
  }).join('');

  categoryChips.querySelectorAll('.category-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCategory = (btn as HTMLElement).dataset.category || 'All';
      document.querySelectorAll('.category-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      visibleStartIndex = 0;
      appsGrid.scrollTop = 0;
      filterApps();
    });
  });
}

function getCategoryForApp(app: App): string {
  if (categoryDictionary) {
    const categoryId =
      app.type === 'cask'
        ? categoryDictionary.casks[app.name]
        : categoryDictionary.formulae[app.name];

    if (categoryId && categoryDictionary.categories[categoryId]) {
      return categoryDictionary.categories[categoryId].label;
    }

    // Optimization: reuse pre-cached lowercased search string if available
    const searchStr =
      app._searchStr !== undefined
        ? app._searchStr
        : `${app.name} ${app.description || ''}`.toLowerCase();

    // Optimization: Dynamic fallback using pre-compiled categories array
    // Reduces processing time by ~50% compared to Object.values + some iteration
    for (let i = 0; i < fallbackCategories.length; i++) {
      const cat = fallbackCategories[i];
      for (let j = 0; j < cat.keywords.length; j++) {
        // Optimization: .indexOf is slightly faster than .includes
        if (searchStr.indexOf(cat.keywords[j]) !== -1) {
          return cat.label;
        }
      }
    }
  }

  return 'Other';
}

function renderDashboardDonutChart(): void {
  const donutContainer = document.getElementById('dashDonutChart');
  const legendContainer = document.getElementById('dashDonutLegend');
  if (!donutContainer || !legendContainer || !categoryDictionary) return;

  // Calculate stats based on installed apps
  const categoryCounts: Record<string, number> = {};
  let totalCount = 0;

  for (const appName of installedApps) {
    const app = allAppsMap.get(appName); // Optimization: O(1) lookup instead of O(N)
    if (app) {
      const category = app._category || getCategoryForApp(app);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      totalCount++;
    }
  }

  if (totalCount === 0) {
    if (isLoading) {
      donutContainer.innerHTML = `<div class="empty-chart">${uiTranslations.loading}</div>`;
    } else {
      donutContainer.innerHTML = `<div class="empty-chart">${uiTranslations.noAppsInstalled}</div>`;
    }
    legendContainer.innerHTML = '';
    return;
  }

  // Sort and pick top 7, rest into 'Other'
  let sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([name]) => name !== 'Other');

  let otherCount = categoryCounts['Other'] || 0;

  if (sortedCategories.length > 7) {
    const tail = sortedCategories.slice(7);
    sortedCategories = sortedCategories.slice(0, 7);
    tail.forEach(([, count]) => {
      otherCount += count;
    });
  }

  if (otherCount > 0) {
    sortedCategories.push(['Other', otherCount]);
  }

  // Build SVG and Legend
  let svgContent = '';
  let legendContent = '';

  let cumulativePercentage = 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  // Define colors if missing
  const getCategoryColor = (label: string) => {
    if (label === 'Other') return 'hsl(215, 16%, 47%)';
    return categoryColorMap.get(label) || 'hsl(200, 10%, 50%)';
  };

  sortedCategories.forEach(([label, count]) => {
    const percentage = (count / totalCount) * 100;
    const strokeDashArray = `${(percentage / 100) * circumference} ${circumference}`;
    const strokeDashOffset = `-${(cumulativePercentage / 100) * circumference}`;
    const color = getCategoryColor(label);

    svgContent += `<circle class="donut-segment" data-category="${label}" cx="50" cy="50" r="${radius}" fill="transparent" stroke="${color}" stroke-width="8" stroke-dasharray="${strokeDashArray}" stroke-dashoffset="${strokeDashOffset}" transform="rotate(-90 50 50)"></circle>`;

    legendContent += `
      <div class="donut-legend-item" data-category="${label}">
        <span class="donut-legend-dot" style="background-color: ${color}"></span>
        <span class="donut-legend-label">${label}</span>
        <span class="donut-legend-count">${count}</span>
      </div>
    `;

    cumulativePercentage += percentage;
  });

  donutContainer.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100">${svgContent}</svg>`;
  legendContainer.innerHTML = legendContent;

  // Add interactions
  const segments = donutContainer.querySelectorAll('.donut-segment');
  const legendItems = legendContainer.querySelectorAll('.donut-legend-item');

  const highlightCategory = (cat: string) => {
    segments.forEach((s) => {
      if (s.getAttribute('data-category') === cat) {
        s.classList.add('highlighted');
      } else {
        s.classList.add('dimmed');
      }
    });
    legendItems.forEach((l) => {
      if (l.getAttribute('data-category') === cat) {
        l.classList.add('highlighted');
      } else {
        l.classList.add('dimmed');
      }
    });
  };

  const resetHighlight = () => {
    segments.forEach((s) => s.classList.remove('highlighted', 'dimmed'));
    legendItems.forEach((l) => l.classList.remove('highlighted', 'dimmed'));
  };

  const navigateToCategory = (cat: string) => {
    // Switch to Explore view and filter by category
    const exploreBtn = Array.from(navButtons).find((btn) => btn.dataset.view === 'explore');
    if (exploreBtn) {
      exploreBtn.click();

      // Select category chip
      const chips = categoryChips.querySelectorAll('.category-chip');
      chips.forEach((chip) => {
        if ((chip as HTMLElement).dataset.category === cat) {
          (chip as HTMLElement).click();
          // Scroll chip into view smoothly
          chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
    }
  };

  segments.forEach((s) => {
    const cat = s.getAttribute('data-category')!;
    s.addEventListener('mouseenter', () => highlightCategory(cat));
    s.addEventListener('mouseleave', resetHighlight);
    s.addEventListener('click', () => navigateToCategory(cat));
  });

  legendItems.forEach((l) => {
    const cat = l.getAttribute('data-category')!;
    l.addEventListener('mouseenter', () => highlightCategory(cat));
    l.addEventListener('mouseleave', resetHighlight);
    l.addEventListener('click', () => navigateToCategory(cat));
  });
}

function calculateItemsPerRow(): void {
  const gridWidth = appsGrid.offsetWidth;
  itemsPerRow = Math.max(1, Math.floor(gridWidth / 236));
}

function filterApps(): void {
  if (isLoading && allApps.length === 0) {
    return;
  }

  requestAnimationFrame(() => {
    const searchLower = searchTerm ? searchTerm.toLowerCase() : '';

    // Fast path: if no filters are active, directly use allApps array (O(1) vs O(N))
    if (!searchLower && selectedType === 'All' && selectedCategory === 'All') {
      filteredApps = allApps;
    } else {
      // Reset filtered apps before filtering
      filteredApps = [];

      // Optimization: If selectedCategory is "Installed", iterate through the much smaller installedApps set
      // instead of filtering the ~100k allApps array, changing complexity from O(N) to O(K) where K is installed apps count.
      if (selectedCategory === 'Installed') {
        for (const appName of installedApps) {
          const app = allAppsMap.get(appName);
          if (!app) continue;

          if (selectedType === 'trending') {
            const name =
              app._nameLower !== undefined ? app._nameLower : (app.name || '').toLowerCase();
            if (!trendingApps.has(name)) continue;
          } else if (selectedType !== 'All' && app.type !== selectedType) {
            continue;
          }

          if (searchLower) {
            if (app._searchStr !== undefined) {
              // Optimization: .indexOf is roughly 2x faster than .includes in tight loops
              if (app._searchStr.indexOf(searchLower) === -1) continue;
            } else {
              // Fallback if _searchStr is somehow missing
              const name =
                app._nameLower !== undefined ? app._nameLower : (app.name || '').toLowerCase();
              if (name.indexOf(searchLower) !== -1) {
                // match
              } else {
                const desc = (app.description || '').toLowerCase();
                if (desc.indexOf(searchLower) !== -1) {
                  // match
                } else {
                  const homepage = (app.homepage || '').toLowerCase();
                  if (homepage.indexOf(searchLower) === -1) continue;
                }
              }
            }
          }
          filteredApps.push(app);
        }
      } else {
        // Optimization: Native for loop is roughly 2x faster than .filter() for massive arrays
        // by avoiding callback closure overhead and intermediate allocations
        for (let i = 0; i < allApps.length; i++) {
          const app = allApps[i];
          if (selectedType === 'trending') {
            const name =
              app._nameLower !== undefined ? app._nameLower : (app.name || '').toLowerCase();
            if (!trendingApps.has(name)) continue;
          } else if (selectedType !== 'All' && app.type !== selectedType) {
            continue;
          }

          if (selectedCategory !== 'All') {
            const category =
              app._category !== undefined ? app._category : getCategoryForApp(app);
            if (category !== selectedCategory) continue;
          }

          if (searchLower) {
            if (app._searchStr !== undefined) {
              // Optimization: .indexOf is roughly 2x faster than .includes in tight loops
              if (app._searchStr.indexOf(searchLower) === -1) continue;
            } else {
              // Fallback if _searchStr is somehow missing
              const name =
                app._nameLower !== undefined ? app._nameLower : (app.name || '').toLowerCase();
              if (name.indexOf(searchLower) !== -1) {
                // match
              } else {
                const desc = (app.description || '').toLowerCase();
                if (desc.indexOf(searchLower) !== -1) {
                  // match
                } else {
                  const homepage = (app.homepage || '').toLowerCase();
                  if (homepage.indexOf(searchLower) === -1) continue;
                }
              }
            }
          }

          filteredApps.push(app);
        }
      }
    }

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
    appsGrid.innerHTML = '';
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading';

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    const msgContainer = document.createElement('div');
    msgContainer.className = 'loading-message';
    msgContainer.textContent = uiTranslations.loadingApps;

    loadingContainer.appendChild(spinner);
    loadingContainer.appendChild(msgContainer);
    appsGrid.appendChild(loadingContainer);
    return;
  }
  // Show empty state when no filtered apps (but apps are loaded)
  if (filteredApps.length === 0 && allApps.length > 0) {
    appsGrid.innerHTML = '';
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = uiTranslations.noAppsFound;
    appsGrid.appendChild(emptyState);

    // Reset scroll position
    appsGrid.scrollTop = 0;
    return;
  }

  if (filteredApps.length === 0 && allApps.length === 0 && !isLoading) {
    appsGrid.innerHTML = '';

    if (loadError) {
      const container = document.createElement('div');
      container.className = 'empty-state';

      const icon = document.createElement('div');
      icon.className = 'empty-state-icon';
      icon.textContent = '⚠️';
      container.appendChild(icon);

      const msg = document.createElement('p');
      msg.textContent = uiTranslations.failedLoadApps;
      container.appendChild(msg);

      const detail = document.createElement('p');
      detail.className = 'empty-state-detail';
      detail.textContent = loadError;
      container.appendChild(detail);

      const retryBtn = document.createElement('button');
      retryBtn.className = 'retry-button';
      retryBtn.id = 'retryLoadBtn';
      retryBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`;
      retryBtn.appendChild(document.createTextNode(' ' + uiTranslations.retry));
      retryBtn.addEventListener('click', retryLoad);
      container.appendChild(retryBtn);

      appsGrid.appendChild(container);
    } else {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = uiTranslations.noAppsAvailable;
      appsGrid.appendChild(emptyState);
    }

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

  const appsHTML = visibleApps
    .map((app) => {
      const isInstalled = installedApps.has(app.name);
      return renderAppCard(app, isInstalled);
    })
    .join('');

  appsGrid.innerHTML = `
    <div style="height: ${totalHeight}px; position: relative;">
      <div class="apps-grid-spacer" style="height: ${topSpacerHeight}px;"></div>
      <div class="apps-grid-container">
        ${appsHTML}
      </div>
      <div class="apps-grid-spacer" style="height: ${bottomSpacerHeight}px;"></div>
    </div>
  `;

  appsGrid.querySelectorAll('.app-card').forEach((card) => {
    card.addEventListener('click', () => {
      const btn = card.querySelector('.app-button') as HTMLElement;
      if (btn && btn.dataset.app) {
        const appName = btn.dataset.app;
        const app = allAppsMap.get(appName); // Optimization: O(1) lookup instead of O(N)
        if (app) openAppDetail(app);
      }
    });
  });

  appsGrid.querySelectorAll('.app-button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const appName = (btn as HTMLElement).dataset.app;
      const appType = (btn as HTMLElement).dataset.type;
      if (!appName || !appType) return;

      const isInstalled = installedApps.has(appName);

      if (isInstalled) {
        ipcRenderer.send('uninstall-app', appName, appType);
      } else {
        ipcRenderer.send('install-app', appName, appType);
      }

      if (!terminalVisible) {
        toggleTerminal();
      }
    });
  });
}

function renderAppCard(app: App, isInstalled: boolean): string {
  return `
    <div class="app-card">
      <div>
        <div class="app-card-header">
          <div class="app-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
            </svg>
          </div>
          <span class="app-version">v${escapeHtml(truncateVersion(app.version)) || 'N/A'}</span>
        </div>
        <h3 class="app-title">${escapeHtml(app.name)}</h3>
        <p class="app-description">${escapeHtml(
          app.description || uiTranslations.noDescription
        )}</p>
      </div>
      <div class="app-actions">
        <button class="app-button ${isInstalled ? 'installed' : ''}" 
                data-app="${escapeHtml(app.name)}"
                data-type="${escapeHtml(app.type)}">
          ${escapeHtml(isInstalled ? uiTranslations.delete : uiTranslations.install)}
        </button>
        ${
          app.homepage
            ? `
          <a href="${app.homepage}" target="_blank" class="external-link" title="Open homepage">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        `
            : ''
        }
      </div>
    </div>
  `;
}

function openAppDetail(app: App): void {
  const isInstalled = installedApps.has(app.name);

  sidebarTitle.textContent = app.name;
  sidebarVersion.textContent = `v${truncateVersion(app.version) || 'N/A'}`;
  sidebarType.textContent = app.type;
  sidebarDescription.textContent = app.description || uiTranslations.noDescription + '.';

  if (app.homepage) {
    sidebarHomepage.href = app.homepage;
    sidebarHomepage.style.display = 'inline-flex';
  } else {
    sidebarHomepage.style.display = 'none';
  }

  sidebarActions.innerHTML = '';
  const actionBtn = document.createElement('button');
  actionBtn.className = `app-button ${isInstalled ? 'installed' : ''}`;
  actionBtn.dataset.app = app.name;
  actionBtn.dataset.type = app.type;
  actionBtn.style.width = '100%';
  actionBtn.textContent = isInstalled ? uiTranslations.delete : uiTranslations.install;
  sidebarActions.appendChild(actionBtn);

  if (actionBtn) {
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const appName = (actionBtn as HTMLElement).dataset.app;
      const appType = (actionBtn as HTMLElement).dataset.type;
      if (!appName || !appType) return;

      if (isInstalled) {
        ipcRenderer.send('uninstall-app', appName, appType);
      } else {
        ipcRenderer.send('install-app', appName, appType);
      }

      closeSidebar();
      if (!terminalVisible) {
        toggleTerminal();
      }
    });
  }

  appSidebar.classList.add('visible');
  sidebarOverlay.classList.add('visible');

  // Reset details state
  sidebarExtendedDetails.style.display = 'block';
  sidebarDetailsLoader.style.display = 'none';
  sidebarSize.textContent = uiTranslations.loading;
  sidebarDependencies.textContent = uiTranslations.loading;
  sidebarGithubStatsRow.style.display = 'none';
  sidebarVulnRow.style.display = 'none';

  ipcRenderer.send('get-app-details', app.name, app.type);
}

function closeSidebar(): void {
  appSidebar.classList.remove('visible');
  sidebarOverlay.classList.remove('visible');
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

  // Optimization: Use insertAdjacentHTML instead of innerHTML += to avoid O(N^2) DOM serialization overhead
  terminalOutput.insertAdjacentHTML(
    'beforeend',
    `<span class="terminal-prompt">${terminalPrompt}</span> ${escapeHtml(command)}\n`
  );
  terminalOutput.scrollTop = terminalOutput.scrollHeight;

  ipcRenderer.send('execute-command', command);

  setTimeout(() => {
    commandToRun = null;
  }, 100);
}

function escapeHtml(text: string): string {
  if (text == null) return '';

  // Optimization: Fast-path for strings with no HTML characters using regex exec,
  // followed by a manual char-code loop which is roughly 2x faster than String.replace
  // with a replacement map, avoiding memory allocations and garbage collection overhead.
  const str = String(text);
  const match = /[&<>"']/.exec(str);
  if (!match) return str;

  const len = str.length;
  let res = '';
  let lastIndex = 0;

  for (let i = match.index; i < len; i++) {
      const char = str.charCodeAt(i);
      let escape;
      if (char === 38) escape = '&amp;';      // &
      else if (char === 60) escape = '&lt;';  // <
      else if (char === 62) escape = '&gt;';  // >
      else if (char === 34) escape = '&quot;';// "
      else if (char === 39) escape = '&#39;'; // '
      else continue;

      res += str.substring(lastIndex, i) + escape;
      lastIndex = i + 1;
  }

  return res + str.substring(lastIndex, len);
}

// Version truncation utility (copy of shared util in src/utils/format.ts)
function truncateVersion(version: string | null | undefined, maxLength: number = 15): string {
  if (!version) {
    return '';
  }
  const len = version.length;
  if (len <= maxLength) {
    return version;
  }
  if (maxLength <= 3) {
    return version.substring(0, maxLength);
  }
  const available = maxLength - 3;
  // Optimization: Use bitwise right shift for faster integer division
  const rightLen = available >> 1;
  const leftLen = available - rightLen;
  return version.substring(0, leftLen) + '...' + version.substring(len - rightLen);
}

function updateDashboardView(): void {
  // 1. Summary Card - Installed apps breakdown
  const installedCount = installedApps.size;
  if (dashInstalledCount) {
    dashInstalledCount.textContent = String(installedCount);
  }

  // Count formulas vs casks
  let caskCount = 0;
  let formulaCount = 0;
  for (const appName of installedApps) {
    const app = allAppsMap.get(appName); // Optimization: O(1) lookup instead of O(N)
    if (app) {
      if (app.type === 'cask') {
        caskCount++;
      } else {
        formulaCount++;
      }
    }
  }

  if (dashCaskCount) dashCaskCount.textContent = String(caskCount);
  if (dashFormulaCount) dashFormulaCount.textContent = String(formulaCount);

  if (dashBreakdownProgress) {
    const total = caskCount + formulaCount || 1;
    const percent = (caskCount / total) * 100;
    dashBreakdownProgress.style.width = `${percent}%`;
  }

  // 2. Storage Card - Cache size
  if (dashCacheSize) {
    const sizeInMB = cacheSize / (1024 * 1024);
    if (sizeInMB > 1024) {
      dashCacheSize.textContent = `${(sizeInMB / 1024).toFixed(1)} GB`;
    } else {
      dashCacheSize.textContent = `${sizeInMB.toFixed(1)} MB`;
    }
  }

  // 3. Updates Card
  const updatesCount = outdatedApps.length;
  if (dashUpdatesCount) {
    dashUpdatesCount.textContent = String(updatesCount);
  }

  if (dashUpdatesMeta) {
    if (updatesCount === 0) {
      dashUpdatesMeta.textContent = uiTranslations.allUpToDate;
      if (dashUpdatesActions) dashUpdatesActions.style.display = 'none';
    } else {
      dashUpdatesMeta.textContent = `${updatesCount} ${updatesCount > 1 ? uiTranslations.updates : uiTranslations.update} ${uiTranslations.available}.`;
      if (dashUpdatesActions) dashUpdatesActions.style.display = 'flex';
    }
  }
}

function renderUpdatesView(): void {
  const updatesCount = outdatedApps.length;

  if (updatesUpgradeAllBtn) {
    updatesUpgradeAllBtn.style.display = updatesCount > 0 ? 'inline-flex' : 'none';
  }

  if (updatesCount === 0) {
    if (updatesEmptyState) updatesEmptyState.style.display = 'flex';
    if (updatesTable) updatesTable.style.display = 'none';
    return;
  }

  if (updatesEmptyState) updatesEmptyState.style.display = 'none';
  if (updatesTable) updatesTable.style.display = 'table';

  if (updatesTableBody) {
    updatesTableBody.innerHTML = outdatedApps
      .map((app) => {
        return `
          <tr>
            <td>
              <div class="updates-app-name">${escapeHtml(app.name)}</div>
            </td>
            <td>
              <span class="updates-app-type">${app.type}</span>
            </td>
            <td>
              <span class="updates-version-badge">${escapeHtml(truncateVersion(app.installedVersion))}</span>
            </td>
            <td>
              <span class="updates-version-badge latest">${escapeHtml(truncateVersion(app.latestVersion))}</span>
            </td>
            <td style="text-align: right;">
              <button class="dashboard-action-btn primary action-upgrade-btn" 
                      data-app="${escapeHtml(app.name)}" 
                      data-type="${escapeHtml(app.type)}">
                ${escapeHtml(uiTranslations.upgrade)}
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    updatesTableBody.querySelectorAll('.action-upgrade-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).dataset.app;
        const type = (btn as HTMLElement).dataset.type;
        if (name && type) {
          upgradeApp(name, type);
        }
      });
    });
  }
}

function updateUpdatesBadge(): void {
  const updatesCount = outdatedApps.length;
  if (updatesBadge) {
    if (updatesCount > 0) {
      updatesBadge.textContent = String(updatesCount);
      updatesBadge.style.display = 'inline-block';
    } else {
      updatesBadge.style.display = 'none';
    }
  }
}

function upgradeAll(): void {
  if (!terminalVisible) {
    toggleTerminal();
  }
  terminalOutput.insertAdjacentHTML(
    'beforeend',
    `<span class="terminal-prompt">${terminalPrompt}</span> ${uiTranslations.upgradingAll}\n`
  );
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  ipcRenderer.send('upgrade-all');
}

function upgradeApp(name: string, type: string): void {
  if (!terminalVisible) {
    toggleTerminal();
  }
  terminalOutput.insertAdjacentHTML(
    'beforeend',
    `<span class="terminal-prompt">${terminalPrompt}</span> ${uiTranslations.upgrading} ${escapeHtml(name)}...\n`
  );
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  ipcRenderer.send('upgrade-app', name, type);
}

function renderServices(services: any[]): void {
  servicesLoading.style.display = 'none';

  if (!services || services.length === 0) {
    servicesEmptyState.style.display = 'flex';
    servicesTable.style.display = 'none';
    return;
  }

  servicesEmptyState.style.display = 'none';
  servicesTable.style.display = 'table';
  servicesTableBody.innerHTML = '';

  services.forEach((service) => {
    const tr = document.createElement('tr');

    // Status badge class
    let statusClass = 'status-stopped';
    let statusText = uiTranslations.stopped;
    if (
      service.status.toLowerCase() === 'started' ||
      service.status.toLowerCase() === 'running'
    ) {
      statusClass = 'status-started';
      statusText = uiTranslations.started;
    } else if (service.status.toLowerCase() === 'error') {
      statusClass = 'status-error';
      statusText = uiTranslations.error;
    } else if (service.status.toLowerCase() === 'none') {
      statusClass = 'status-stopped';
      statusText = uiTranslations.stopped;
    }

    tr.innerHTML = `
      <td>
        <div class="services-name">${escapeHtml(service.name)}</div>
      </td>
      <td>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </td>
      <td>
        ${escapeHtml(service.user || '-')}
      </td>
      <td style="text-align: right;">
        <button class="services-action-btn start-btn" data-service="${escapeHtml(service.name)}" ${statusText === uiTranslations.started ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          ${uiTranslations.start}
        </button>
        <button class="services-action-btn stop-btn" data-service="${escapeHtml(service.name)}" ${statusText !== uiTranslations.started ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="6" y="6" width="12" height="12"></rect></svg>
          ${uiTranslations.stop}
        </button>
        <button class="services-action-btn restart-btn" data-service="${escapeHtml(service.name)}" ${statusText !== uiTranslations.started ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
          ${uiTranslations.restart}
        </button>
      </td>
    `;

    servicesTableBody.appendChild(tr);
  });

  // Attach event listeners
  const startBtns = servicesTableBody.querySelectorAll('.start-btn');
  const stopBtns = servicesTableBody.querySelectorAll('.stop-btn');
  const restartBtns = servicesTableBody.querySelectorAll('.restart-btn');

  startBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const serviceName = target.dataset.service;
      if (serviceName) {
        target.disabled = true;
        ipcRenderer.send('execute-service-action', 'start', serviceName);
      }
    });
  });

  stopBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const serviceName = target.dataset.service;
      if (serviceName) {
        target.disabled = true;
        ipcRenderer.send('execute-service-action', 'stop', serviceName);
      }
    });
  });

  restartBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const serviceName = target.dataset.service;
      if (serviceName) {
        target.disabled = true;
        ipcRenderer.send('execute-service-action', 'restart', serviceName);
      }
    });
  });
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

    // Auto-poll for updates
    setInterval(() => {
      if (ipcRenderer) {
        ipcRenderer.send('get-outdated-apps');
      }
    }, 60000);
  });
} else {
  // DOM already loaded
  console.log('[Renderer] DOM already loaded, initializing immediately');
  if (ipcRenderer) {
    ipcRenderer.send('get-terminal-prompt');
    ipcRenderer.send('get-log-path');
  }
  init();

  // Auto-poll for updates
  setInterval(() => {
    if (ipcRenderer) {
      ipcRenderer.send('get-outdated-apps');
    }
  }, 60000);
}
