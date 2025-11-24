import VSCodeEditor from "./vscode-editor";

export default async function VSCodePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams();

  Object.entries(resolvedParams).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.append(key, value);
      }
    }
  });

  const queryString = params.toString();
  const iframeSrc = queryString
    ? `/vscode/index.html?${queryString}`
    : "/vscode/index.html";

  return <VSCodeEditor iframeSrc={iframeSrc} />;
}
