export const defaultPreviewPorts = [3000, 5173, 4173, 8080];

export function defaultWorkspaceConfig() {
  return {
    framework: "web",
    setupCommand: "pnpm install",
    devCommand: "pnpm dev",
    testCommand: "pnpm test",
    previewPorts: defaultPreviewPorts,
    readonlyPaths: [".tutly/**"],
    grading: {
      visibleWeight: 1,
      hiddenWeight: 1,
      autoScore: true,
    },
    publicTestMetadata: {
      runner: "local-visible",
    },
    defaultProvider: "LOCAL" as const,
  };
}

