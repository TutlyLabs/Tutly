import {
  existsAtPrefix,
  readFilesMap,
  writeFilesMap,
  type FilesMap,
} from "./files-map";
import { Keys, type Locator } from "./keys";
import {
  readSandpack,
  writeSandpack,
  type SandpackTemplateShape,
} from "./sandpack";

export { env } from "./env";
export type { FilesMap, Locator, SandpackTemplateShape };

export function writeSandpackTemplate(
  loc: Locator,
  template: SandpackTemplateShape,
): Promise<void> {
  return writeSandpack(Keys.template(loc), template);
}

export function readSandpackTemplate(
  loc: Locator,
): Promise<SandpackTemplateShape | null> {
  return readSandpack(Keys.template(loc));
}

export function writeHiddenTests(loc: Locator, files: FilesMap): Promise<void> {
  return writeFilesMap(Keys.hiddenTests(loc), files);
}

export function readHiddenTests(loc: Locator): Promise<FilesMap | null> {
  return readFilesMap(Keys.hiddenTests(loc));
}

export function writeSubmission(
  loc: Locator,
  submissionId: string,
  files: FilesMap,
): Promise<void> {
  return writeFilesMap(Keys.submission(loc, submissionId), files);
}

export function readSubmission(
  loc: Locator,
  submissionId: string,
): Promise<FilesMap | null> {
  return readFilesMap(Keys.submission(loc, submissionId));
}

export function hasTemplate(loc: Locator): Promise<boolean> {
  return existsAtPrefix(Keys.template(loc));
}

export function hasHiddenTests(loc: Locator): Promise<boolean> {
  return existsAtPrefix(Keys.hiddenTests(loc));
}

export function hasSubmission(
  loc: Locator,
  submissionId: string,
): Promise<boolean> {
  return existsAtPrefix(Keys.submission(loc, submissionId));
}
