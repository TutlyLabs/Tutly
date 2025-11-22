import { type NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { lookup } from "mime-types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathParts } = await params;
  const filePath = pathParts.join("/");

  // Base paths
  const rootNodeModules = path.join(process.cwd(), "../../node_modules");
  const vscodeDist = path.join(rootNodeModules, "vscode-web/dist");

  // Determine source based on path
  let fullPath = "";

  if (filePath.startsWith("extensions/git-fs")) {
    // Serve git-fs extension from packages/git-fs/dist
    const relativePath = filePath.replace("extensions/git-fs/", "");
    fullPath = path.join(process.cwd(), "../../packages/git-fs", relativePath);
  } else {
    // Serve standard VSCode assets
    fullPath = path.join(vscodeDist, filePath);
  }

  // Security check: Prevent directory traversal
  const resolvedPath = path.resolve(fullPath);
  if (
    !resolvedPath.startsWith(rootNodeModules) &&
    !resolvedPath.startsWith(path.join(process.cwd(), "../../packages"))
  ) {
    // Allow both node_modules and packages/git-fs
    if (
      !resolvedPath.startsWith(vscodeDist) &&
      !resolvedPath.includes("packages/git-fs")
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  if (!fs.existsSync(fullPath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const contentType = lookup(fullPath) || "application/octet-stream";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
