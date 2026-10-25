import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportsDir = join(root, "teaching", "fourier-analysis", "reports");
const coursePath = join(root, "teaching", "fourier-analysis.qmd");
const fail = (message) => {
  console.error(`Fourier report PDF publication check failed: ${message}`);
  process.exit(1);
};

if (!existsSync(coursePath) || !existsSync(reportsDir)) {
  fail("Course page or report directory is missing.");
}

const lines = readFileSync(coursePath, "utf8").split(/\r?\n/);
const reportTitle = "\u30ec\u30dd\u30fc\u30c8\u8ab2\u984c";
const headings = lines.flatMap((line, index) =>
  line.startsWith("## ") && line.includes(reportTitle) ? [index] : [],
);
if (headings.length !== 1) fail("Exactly one report section is required.");

const start = headings[0] + 1;
const end = lines.findIndex((line, i) => i >= start && line.startsWith("## "));
const section = lines.slice(start, end === -1 ? undefined : end);
const format = /^\s*-\s*\[\u7b2c(\d+)\u56de \u30ec\u30dd\u30fc\u30c8\u8ab2\u984c\uff08PDF\uff09\]\(fourier-analysis\/reports\/(r8-fourier-analysis-report-(\d{2})\.pdf)\)\s*$/;
const used = new Set();
let checked = 0;

for (const line of section) {
  if (!/^\s*-\s*\[\u7b2c\d+\u56de /.test(line)) continue;
  const match = line.match(format);
  if (!match) fail(`Report link must use the existing PDF format: ${line.trim()}`);
  const [, labelNumber, basename, fileNumber] = match;
  if (Number(labelNumber) !== Number(fileNumber)) fail(`Report number mismatch: ${line.trim()}`);
  if (used.has(basename)) fail(`Duplicate report link: ${basename}`);
  used.add(basename);
  const destination = join(reportsDir, basename);
  if (!existsSync(destination)) fail(`Linked PDF does not exist: ${basename}`);
  const bytes = readFileSync(destination);
  if (bytes.length < 1024 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    fail(`Linked file is not a valid PDF candidate: ${basename}`);
  }
  checked += 1;
}

if (checked === 0) fail("No report PDF links found.");
for (const file of readdirSync(reportsDir)) {
  if (/^r8-fourier-analysis-report-\d{2}\.(?:qmd|md|html)$/i.test(file)) {
    fail(`An unauthorized Web version exists: ${file}`);
  }
  if (/^r8-fourier-analysis-report-\d{2}\.pdf$/i.test(file) && !used.has(file)) {
    fail(`Unlisted report PDF: ${file}`);
  }
}
console.log(`Verified ${checked} Fourier Analysis report PDF links and files.`);