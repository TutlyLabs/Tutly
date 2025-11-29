require(["vs/workbench/workbench.web.main"], function (workbench) {
  // Use the product configuration already loaded in window.product
  const config = window.product || {};

  // Configure for standalone playground mode  
  config.commands = [
    {
      id: "tutly.getServerPort",
      handler: () => 4242,
    },
    {
      id: "tutly.getServerHost",
      handler: () => "localhost",
    },
  ];

  // Configuration defaults for playground
  config.configurationDefaults = {
    ...(config.configurationDefaults || {}),
    "tutly.server.port": 4242,
    "tutly.server.host": "localhost",
    "tutly.server.apiKey": "tutly-dev-key",
    "tutly.server.autoConnect": true,
    "workbench.colorTheme": "Default Dark Modern",
    "files.autoSave": "afterDelay",
    "editor.minimap.enabled": false,
    "workbench.activityBar.location": "default",
  };

  // Create the workbench
  workbench.create(document.body, config);

  console.log('Tutly Playgrounds - VSCode Web initialized');
  console.log('Connecting to localhost:4242');
});
