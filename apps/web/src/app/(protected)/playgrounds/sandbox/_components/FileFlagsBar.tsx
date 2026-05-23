"use client";

import { useSandpack } from "@codesandbox/sandpack-react";
import { FileCode2, Info, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { Switch } from "@tutly/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tutly/ui/tooltip";

import { TUTLY_CONFIG_PATH, parseTutlyConfig } from "./tutlyConfigFile";

type Props = {
  filePath: string | null;
};

const HIDDEN_PATH_RE = /^\/__hidden__(\/|$)/i;
// Mirrors isSolutionPath in template-policy.ts — keep in sync.
const SOLUTION_PATH_RE = /^\/solution(\/|\.|$)|\.solution\./i;
const TEST_PATH_RE = /\.(test|spec)\.[tj]sx?$/i;

export function FileFlagsBar({ filePath }: Props) {
  const { sandpack } = useSandpack();
  const tutlyRaw =
    typeof sandpack.files[TUTLY_CONFIG_PATH] === "string"
      ? (sandpack.files[TUTLY_CONFIG_PATH] as unknown as string)
      : ((sandpack.files[TUTLY_CONFIG_PATH] as { code?: string } | undefined)
          ?.code ?? "");

  const flags = useMemo(
    () => readFlags(tutlyRaw, filePath),
    [tutlyRaw, filePath],
  );

  if (!filePath) return null;

  if (filePath === TUTLY_CONFIG_PATH) {
    return (
      <InfoStrip icon={<Sparkles className="size-3.5 text-violet-400" />}>
        <strong className="text-foreground">Template config sidecar.</strong>{" "}
        Defines Sandpack template, options, customSetup, and fileMeta. Stored at{" "}
        <code className="font-mono text-[11px]">template/tutly.json</code> in
        the bucket.{" "}
        <em className="text-foreground/80">
          Stripped server-side — students never receive it, nothing is stored in
          submissions.
        </em>{" "}
        Edit the JSON directly to fine-tune template behavior.
      </InfoStrip>
    );
  }

  if (HIDDEN_PATH_RE.test(filePath)) {
    return (
      <InfoStrip icon={<Lock className="size-3.5 text-rose-400" />}>
        <strong className="text-foreground">Hidden by path.</strong> Anything
        under <code className="font-mono text-[11px]">/__hidden__/</code> is
        stripped from the student view server-side and{" "}
        <em className="text-foreground/80">never stored in their submission</em>
        . The grading runner still receives it. Move the file out of{" "}
        <code className="font-mono text-[11px]">/__hidden__/</code> to unhide.
      </InfoStrip>
    );
  }

  if (SOLUTION_PATH_RE.test(filePath)) {
    return (
      <InfoStrip icon={<ShieldCheck className="size-3.5 text-amber-400" />}>
        <strong className="text-foreground">Solution file.</strong> Paths under{" "}
        <code className="font-mono text-[11px]">/solution/</code> or with{" "}
        <code className="font-mono text-[11px]">.solution.</code> in the name
        are stripped server-side.{" "}
        <em className="text-foreground/80">
          Students never see it; nothing is stored in their submission.
        </em>{" "}
        Available to the grading runner.
      </InfoStrip>
    );
  }

  const update = (partial: Partial<Flags>) => {
    const next = applyFlags(tutlyRaw, filePath, partial);
    sandpack.updateFile(TUTLY_CONFIG_PATH, next);
  };

  const isTest = TEST_PATH_RE.test(filePath);
  const isHidden = flags.hidden;

  return (
    <div className="border-border/60 bg-card/40 flex flex-col gap-1 border-b px-3 py-1.5 text-xs">
      <div className="flex items-center gap-4">
        <Toggle
          label="Visible by default"
          tooltip="Adds this path to options.visibleFiles. Sandpack opens it as a tab when the student first loads the assignment. File is sent to the student and stored in their submission."
          checked={flags.visible}
          onChange={(v) => update({ visible: v })}
        />
        <Toggle
          label="Hidden"
          tooltip="Sets fileMeta.hidden: true. Stripped server-side — student never sees this in the tree, tabs, or bundle. Not stored in their submission. The grading runner still receives it. Alternative: put the file under /__hidden__/ — same behavior via path."
          checked={flags.hidden}
          onChange={(v) => update({ hidden: v })}
        />
        <Toggle
          label="Read-only"
          tooltip="Sets fileMeta.readOnly: true. Student sees the file but Monaco refuses edits. File IS sent to the student and stored in their submission as-is."
          checked={flags.readOnly}
          onChange={(v) => update({ readOnly: v })}
        />
        <Toggle
          label="Active"
          tooltip="Sets options.activeFile to this path. Sandpack focuses this tab on first load. Only one file can be active at a time."
          checked={flags.active}
          onChange={(v) => update({ active: v })}
        />
      </div>
      {isTest && (
        <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <FileCode2 className="size-3 text-emerald-400" />
          <span>
            <strong className="text-foreground">Test file.</strong>{" "}
            {isHidden
              ? "Hidden — student never sees it. Runner uses it for grading. Not stored in any submission."
              : "Visible to the student so they can read it. Runner uses it for grading. Always served from the template — student edits are not stored in their submission."}
          </span>
        </div>
      )}
    </div>
  );
}

function InfoStrip({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border-border/60 bg-card/40 text-muted-foreground flex items-start gap-2 border-b px-3 py-1.5 text-[11px] leading-snug">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1">{children}</div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground/60 mt-0.5 cursor-help">
            <Info className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          File behavior is determined by its path. Move/rename the file to
          change how the server treats it.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function Toggle({
  label,
  tooltip,
  checked,
  onChange,
}: {
  label: string;
  tooltip: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <Switch
            checked={checked}
            onCheckedChange={(v) => onChange(v === true)}
            className="data-[state=checked]:bg-primary scale-75"
          />
          <span>{label}</span>
        </label>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

type Flags = {
  hidden: boolean;
  visible: boolean;
  readOnly: boolean;
  active: boolean;
};

function readFlags(tutlyRaw: string, filePath: string | null): Flags {
  if (!filePath) {
    return { hidden: false, visible: false, readOnly: false, active: false };
  }
  const parsed = parseTutlyConfig(tutlyRaw);
  if (!parsed.ok) {
    return { hidden: false, visible: false, readOnly: false, active: false };
  }
  const opts = (parsed.config.options ?? {}) as {
    visibleFiles?: string[];
    activeFile?: string;
  };
  const fileMeta =
    ((parsed.config as { fileMeta?: Record<string, Record<string, unknown>> })
      .fileMeta ?? {})[filePath] ?? {};
  return {
    hidden: fileMeta.hidden === true,
    readOnly: fileMeta.readOnly === true,
    visible: (opts.visibleFiles ?? []).includes(filePath),
    active: opts.activeFile === filePath,
  };
}

function applyFlags(
  tutlyRaw: string,
  filePath: string,
  partial: Partial<Flags>,
): string {
  const parsed = parseTutlyConfig(tutlyRaw);
  const base = parsed.ok ? parsed.config : {};
  const config = { ...(base as Record<string, unknown>) };
  const options = { ...((config.options as Record<string, unknown>) ?? {}) };
  const fileMetaParent = (
    config as { fileMeta?: Record<string, Record<string, unknown>> }
  ).fileMeta;
  const fileMeta: Record<string, Record<string, unknown>> = {
    ...(fileMetaParent ?? {}),
  };
  const thisFileMeta: Record<string, unknown> = {
    ...(fileMeta[filePath] ?? {}),
  };

  if ("hidden" in partial) {
    if (partial.hidden) thisFileMeta.hidden = true;
    else delete thisFileMeta.hidden;
  }
  if ("readOnly" in partial) {
    if (partial.readOnly) thisFileMeta.readOnly = true;
    else delete thisFileMeta.readOnly;
  }
  if (Object.keys(thisFileMeta).length > 0) fileMeta[filePath] = thisFileMeta;
  else delete fileMeta[filePath];

  if ("visible" in partial) {
    const list = new Set(
      ((options.visibleFiles as string[]) ?? []) as string[],
    );
    if (partial.visible) list.add(filePath);
    else list.delete(filePath);
    options.visibleFiles = Array.from(list);
  }
  if ("active" in partial) {
    if (partial.active) options.activeFile = filePath;
    else if (options.activeFile === filePath) delete options.activeFile;
  }

  config.options = options;
  if (Object.keys(fileMeta).length > 0) {
    (config as { fileMeta?: unknown }).fileMeta = fileMeta;
  } else {
    delete (config as { fileMeta?: unknown }).fileMeta;
  }
  return JSON.stringify(config, null, 2);
}
