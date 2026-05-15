"use client";

import type { ComponentType } from "react";
import {
  SiAngular,
  SiCss3,
  SiDocker,
  SiGit,
  SiGo,
  SiGraphql,
  SiHtml5,
  SiJavascript,
  SiJson,
  SiKotlin,
  SiLess,
  SiMarkdown,
  SiMdx,
  SiNextdotjs,
  SiNodedotjs,
  SiPhp,
  SiPrettier,
  SiPrisma,
  SiPython,
  SiReact,
  SiRedis,
  SiRuby,
  SiRust,
  SiSass,
  SiSvelte,
  SiSvg,
  SiSwift,
  SiTailwindcss,
  SiToml,
  SiTypescript,
  SiVuedotjs,
  SiYaml,
} from "react-icons/si";
import { TbBrandCpp, TbBrandCSharp } from "react-icons/tb";
import { FaJava } from "react-icons/fa6";
import {
  FileCode2,
  FileImage,
  FileLock2,
  FileText,
  FileTerminal,
  Folder,
  FolderOpen,
  Settings as Cog,
  Lock,
} from "lucide-react";

import { getFileMeta as getFileMetaBase } from "./fileMeta";

type IconCmp = ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

type FileIconInfo = {
  Icon: IconCmp;
  color: string;
  language: string;
};

const BY_NAME: Record<string, FileIconInfo> = {
  "package.json": { Icon: SiNodedotjs, color: "#8cc84b", language: "json" },
  "package-lock.json": {
    Icon: SiNodedotjs,
    color: "#cb3837",
    language: "json",
  },
  "pnpm-lock.yaml": { Icon: SiNodedotjs, color: "#f69220", language: "yaml" },
  "yarn.lock": { Icon: SiNodedotjs, color: "#2c8ebb", language: "yaml" },
  "tsconfig.json": { Icon: SiTypescript, color: "#3178c6", language: "json" },
  "next.config.js": {
    Icon: SiNextdotjs,
    color: "#a0a0a0",
    language: "javascript",
  },
  "next.config.ts": {
    Icon: SiNextdotjs,
    color: "#a0a0a0",
    language: "typescript",
  },
  "tailwind.config.js": {
    Icon: SiTailwindcss,
    color: "#38bdf8",
    language: "javascript",
  },
  "tailwind.config.ts": {
    Icon: SiTailwindcss,
    color: "#38bdf8",
    language: "typescript",
  },
  ".prettierrc": { Icon: SiPrettier, color: "#f7b93e", language: "json" },
  ".gitignore": { Icon: SiGit, color: "#f05033", language: "plaintext" },
  ".gitkeep": { Icon: SiGit, color: "#f05033", language: "plaintext" },
  Dockerfile: { Icon: SiDocker, color: "#2496ed", language: "dockerfile" },
  "schema.prisma": { Icon: SiPrisma, color: "#2d3748", language: "plaintext" },
  "README.md": { Icon: SiMarkdown, color: "#42a5f5", language: "markdown" },
  ".env": { Icon: Cog, color: "#fbbf24", language: "ini" },
  ".env.local": { Icon: Cog, color: "#fbbf24", language: "ini" },
  ".env.example": { Icon: Cog, color: "#fbbf24", language: "ini" },
};

