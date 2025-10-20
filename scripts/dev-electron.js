// scripts/dev-electron.js
require('ts-node').register({
    transpileOnly: true,
    project: 'electron/tsconfig.json',
});

require('../electron/main.ts');
