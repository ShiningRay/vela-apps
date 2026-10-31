import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "dist/vpk");

const apps = [
  {
    id: "scientific-calculator",
    dir: "apps/scientific-calculator",
    source: "dist",
  },
  {
    id: "citrine-sheets",
    dir: "apps/citrine-sheets",
    source: ".",
    files: ["index.html", "styles.css", "sheets.js"],
  },
  {
    id: "citrine-market-terminal",
    dir: "apps/citrine-market-terminal",
    source: ".",
    files: ["index.html", "styles.css", "market.js"],
  },
];

async function collectFiles(dir, prefix = "") {
  const files = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(absolute, relative));
    } else if (entry.isFile()) {
      files[relative] = await readFile(absolute);
    }
  }
  return files;
}

async function readSelectedFiles(dir, names) {
  const files = {};
  for (const name of names) files[name] = await readFile(path.join(dir, name));
  return files;
}

function encodeFiles(files) {
  return Object.fromEntries(
    Object.entries(files).map(([name, content]) => [
      name,
      typeof content === "string" ? strToU8(content) : content,
    ]),
  );
}

async function writePackage(id, manifestPath, files) {
  const manifest = await readFile(manifestPath, "utf8");
  const zipped = zipSync(encodeFiles({ "manifest.json": manifest, ...files }), { level: 6 });
  const target = path.join(outputDir, `${id}.vpk`);
  await writeFile(target, zipped);
  const { size } = await stat(target);
  console.log(`[vpk] ${id}: ${(size / 1024 / 1024).toFixed(2)} MiB`);
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
execFileSync(command, ["--filter", "@vela-apps/scientific-calculator", "build"], {
  cwd: root,
  stdio: "inherit",
});

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const app of apps) {
  const appDir = path.join(root, app.dir);
  const sourceDir = path.join(appDir, app.source);
  const files = app.files ? await readSelectedFiles(sourceDir, app.files) : await collectFiles(sourceDir);
  await writePackage(app.id, path.join(appDir, "manifest.json"), files);
}

const packageNames = (await readdir(outputDir))
  .filter((name) => name.endsWith(".vpk"))
  .sort();
const checksums = [];
for (const name of packageNames) {
  const content = await readFile(path.join(outputDir, name));
  checksums.push(`${createHash("sha256").update(content).digest("hex")}  ${name}`);
}
await writeFile(path.join(outputDir, "SHA256SUMS"), `${checksums.join("\n")}\n`);

await writeFile(
  path.join(outputDir, "README.md"),
  [
    "# Vela .vpk demo packages",
    "",
    "在 Vela 的 Settings → App packages → Install .vpk 中逐个安装。",
    "",
    "- `scientific-calculator.vpk`：Solid/TS 科学计算器",
    "- `citrine-sheets.vpk`：Citrine Sheets Ruby/Opal demo",
    "- `citrine-market-terminal.vpk`：Citrine 行情终端 Ruby/Opal demo",
    "",
    "校验：`shasum -a 256 -c SHA256SUMS`。",
    "",
  ].join("\n"),
);
console.log(`[vpk] output: ${outputDir}`);
