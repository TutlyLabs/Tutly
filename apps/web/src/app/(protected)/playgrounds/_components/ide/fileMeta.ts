export type FileMeta = {
  language: string;
  color: string;
  icon: string;
};

const EXT_MAP: Record<string, FileMeta> = {
  js: { language: "javascript", color: "#f7df1e", icon: "JS" },
  jsx: { language: "javascript", color: "#61dafb", icon: "JSX" },
  ts: { language: "typescript", color: "#3178c6", icon: "TS" },
  tsx: { language: "typescript", color: "#3178c6", icon: "TSX" },
  json: { language: "json", color: "#f9a825", icon: "{}" },
  html: { language: "html", color: "#e44d26", icon: "</>" },
  htm: { language: "html", color: "#e44d26", icon: "</>" },
  css: { language: "css", color: "#2965f1", icon: "#" },
  scss: { language: "scss", color: "#cc6699", icon: "#" },
  sass: { language: "scss", color: "#cc6699", icon: "#" },
  less: { language: "less", color: "#1d365d", icon: "#" },
  md: { language: "markdown", color: "#42a5f5", icon: "M↓" },
  mdx: { language: "markdown", color: "#fb8c00", icon: "MX" },
  py: { language: "python", color: "#3776ab", icon: "Py" },
  rb: { language: "ruby", color: "#cc342d", icon: "Rb" },
  go: { language: "go", color: "#00add8", icon: "Go" },
  rs: { language: "rust", color: "#dea584", icon: "Rs" },
  java: { language: "java", color: "#b07219", icon: "Jv" },
  kt: { language: "kotlin", color: "#a97bff", icon: "Kt" },
  swift: { language: "swift", color: "#f05138", icon: "Sw" },
  c: { language: "c", color: "#a8b9cc", icon: "C" },
  cpp: { language: "cpp", color: "#00599c", icon: "C++" },
  h: { language: "cpp", color: "#a8b9cc", icon: "H" },
  hpp: { language: "cpp", color: "#00599c", icon: "H++" },
  cs: { language: "csharp", color: "#178600", icon: "C#" },
  php: { language: "php", color: "#787cb5", icon: "Ph" },
  sh: { language: "shell", color: "#89e051", icon: "$" },
  bash: { language: "shell", color: "#89e051", icon: "$" },
  yml: { language: "yaml", color: "#cb171e", icon: "Y" },
  yaml: { language: "yaml", color: "#cb171e", icon: "Y" },
  toml: { language: "ini", color: "#9c4221", icon: "T" },
  xml: { language: "xml", color: "#0060ac", icon: "<x>" },
  svg: { language: "xml", color: "#ff9800", icon: "Sv" },
  sql: { language: "sql", color: "#dad8d8", icon: "Sq" },
  graphql: { language: "graphql", color: "#e10098", icon: "QL" },
  gql: { language: "graphql", color: "#e10098", icon: "QL" },
  vue: { language: "html", color: "#41b883", icon: "V" },
  svelte: { language: "html", color: "#ff3e00", icon: "S" },
  env: { language: "ini", color: "#ecd53f", icon: "Env" },
  lock: { language: "yaml", color: "#7f7f7f", icon: "🔒" },
  txt: { language: "plaintext", color: "#cccccc", icon: "T" },
  log: { language: "plaintext", color: "#9e9e9e", icon: "L" },
  ico: { language: "plaintext", color: "#888888", icon: "I" },
  png: { language: "plaintext", color: "#9c27b0", icon: "Im" },
  jpg: { language: "plaintext", color: "#9c27b0", icon: "Im" },
  jpeg: { language: "plaintext", color: "#9c27b0", icon: "Im" },
  gif: { language: "plaintext", color: "#9c27b0", icon: "Im" },
  webp: { language: "plaintext", color: "#9c27b0", icon: "Im" },
};

export function getFileMeta(path: string): FileMeta {
  const name = path.split("/").pop() ?? path;
  if (name === "package.json")
    return { language: "json", color: "#cb3837", icon: "📦" };
  if (name === "tsconfig.json")
    return { language: "json", color: "#3178c6", icon: "TS" };
  if (name === "README.md")
    return { language: "markdown", color: "#42a5f5", icon: "📖" };
  if (name.startsWith(".env"))
    return { language: "ini", color: "#ecd53f", icon: "Env" };
  if (name === "Dockerfile")
    return { language: "dockerfile", color: "#2496ed", icon: "🐳" };

  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return (
    EXT_MAP[ext] ?? {
      language: "plaintext",
      color: "#9e9e9e",
      icon: ext ? ext.slice(0, 2).toUpperCase() : "?",
    }
  );
}

export function getDisplayName(path: string) {
  return path.split("/").pop() ?? path;
}

export function getDir(path: string) {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}
