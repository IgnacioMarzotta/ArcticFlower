const fs = require('fs');
const path = require('path');

const templates = {};
for (const file of fs.readdirSync(__dirname)) {
  if (file === 'index.js') continue;
  const mod = require(path.join(__dirname, file));
  templates[mod.type] = mod;
}
module.exports = templates;