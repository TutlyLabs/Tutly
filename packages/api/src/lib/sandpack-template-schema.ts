import { z } from "zod";

// Zod schema for the `tutly.json` sidecar. Validates instructor saves.

const fileFlagsSchema = z
  .object({
    hidden: z.boolean().optional(),
    active: z.boolean().optional(),
    readOnly: z.boolean().optional(),
  })
  .passthrough();

const sandpackFileSchema = z.union([
  z.string(),
  z
    .object({ code: z.string().default("") })
    .merge(fileFlagsSchema)
    .passthrough(),
]);

export const sandpackTemplateSchema = z
  .object({
    template: z.string().optional(),
    options: z
      .object({
        activeFile: z.string().optional(),
        visibleFiles: z.array(z.string()).optional(),
        editableFiles: z.array(z.string()).optional(),
        closableTabs: z.boolean().optional(),
        readOnly: z.boolean().optional(),
        showTabs: z.boolean().optional(),
        showLineNumbers: z.boolean().optional(),
        showInlineErrors: z.boolean().optional(),
        wrapContent: z.boolean().optional(),
        showRefreshButton: z.boolean().optional(),
        showConsoleButton: z.boolean().optional(),
        showConsole: z.boolean().optional(),
        showFileExplorer: z.boolean().optional(),
        bundlerURL: z.string().optional(),
      })
      .partial()
      .passthrough()
      .optional(),
    customSetup: z
      .object({
        dependencies: z.record(z.string(), z.string()).optional(),
        devDependencies: z.record(z.string(), z.string()).optional(),
        entry: z.string().optional(),
        main: z.string().optional(),
        environment: z.string().optional(),
      })
      .partial()
      .passthrough()
      .optional(),
    files: z.record(z.string(), sandpackFileSchema).optional(),
    fileMeta: z.record(z.string(), fileFlagsSchema).optional(),
  })
  .passthrough();

export type SandpackTemplateInput = z.infer<typeof sandpackTemplateSchema>;
