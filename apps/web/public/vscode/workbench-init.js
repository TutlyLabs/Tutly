require(["vs/workbench/workbench.web.main"], function (workbench) {
  const params = new URLSearchParams(window.location.search);

  // Parse config from URL parameter (base64-encoded JSON)
  let tutlyConfig = {
    mode: "fsrelay",
    serverUrl: "http://localhost:4242",
    apiKey: "tutly-dev-key",
    webOrigin: window.location.origin,
    authToken: window.localStorage.getItem("bearer_token"),
  };

  const configParam = params.get("config");
  if (configParam) {
    try {
      const decoded = JSON.parse(atob(configParam));
      tutlyConfig = {
        ...tutlyConfig,
        ...decoded,
      };
    } catch (error) {
      console.error("Failed to parse config parameter:", error);
    }
  }

  const assignmentId = params.get("assignmentId");
  if (assignmentId) {
    tutlyConfig.assignmentId = assignmentId;
    tutlyConfig.mode = "gitfs";
  }

  // Use the product configuration already loaded in window.product
  const config = window.product || {};

  // Inject commands
  config.commands = [
    {
      id: "tutlyfs.getConfig",
      handler: () => tutlyConfig,
    },
    {
      id: "tutlyfs.getAssignmentId",
      handler: () => tutlyConfig.assignmentId,
    },
    {
      id: "tutlyfs.getWebOrigin",
      handler: () => tutlyConfig.webOrigin,
    },
    {
      id: "tutlyfs.onReady",
      handler: () => {
        window.parent.postMessage({ type: "VSCODE_READY" }, "*");
      },
    },
    {
      id: "tutlyfs.getWebWindow",
      handler: () => window,
    },
    {
      id: "tutlyfs.getAuthToken",
      handler: () => tutlyConfig.authToken,
    },
    {
      id: "tutlyfs.getMode",
      handler: () => tutlyConfig.mode,
    },
    {
      id: "tutlyfs.getServerUrl",
      handler: () => tutlyConfig.serverUrl,
    },
    {
      id: "tutlyfs.getApiKey",
      handler: () => tutlyConfig.apiKey,
    },
  ];

  // Inject configurationDefaults
  config.configurationDefaults = {
    ...(config.configurationDefaults || {}),
    "tutlyfs.mode": tutlyConfig.mode,
    "tutlyfs.assignmentId": tutlyConfig.assignmentId,
    "tutlyfs.webOrigin": tutlyConfig.webOrigin,
    "tutlyfs.authToken": tutlyConfig.authToken,
    "tutlyfs.serverUrl": tutlyConfig.serverUrl,
    "tutlyfs.apiKey": tutlyConfig.apiKey,
  }

  // Listen for commands from the parent window
  window.addEventListener("message", (event) => {
    if (event.data?.type === "TRIGGER_COMMAND") {
      const command = event.data.command;
      const workbenchEl = document.querySelector(".monaco-workbench");
      if (workbenchEl) {
        const isMac = navigator.platform.toUpperCase().includes("MAC");
        let char;
        switch (command) {
          case "run":
            char = "r";
            break;
          case "submit":
            char = "s";
            break;
          case "save":
            char = "v";
            break;
        }

        if (char) {
          const keyEvent = new KeyboardEvent("keydown", {
            key: char,
            code: `Key${char.toUpperCase()}`,
            ctrlKey: !isMac,
            metaKey: isMac,
            altKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
            view: window,
            composed: true,
          });

          workbenchEl.dispatchEvent(keyEvent);
        }
      }
    }
  });

  workbench.create(document.body, config);
});
