import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "frontend", "dist");
const assetsDir = path.join(distDir, "assets");

const files = fs.readdirSync(assetsDir);
const cssFile = files.find((f) => f.endsWith(".css"));
const jsFile = files.find((f) => f.endsWith(".js"));

if (!cssFile || !jsFile) {
  throw new Error("Built CSS or JS asset not found in frontend/dist/assets");
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), "utf-8");
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), "utf-8");

// Escape closing script tags inside JS bundle so inlining inside <script type="module"> is 100% safe
const safeJsContent = jsContent.replace(/<\/script>/gi, "<\\/script>");

const singleFileHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ThaliCheck — AI-Based School &amp; Anganwadi Meal Nutrition Monitoring System</title>
    <style>${cssContent}</style>
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased selection:bg-emerald-600 selection:text-white">
    <div id="root"></div>
    <script type="module">${safeJsContent}</script>
  </body>
</html>
`;

fs.writeFileSync(path.join(rootDir, "index.html"), singleFileHtml, "utf-8");
fs.writeFileSync(path.join(distDir, "index.html"), singleFileHtml, "utf-8");
console.log("Generated self-contained single-file index.html (" + singleFileHtml.length + " bytes)");
