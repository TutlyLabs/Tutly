import * as vscode from 'vscode';

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
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'info':
          vscode.window.showInformationMessage(data.message);
          break;
        case 'error':
          vscode.window.showErrorMessage(data.message);
          break;
        case 'fetchAssignment':
          try {
            const assignmentData = await this._fetchAssignment(data.assignmentId, data.authToken);
            webviewView.webview.postMessage({
              type: 'assignmentData',
              data: assignmentData,
            });
          } catch (error) {
            webviewView.webview.postMessage({
              type: 'assignmentError',
              error: error instanceof Error ? error.message : 'Failed to fetch assignment'
            });
          }
          break;
      }
    });
  }

  private async _fetchAssignment(assignmentId: string, authToken: string) {
    const webOrigin = await vscode.commands.executeCommand<string>('tutlyfs.getWebOrigin');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${webOrigin}/api/trpc/assignments.getAssignmentDetailsForSubmission?input=${encodeURIComponent(JSON.stringify({ id: assignmentId }))}`,
      {
        headers,
        credentials: 'include'
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.result?.data?.error) {
      throw new Error(data.result.data.error);
    }

    return data.result?.data;
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

    const assignmentId = await vscode.commands.executeCommand<string>('tutlyfs.getAssignmentId');
    const authToken = await vscode.commands.executeCommand<string>('tutlyfs.getAuthToken');

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

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
          window.AUTH_TOKEN = "${authToken}";
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
