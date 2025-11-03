var express = require('express')
var serveStatic = require('serve-static')
var path = require('path')

var staticBasePath = './';
var workspaceRoot = path.resolve('../../');

var app = express()
app.use('/tutly-vscode-web', serveStatic(path.join(workspaceRoot, 'node_modules/vscode-web')))

app.use(serveStatic(staticBasePath))

app.listen(8080)
console.log('Listening on port 8080');