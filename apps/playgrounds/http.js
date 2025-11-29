const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

app.use('/vscode', express.static(path.join(__dirname, 'vscode/assets')));
app.use('/vscode', express.static(path.join(__dirname, 'vscode')));

app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/playground', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/playground.html'));
});

app.get('/preflight', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/preflight.html'));
});

app.get('/', (req, res) => {
  res.redirect('/preflight');
});

app.get('*', (req, res) => {
  res.redirect('/preflight');
});

app.listen(PORT, () => {
  console.log(`🚀 Tutly Playgrounds server running at http://localhost:${PORT}`);
  console.log(`📂 Serving VSCode Web from vscode/assets`);
  console.log(`📂 Serving extensions from vscode/assets/extensions`);
  console.log(`\n👉 Visit: http://localhost:${PORT}/preflight`);
  console.log(`   Playground: http://localhost:${PORT}/playground`);
});