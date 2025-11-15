const path = require('path');
const fs = require('fs');

module.exports = {
  target: 'webworker',
  mode: 'none',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, '../../apps/playgrounds/extensions/fsrelay/dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      "buffer": require.resolve("buffer/"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "path": require.resolve("path-browserify"),
      "querystring": require.resolve("querystring-es3"),
      "url": require.resolve("url/"),
      "crypto": false,
      "fs": false,
      "net": false,
      "tls": false
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log"
  },
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('CopyAssets', () => {
          const rootDestDir = path.resolve(__dirname, '../../apps/playgrounds/extensions/fsrelay');

          // Ensure root directory exists
          if (!fs.existsSync(rootDestDir)) {
            fs.mkdirSync(rootDestDir, { recursive: true });
          }

          // Copy package.json to root
          fs.copyFileSync(
            path.resolve(__dirname, 'package.json'),
            path.resolve(rootDestDir, 'package.json')
          );

          // Copy package.nls.json to root
          fs.copyFileSync(
            path.resolve(__dirname, 'package.nls.json'),
            path.resolve(rootDestDir, 'package.nls.json')
          );

          // Copy directories
          const copyDir = (src, dest) => {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (let entry of entries) {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);
              entry.isDirectory() ? copyDir(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
            }
          };

          // Copy media and themes to root
          copyDir(path.resolve(__dirname, 'media'), path.resolve(rootDestDir, 'media'));
          copyDir(path.resolve(__dirname, 'themes'), path.resolve(rootDestDir, 'themes'));

          console.log('✅ Assets copied to playgrounds/extensions/fsrelay');
        });
      }
    }
  ]
};