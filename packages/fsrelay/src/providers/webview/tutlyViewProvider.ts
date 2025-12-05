import * as vscode from 'vscode';
import { AssignmentApiClient, AssignmentDetails } from '../../api';

export class TutlyViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tutly.webview';
  private _webview: vscode.Webview | undefined;

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')],
    };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

    // Store webview reference for sending messages back
    this._webview = webviewView.webview;

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'info':
          vscode.window.showInformationMessage(data.message);
          break;
        case 'error':
          vscode.window.showErrorMessage(data.message);
          break;
        case 'runTests':
          await this._handleRunTests();
          break;
        case 'discoverTests':
          await this._handleDiscoverTests();
          break;
      }
    });
  }

  private async _fetchAssignmentData(
    assignmentId: string,
    authToken: string
  ): Promise<AssignmentDetails | null> {
    try {
      let webOrigin: string | undefined;
      try {
        webOrigin = await vscode.commands.executeCommand<string>('tutlyfs.getWebOrigin');
      } catch (err) {
        webOrigin = undefined;
      }

      if (!webOrigin) {
        console.error('Tutly web origin is not configured');
        return null;
      }

      const client = new AssignmentApiClient(webOrigin, authToken);
      return await client.getAssignmentDetails(assignmentId, webOrigin, authToken);
    } catch (error) {
      console.error('Failed to fetch assignment data:', error);
      return null;
    }
  }

  private async _getHtmlForWebview(webview: vscode.Webview) {
    // Read the webview assets from dist directory
    const distPath = vscode.Uri.joinPath(this._extensionUri, 'dist');

    let cssContent = '';
    let jsContent = '';

    try {
      // Read CSS and JS files using VSCode workspace API
      const cssUri = vscode.Uri.joinPath(distPath, 'webview.css');
      const jsUri = vscode.Uri.joinPath(distPath, 'webview.js');

      // Read files as Uint8Array and convert to string
      const cssData = await vscode.workspace.fs.readFile(cssUri);
      cssContent = new TextDecoder().decode(cssData);

      const jsData = await vscode.workspace.fs.readFile(jsUri);
      jsContent = new TextDecoder().decode(jsData);
    } catch (error) {
      console.error('Failed to read webview assets:', error);
    }

    // Get assignment ID and auth token
    let assignmentId = '';
    let authToken = '';
    try {
      assignmentId = (await vscode.commands.executeCommand<string>('tutlyfs.getAssignmentId')) ?? '';
    } catch (err) {
      assignmentId = '';
    }

    try {
      authToken = (await vscode.commands.executeCommand<string>('tutlyfs.getAuthToken')) ?? '';
    } catch (err) {
      authToken = '';
    }

    // Fetch assignment data upfront
    let assignmentData: AssignmentDetails | null = null;
    if (assignmentId) {
      assignmentData = await this._fetchAssignmentData(assignmentId, authToken);
    }

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    const assignmentDataJson = assignmentData
      ? JSON.stringify(assignmentData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
      : 'null';

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src https: data:; frame-src http://localhost:* https://localhost:* http://127.0.0.1:* https://127.0.0.1:*; child-src http://localhost:* https://localhost:* http://127.0.0.1:* https://127.0.0.1:*;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${cssContent}</style>
        <title>Tutly Webview</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}">
          window.ASSIGNMENT_ID = "${assignmentId}";
          window.ASSIGNMENT_DATA = ${assignmentDataJson};
          window.vscode = acquireVsCodeApi();
          ${jsContent}
        </script>
      </body>
      </html>`;
  }

  private async _handleRunTests(): Promise<void> {
    if (!this._webview) return;

    this._webview.postMessage({ type: 'testProgress', message: 'Running tests...' });

    try {
      let serverUrl = 'http://localhost:4242';
      let testCommand = 'npm test --silent -- --reporter json';
      try {
        const config = await vscode.commands.executeCommand<any>('tutlyfs.getConfig');
        serverUrl = config?.serverUrl || 'http://localhost:4242';
        const configTestCommand = config?.tutlyConfig?.test?.command;
        if (configTestCommand) {
          testCommand = configTestCommand;
        }
      } catch {
      }

      const response = await fetch(`${serverUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: testCommand })
      });

      if (!response.ok) {
        throw new Error(`Test execution failed: ${response.statusText}`);
      }

      const results = await response.json();

      if (results.error) {
        this._webview.postMessage({
          type: 'testError',
          error: results.error + (results.message ? `: ${results.message}` : '')
        });
      } else {
        this._webview.postMessage({ type: 'testResults', data: results });
      }
    } catch (error) {
      this._webview.postMessage({
        type: 'testError',
        error: `Failed to run tests: ${error}. Make sure the CLI server is running.`
      });
    }
  }

  private async _handleDiscoverTests(): Promise<void> {
    if (!this._webview) return;

    try {
      let serverUrl = 'http://localhost:4242';
      try {
        const config = await vscode.commands.executeCommand<any>('tutlyfs.getConfig');
        serverUrl = config?.serverUrl || 'http://localhost:4242';
      } catch {
      }

      const response = await fetch(`${serverUrl}/api/test/discover`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        this._webview.postMessage({ type: 'testDiscovery', data });
      } else {
        this._webview.postMessage({ type: 'testDiscovery', data: { tests: [] } });
      }
    } catch (error) {
      this._webview.postMessage({
        type: 'testError',
        error: `Failed to discover tests: ${error}`
      });
    }
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