const BY_EXT: Record<string, FileIconInfo> = {
  js: { Icon: SiJavascript, color: "#f7df1e", language: "javascript" },
  mjs: { Icon: SiJavascript, color: "#f7df1e", language: "javascript" },
  cjs: { Icon: SiJavascript, color: "#f7df1e", language: "javascript" },
  jsx: { Icon: SiReact, color: "#61dafb", language: "javascript" },
  ts: { Icon: SiTypescript, color: "#3178c6", language: "typescript" },
  tsx: { Icon: SiReact, color: "#3178c6", language: "typescript" },
  d: { Icon: SiTypescript, color: "#3178c6", language: "typescript" },
  json: { Icon: SiJson, color: "#cbcb41", language: "json" },
  html: { Icon: SiHtml5, color: "#e44d26", language: "html" },
  htm: { Icon: SiHtml5, color: "#e44d26", language: "html" },
  css: { Icon: SiCss3, color: "#1572b6", language: "css" },
  scss: { Icon: SiSass, color: "#cc6699", language: "scss" },
  sass: { Icon: SiSass, color: "#cc6699", language: "scss" },
  less: { Icon: SiLess, color: "#1d365d", language: "less" },
  md: { Icon: SiMarkdown, color: "#42a5f5", language: "markdown" },
  mdx: { Icon: SiMdx, color: "#fb8c00", language: "markdown" },
  py: { Icon: SiPython, color: "#3776ab", language: "python" },
  rb: { Icon: SiRuby, color: "#cc342d", language: "ruby" },
  go: { Icon: SiGo, color: "#00add8", language: "go" },
  rs: { Icon: SiRust, color: "#dea584", language: "rust" },
  java: { Icon: FaJava, color: "#f89820", language: "java" },
  kt: { Icon: SiKotlin, color: "#a97bff", language: "kotlin" },
  swift: { Icon: SiSwift, color: "#f05138", language: "swift" },
  cpp: { Icon: TbBrandCpp, color: "#00599c", language: "cpp" },
  cc: { Icon: TbBrandCpp, color: "#00599c", language: "cpp" },
  cxx: { Icon: TbBrandCpp, color: "#00599c", language: "cpp" },
  c: { Icon: FileCode2, color: "#a8b9cc", language: "c" },
  h: { Icon: FileCode2, color: "#a8b9cc", language: "c" },
  hpp: { Icon: TbBrandCpp, color: "#00599c", language: "cpp" },
  cs: { Icon: TbBrandCSharp, color: "#9b4f96", language: "csharp" },
  php: { Icon: SiPhp, color: "#787cb5", language: "php" },
  sh: { Icon: FileTerminal, color: "#89e051", language: "shell" },
  bash: { Icon: FileTerminal, color: "#89e051", language: "shell" },
  zsh: { Icon: FileTerminal, color: "#89e051", language: "shell" },
  yml: { Icon: SiYaml, color: "#cb171e", language: "yaml" },
  yaml: { Icon: SiYaml, color: "#cb171e", language: "yaml" },
  toml: { Icon: SiToml, color: "#9c4221", language: "ini" },
  xml: { Icon: FileCode2, color: "#0060ac", language: "xml" },
  svg: { Icon: SiSvg, color: "#ff9800", language: "xml" },
  sql: { Icon: SiRedis, color: "#a9a9a9", language: "sql" },
  graphql: { Icon: SiGraphql, color: "#e10098", language: "graphql" },
  gql: { Icon: SiGraphql, color: "#e10098", language: "graphql" },
  vue: { Icon: SiVuedotjs, color: "#41b883", language: "html" },
  svelte: { Icon: SiSvelte, color: "#ff3e00", language: "html" },
  ng: { Icon: SiAngular, color: "#dd0031", language: "typescript" },
  env: { Icon: Cog, color: "#fbbf24", language: "ini" },
  lock: { Icon: FileLock2, color: "#7f7f7f", language: "yaml" },
  txt: { Icon: FileText, color: "#cccccc", language: "plaintext" },
  log: { Icon: FileText, color: "#9e9e9e", language: "plaintext" },
  ico: { Icon: FileImage, color: "#888888", language: "plaintext" },
  png: { Icon: FileImage, color: "#a78bfa", language: "plaintext" },
  jpg: { Icon: FileImage, color: "#a78bfa", language: "plaintext" },
  jpeg: { Icon: FileImage, color: "#a78bfa", language: "plaintext" },
  gif: { Icon: FileImage, color: "#a78bfa", language: "plaintext" },
  webp: { Icon: FileImage, color: "#a78bfa", language: "plaintext" },
  avif: { Icon: FileImage, color: "#a78bfa", language: "plaintext" },
  pem: { Icon: Lock, color: "#facc15", language: "plaintext" },
  key: { Icon: Lock, color: "#facc15", language: "plaintext" },
};

export function getFileIconInfo(path: string): FileIconInfo {
  const name = path.split("/").pop() ?? path;
  if (BY_NAME[name]) return BY_NAME[name];

  if (name.startsWith(".env"))
    return { Icon: Cog, color: "#fbbf24", language: "ini" };
  if (name === "LICENSE" || name === "LICENCE")
    return { Icon: FileText, color: "#cccccc", language: "plaintext" };

  const parts = name.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : "";
  if (ext && BY_EXT[ext]) return BY_EXT[ext];
  return { Icon: FileCode2, color: "#9ca3af", language: "plaintext" };
}

export function FileIcon({
  path,
  className = "h-3.5 w-3.5 shrink-0",
}: {
  path: string;
  className?: string;
}) {
  const info = getFileIconInfo(path);
  const Cmp = info.Icon;
  return <Cmp className={className} style={{ color: info.color }} />;
}

export function FolderIcon({
  open,
  className = "h-3.5 w-3.5 shrink-0",
}: {
  open?: boolean;
  className?: string;
}) {
  const Cmp = open ? FolderOpen : Folder;
  return <Cmp className={className} style={{ color: "#dcb67a" }} />;
}

export function getLanguage(path: string): string {
  return getFileIconInfo(path).language ?? getFileMetaBase(path).language;
}
