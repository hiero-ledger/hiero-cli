#!/usr/bin/env node
/**
 * update-contributors.mjs
 *
 * 1) Extracts every "Signed-off-by:" trailer from the full git history
 * 2) Writes a CSV with name,email,occurrences
 * 3) Updates the "contributors" array in package.json with the extracted names,
 *    skipping a customizable exclusion list (default: bots/automation and the author)
 *
 * Usage:
 *   node scripts/update-contributors.mjs [options]
 *
 * Options:
 *   --exclude "A,B"        names/emails to exclude (comma separated, repeatable)
 *   --exclude-file <path>  file with one name/email per line (# starts a comment)
 *   --no-default-exclude   do not apply the default exclusion list
 *   --csv <path>           output CSV path (default: contributors.csv)
 *   --package <path>       package.json path (default: <repo>/package.json)
 *   --repo <path>          git repository root (default: cwd)
 *   --sort <name|commits>  contributor ordering (default: name = alphabetical; commits = most active first)
 *   --dry-run              show the changes without writing anything
 *   --quiet                suppress output
 *   -h, --help             show this help
 *
 * Examples:
 *   node scripts/update-contributors.mjs
 *   node scripts/update-contributors.mjs --exclude "dependabot[bot],Roger Barker" --csv /tmp/c.csv
 *   node scripts/update-contributors.mjs --exclude-file .contributors-exclude --dry-run
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/** Default exclusion list. */
const DEFAULT_EXCLUDE = [
  'dependabot[bot]',
  'StepSecurity Bot',
  'Hedera Eng Automation',
  'Michiel Mulders',
];

function printHelp() {
  const src = readFileSync(new URL(import.meta.url), 'utf8');
  const header = src.match(/\/\*\*([\s\S]*?)\*\//);
  console.log(
    header
      ? header[1].replace(/^ \* ?/gm, '').trim()
      : 'update-contributors.mjs',
  );
}

function parseArgs(argv) {
  const opts = {
    exclude: [],
    excludeFile: null,
    useDefaultExclude: true,
    csv: 'contributors.csv',
    packageJson: null,
    repo: process.cwd(),
    sort: 'name',
    dryRun: false,
    quiet: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) fail(`Missing value for option ${arg}`);
      return value;
    };

    switch (arg) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '--exclude':
        opts.exclude.push(
          ...next()
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        );
        break;
      case '--exclude-file':
        opts.excludeFile = next();
        break;
      case '--no-default-exclude':
        opts.useDefaultExclude = false;
        break;
      case '--csv':
        opts.csv = next();
        break;
      case '--package':
        opts.packageJson = next();
        break;
      case '--repo':
        opts.repo = next();
        break;
      case '--sort': {
        const value = next();
        if (!['commits', 'name'].includes(value))
          fail(`Invalid value for --sort: ${value}`);
        opts.sort = value;
        break;
      }
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--quiet':
        opts.quiet = true;
        break;
      default:
        fail(`Unknown option: ${arg} (use --help)`);
    }
  }

  return opts;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

