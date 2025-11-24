require(["vs/workbench/workbench.web.main"], function (workbench) {
  const params = new URLSearchParams(window.location.search);
  const assignmentId = params.get("assignmentId");

  // Use the product configuration already loaded in window.product
  const config = window.product || {};

  // Inject commands
  config.commands = [
    {
      id: "tutlyfs.getAssignmentId",
      handler: () => assignmentId,
    },
    {
      id: "tutlyfs.getWebOrigin",
      handler: () => window.location.origin,
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
      handler: () => window.localStorage.getItem("bearer_token"),
    },
  ];

  // Inject configurationDefaults
  if (assignmentId) {
    config.configurationDefaults = {
      ...(config.configurationDefaults || {}),
      "tutlyfs.assignmentId": assignmentId,
      "tutlyfs.webOrigin": window.location.origin,
      "tutlyfs.authToken": window.localStorage.getItem("bearer_token"),
    };
  } else {
    config.configurationDefaults = {
      ...(config.configurationDefaults || {}),
      "tutlyfs.webOrigin": window.location.origin,
      "tutlyfs.authToken": window.localStorage.getItem("bearer_token"),
    };
  }

  // Listen for commands from the parent window
  window.addEventListener("message", (event) => {
    if (event.data?.type === "TRIGGER_COMMAND") {
      const command = event.data.command;
      const workbenchEl = document.querySelector(".monaco-workbench");
      if (workbenchEl) {
        const isMac = navigator.platform.toUpperCase().includes("MAC");
        const char = command === "run" ? "r" : "s";

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
  });

  workbench.create(document.body, config);
});
