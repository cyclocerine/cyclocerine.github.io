import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "dist");
const siteEntries = [
  "index.html",
  "googleb4a06e50d5bc15af.html",
  "robot.txt",
  "sitemap.xml",
  "llms.txt",
  "llms-full.txt",
  "assets",
  "jadwal",
  "novel",
  "notebook",
  "CNAME",
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const entry of siteEntries) {
  cpSync(resolve(root, entry), resolve(output, entry), { recursive: true });
}