/** Reads the full git history and returns the list of Signed-off-by trailers. */
function collectSignedOffBy(repo) {
  let raw;
  try {
    raw = execFileSync('git', ['log', '--format=%B'], {
      cwd: repo,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    fail(`unable to run git log in ${repo}: ${error.message}`);
  }

  const entries = [];
  for (const line of raw.split('\n')) {
    // Some commits carry trailing \r (Windows line endings): normalize them.
    const match = /^Signed-off-by:\s*(.+?)\s*$/i.exec(line.replace(/\r$/, ''));
    if (!match) continue;

    const value = match[1];
    const identity = /^(.*?)\s*<([^<>]+)>\s*$/.exec(value);
    const name = (identity ? identity[1] : value).trim().replace(/\s+/g, ' ');
    const email = (identity ? identity[2] : '').trim();

    if (!name && !email) continue;
    entries.push({ name: name || email, email });
  }

  return entries;
}

/** Groups entries by (name, email) and counts occurrences. */
function countEntries(entries) {
  const counts = new Map();
  for (const { name, email } of entries) {
    const key = `${name}\u0000${email}`;
    const current = counts.get(key);
    if (current) {
      current.occurrences += 1;
    } else {
      counts.set(key, { name, email, occurrences: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name),
  );
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows) {
  const header = ['name', 'email', 'occurrences'];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([row.name, row.email, row.occurrences].map(csvEscape).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function loadExclusionList(opts) {
  const values = [];

  if (opts.useDefaultExclude) values.push(...DEFAULT_EXCLUDE);

  if (opts.excludeFile) {
    const file = path.resolve(opts.repo, opts.excludeFile);
    if (!existsSync(file)) fail(`exclusion file not found: ${file}`);
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) values.push(trimmed);
    }
  }

  values.push(...opts.exclude);

  // Case-insensitive dedupe, preserving the original order.
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Filters contributors, skipping any name/email present in the exclusion list (case-insensitive). */
function buildContributors(rows, exclusionList, sort) {
  const excluded = new Set(exclusionList.map((value) => value.toLowerCase()));

  // The same person may appear under different emails: dedupe by name,
  // summing occurrences so the ordering stays correct.
  const byName = new Map();
  for (const row of rows) {
    if (excluded.has(row.name.toLowerCase())) continue;
    if (row.email && excluded.has(row.email.toLowerCase())) continue;

    const key = row.name.toLowerCase();
    const current = byName.get(key);
    if (current) {
      current.occurrences += row.occurrences;
    } else {
      byName.set(key, { name: row.name, occurrences: row.occurrences });
    }
  }

  const contributors = [...byName.values()];
  if (sort === 'name') {
    contributors.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    contributors.sort(
      (a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name),
    );
  }
  return contributors.map((entry) => entry.name);
}

/** Replaces the "contributors" array in the package.json text without reformatting the rest. */
function replaceContributorsArray(text, names) {
  const keyPattern = /"contributors"\s*:\s*(?=\[)/g;
  const match = keyPattern.exec(text);
  if (!match) fail('array-valued "contributors" key not found in package.json');

  const openIndex = text.indexOf('[', match.index);
  let depth = 0;
  let inString = false;
  let escaped = false;
  let closeIndex = -1;

  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        closeIndex = i;
        break;
      }
    }
  }

  if (closeIndex === -1) fail('unclosed "contributors" array in package.json');

  const body = names.map((name) => `    ${JSON.stringify(name)}`).join(',\n');
  const replacement = body ? `[\n${body}\n  ]` : '[]';
  return text.slice(0, openIndex) + replacement + text.slice(closeIndex + 1);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const repo = path.resolve(opts.repo);
  const packageJsonPath = path.resolve(
    opts.packageJson ?? path.join(repo, 'package.json'),
  );
  if (!existsSync(packageJsonPath))
    fail(`package.json not found: ${packageJsonPath}`);

  const entries = collectSignedOffBy(repo);
  const rows = countEntries(entries);
  const totalSignatures = entries.length;

  const contributors = buildContributors(
    rows,
    loadExclusionList(opts),
    opts.sort,
  );

  const csvPath = path.resolve(opts.csv);
  const originalText = readFileSync(packageJsonPath, 'utf8');
  const updatedText = replaceContributorsArray(originalText, contributors);

  // Validation: the resulting JSON must be parseable.
  try {
    JSON.parse(updatedText);
  } catch (error) {
    fail(`updated package.json is invalid: ${error.message}`);
  }

  if (!opts.dryRun) {
    writeFileSync(csvPath, buildCsv(rows), 'utf8');
    writeFileSync(packageJsonPath, updatedText, 'utf8');
  }

  if (!opts.quiet) {
    const csvVerb = opts.dryRun ? '[dry-run] Would write' : 'Wrote';
    const pkgVerb = opts.dryRun ? '[dry-run] Would update' : 'Updated';
    const scope = opts.sort === 'name' ? 'alphabetical' : 'by occurrences';
    console.log(
      `${csvVerb} ${path.relative(process.cwd(), csvPath)} (${rows.length} rows, ${totalSignatures} signatures total)`,
    );
    console.log(
      `${pkgVerb} ${path.relative(process.cwd(), packageJsonPath)} → contributors: ${contributors.length} names`,
    );
    console.log(`\nContributors (${scope}):`);
    for (const name of contributors) console.log(`  - ${name}`);
  }
}

main();
