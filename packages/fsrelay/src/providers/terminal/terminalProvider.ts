import * as vscode from 'vscode';

let terminalCounter = 0;

export function createTutlyPseudoterminal(serverUrl: string = 'ws://localhost:4242'): vscode.Pseudoterminal {
  // Create a WebSocket-based terminal for VS Code Web compatibility
  const writeEmitter = new vscode.EventEmitter<string>();
  const closeEmitter = new vscode.EventEmitter<number | void>();
  const nameEmitter = new vscode.EventEmitter<string>();

  let ws: WebSocket | null = null;
  let isConnected = false;

  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    onDidClose: closeEmitter.event,
    onDidChangeName: nameEmitter.event,

    open: (initialDimensions) => {
      // Connect to the CLI server's WebSocket terminal endpoint
      try {
        ws = new WebSocket(`${serverUrl}/ws/terminal`);

        ws.onopen = () => {
          isConnected = true;
          writeEmitter.fire('\x1b[32m🔗 Connected to Tutly Terminal Server\x1b[0m\r\n');
          writeEmitter.fire('\x1b[36mTutly Terminal - Ready for commands\x1b[0m\r\n');

          // Send initial resize if dimensions are available
          if (initialDimensions) {
            ws?.send(JSON.stringify({
              type: 'resize',
              cols: initialDimensions.columns,
              rows: initialDimensions.rows
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case 'connected':
                writeEmitter.fire(`\x1b[32m${message.message}\x1b[0m\r\n`);
                break;
              case 'data':
                writeEmitter.fire(message.data);
                break;
              case 'exit':
                writeEmitter.fire(`\x1b[33m📤 Terminal exited with code ${message.exitCode}\x1b[0m\r\n`);
                closeEmitter.fire(message.exitCode);
                break;
              case 'error':
                writeEmitter.fire(`\x1b[31mError: ${message.message}\x1b[0m\r\n`);
                break;
            }
          } catch (error) {
            writeEmitter.fire(`\x1b[31mFailed to parse server message\x1b[0m\r\n`);
          }
        };

        ws.onclose = () => {
          isConnected = false;
          writeEmitter.fire('\x1b[33mDisconnected from Tutly Terminal Server\x1b[0m\r\n');
        };

        ws.onerror = () => {
          isConnected = false;
          writeEmitter.fire('\x1b[31mFailed to connect to Tutly Terminal Server\x1b[0m\r\n');
          writeEmitter.fire('\x1b[33mMake sure the CLI server is running: tutly playground\x1b[0m\r\n');
        };

      } catch (error) {
        writeEmitter.fire('\x1b[31mWebSocket not supported or connection failed\x1b[0m\r\n');
        writeEmitter.fire('\x1b[33mFallback: Local terminal simulation mode\x1b[0m\r\n');
        writeEmitter.fire('\x1b[36mTutly Terminal (Local Mode) - Limited functionality\x1b[0m\r\n');
        writeEmitter.fire('$ ');
      }
    },

    close: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    },

    handleInput: (data) => {
      if (ws && isConnected) {
        // Send input to the remote terminal
        ws.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      } else {
        // Fallback: echo input locally with basic simulation
        if (data === '\r') {
          writeEmitter.fire('\r\n$ ');
        } else if (data === '\x7f') { // backspace
          writeEmitter.fire('\b \b');
        } else if (data === '\x03') { // Ctrl+C
          writeEmitter.fire('^C\r\n$ ');
        } else {
          writeEmitter.fire(data);
        }
      }
    },

    setDimensions: (dimensions) => {
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: dimensions.columns,
          rows: dimensions.rows
        }));
      }
    }
  };

  return pty;
}

export function createTutlyTerminal(serverUrl?: string): vscode.Terminal {
  const pty = createTutlyPseudoterminal(serverUrl);
  const options: vscode.ExtensionTerminalOptions = {
    name: `Tutly Terminal ${++terminalCounter}`,
    pty: pty,
    isTransient: true
  };
  const terminal = vscode.window.createTerminal(options);
  return terminal;
}

export function getTerminalCounter(): number {
  return terminalCounter;
}

export function incrementTerminalCounter(): number {
  return ++terminalCounter;
}
