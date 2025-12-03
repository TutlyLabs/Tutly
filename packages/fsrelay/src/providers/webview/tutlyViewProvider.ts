import * as vscode from 'vscode';
import { AssignmentApiClient, AssignmentDetails } from '../../api';

export class TutlyViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tutly.webview';

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

    // Handle messages from the webview (for notifications only)
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'info':
          vscode.window.showInformationMessage(data.message);
          break;
        case 'error':
          vscode.window.showErrorMessage(data.message);
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
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src https: data:;">
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
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
