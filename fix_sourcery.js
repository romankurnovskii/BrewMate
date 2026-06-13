const fs = require('fs');
let code = fs.readFileSync('src/renderer/renderer.ts', 'utf8');
code = code.replace(
  'appsGrid.innerHTML = `\n      <div class="loading">\n        <div class="loading-spinner"></div>\n        <div class="loading-message">${escapeHtml(uiTranslations.loadingApps)}</div>\n      </div>\n    `;',
  'appsGrid.textContent = "";\n    appsGrid.insertAdjacentHTML(\'beforeend\', `\n      <div class="loading">\n        <div class="loading-spinner"></div>\n        <div class="loading-message">${escapeHtml(uiTranslations.loadingApps)}</div>\n      </div>\n    `);'
);

code = code.replace(
  'appsGrid.innerHTML = `<div class="empty-state">${escapeHtml(uiTranslations.noAppsFound)}</div>`;',
  'appsGrid.textContent = "";\n    appsGrid.insertAdjacentHTML(\'beforeend\', `<div class="empty-state">${escapeHtml(uiTranslations.noAppsFound)}</div>`);'
);

code = code.replace(
  'appsGrid.innerHTML = errorHtml;',
  'appsGrid.textContent = "";\n    appsGrid.insertAdjacentHTML(\'beforeend\', errorHtml);'
);

fs.writeFileSync('src/renderer/renderer.ts', code);
