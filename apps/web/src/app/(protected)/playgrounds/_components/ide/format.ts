// Lazy-load prettier from the bundled assets.
let prettierP: Promise<any> | null = null;
const parserCache: Record<string, Promise<any>> = {};

const PRETTIER_BASE = "/sandpack/static/js/prettier/2.0.5";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-prettier-src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.prettierSrc = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function getPrettier(): Promise<any> {
  if (prettierP) return prettierP;
  prettierP = loadScript(`${PRETTIER_BASE}/standalone.js`).then(
    () => (window as any).prettier,
  );
  return prettierP;
}

const PARSER_FILES: Record<string, string> = {
  babel: "parser-babel.js",
  typescript: "parser-typescript.js",
  html: "parser-html.js",
  css: "parser-postcss.js",
  json: "parser-babel.js",
  markdown: "parser-markdown.js",
  yaml: "parser-yaml.js",
};

function getParser(parserName: string): Promise<any> {
  const file = PARSER_FILES[parserName];
  if (!file) return Promise.resolve(null);
  const cached = parserCache[parserName];
  if (cached) return cached;
  const p = loadScript(`${PRETTIER_BASE}/${file}`).then(
    () =>
      (window as any).prettierPlugins?.[
        parserName === "json" ? "babel" : parserName
      ],
  );
  parserCache[parserName] = p;
  return p;
}

function parserFor(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs")
    return "babel";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "html" || ext === "htm" || ext === "vue" || ext === "svelte")
    return "html";
  if (ext === "css" || ext === "scss" || ext === "less") return "css";
  if (ext === "json") return "json";
  if (ext === "md" || ext === "mdx") return "markdown";
  if (ext === "yml" || ext === "yaml") return "yaml";
  return null;
}

export async function formatCode(
  code: string,
  path: string,
): Promise<string | null> {
  const parserName = parserFor(path);
  if (!parserName) return null;
  try {
    const [prettier, parser] = await Promise.all([
      getPrettier(),
      getParser(parserName),
    ]);
    if (!prettier || !parser) return null;
    return prettier.format(code, {
      parser: parserName === "json" ? "json" : parserName,
      plugins: [parser],
      printWidth: 80,
      tabWidth: 2,
      semi: true,
      singleQuote: false,
      trailingComma: "all",
    });
  } catch (err) {
    console.warn("[tutly] format failed:", err);
    return null;
  }
}

export function canFormat(path: string): boolean {
  return parserFor(path) !== null;
}
