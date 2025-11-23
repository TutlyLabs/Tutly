require(['vs/workbench/workbench.web.main'], function (workbench) {
  const params = new URLSearchParams(window.location.search);
  const assignmentId = params.get('assignmentId');

  // Use the product configuration already loaded in window.product
  const config = window.product || {};

  // Inject commands
  config.commands = [
    {
      id: 'tutlyfs.getAssignmentId',
      handler: () => assignmentId
    },
    {
      id: 'tutlyfs.onReady',
      handler: () => {
        window.parent.postMessage({ type: 'VSCODE_READY' }, '*');
      }
    }
  ];

  // Inject configurationDefaults
  if (assignmentId) {
    config.configurationDefaults = {
      ...(config.configurationDefaults || {}),
      'tutlyfs.assignmentId': assignmentId
    };
  }

  workbench.create(document.body, config);
});
