const path = require('path');
const express = require('express');

function serveAngular(app) {
  const distPath = path.join(__dirname, '../../frontend/dist/frontend');

  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

module.exports = serveAngular;
