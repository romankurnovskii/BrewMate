const fs = require('fs');
let code = fs.readFileSync('src/renderer/renderer.ts', 'utf8');
code = code.replace(
  'appsGrid.innerHTML = `\n      <div class="loading">\n        <div class="loading-spinner"></div>\n        <div class="loading-message">${uiTranslations.loadingApps}</div>\n      </div>\n    `;',
  'appsGrid.innerHTML = `\n      <div class="loading">\n        <div class="loading-spinner"></div>\n        <div class="loading-message">${escapeHtml(uiTranslations.loadingApps)}</div>\n      </div>\n    `;'
);
fs.writeFileSync('src/renderer/renderer.ts', code);
