// scripts/dev-preload.js
require('ts-node').register({
    transpileOnly: true,
    project: 'electron/tsconfig.json',
});

require('../electron/preload.ts');
