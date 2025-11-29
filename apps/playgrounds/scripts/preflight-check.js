const CONFIG = {
  PORT: 4242,
  POLL_INTERVAL: 2000,
  TIMEOUT: 60000,
  SUCCESS_PAGE: '/playground'
};


class PreflightChecker {
  constructor() {
    this.startTime = Date.now();
    this.isChecking = false;
    this.checks = {
      health: false,
      fileAccess: false,
      terminalAccess: false
    };
  }

  getBaseUrl() {
    return `http://localhost:${CONFIG.PORT}`;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/health`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return false;
    }
  }

  async checkFileAccess() {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/files`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'x-api-key': 'tutly-dev-key'
        }
      });
      return response.ok;
    } catch (error) {
      console.log('❌ File access check failed:', error.message);
      return false;
    }
  }

  async checkTerminalAccess() {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`ws://localhost:${CONFIG.PORT}/ws/terminal`);

        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          console.log('❌ Terminal WebSocket check failed');
          resolve(false);
        };
      } catch (error) {
        console.log('❌ Terminal access check failed:', error.message);
        resolve(false);
      }
    });
  }

  async runAllChecks() {
    const [health, fileAccess, terminalAccess] = await Promise.all([
      this.checkHealth(),
      this.checkFileAccess(),
      this.checkTerminalAccess()
    ]);

    this.checks = { health, fileAccess, terminalAccess };

    console.log('📊 Preflight check results:', {
      '🏥 Health': health ? '✅' : '❌',
      '📁 File Access': fileAccess ? '✅' : '❌',
      '💻 Terminal Access': terminalAccess ? '✅' : '❌'
    });

    return health && fileAccess && terminalAccess;
  }

  async startPolling() {
    if (this.isChecking) return;

    this.isChecking = true;
    console.log(`🔍 Starting preflight check on port ${CONFIG.PORT}...`);

    const poll = async () => {
      const elapsed = Date.now() - this.startTime;
      if (elapsed > CONFIG.TIMEOUT) {
        console.warn('⏱️ Preflight check timed out');
        console.warn('Failed checks:', this.checks);
        this.isChecking = false;
        return;
      }

      const allChecksPassed = await this.runAllChecks();

      if (allChecksPassed) {
        console.log('✅ All systems ready! Redirecting to playground...');
        this.onSuccess();
      } else {
        setTimeout(poll, CONFIG.POLL_INTERVAL);
      }
    };

    poll();
  }

  onSuccess() {
    this.isChecking = false;

    setTimeout(() => {
      window.location.href = CONFIG.SUCCESS_PAGE;
    }, 500);
  }

  stop() {
    this.isChecking = false;
  }
}

const checker = new PreflightChecker();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checker.startPolling();
  });
} else {
  checker.startPolling();
}

window.preflightChecker = checker;
