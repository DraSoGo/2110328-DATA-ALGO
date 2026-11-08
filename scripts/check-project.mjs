import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanProblemLibrary } from './lib/manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = JSON.parse(await readFile(path.join(root, 'data', 'problems.json'), 'utf8'));
const errors = [];
const ids = new Set();

async function isFile(relative) {
  try {
    return (await stat(path.join(root, relative))).isFile();
  } catch {
    return false;
  }
}

for (const problem of problems) {
  if (ids.has(problem.id)) errors.push(`Duplicate id: ${problem.id}`);
  ids.add(problem.id);
  if (!Number.isInteger(problem.graderId) && !(problem.graderId === null && problem.source)) errors.push(`Missing grader id: ${problem.id}`);
  if (!problem.name || !problem.title) errors.push(`Incomplete config: ${problem.id}`);
  if (!problem.statement) errors.push(`Missing statement.pdf: ${problem.id}`);
  const files = [
    problem.statement,
    ...problem.solution.map((file) => file.path),
    ...problem.testcases.flatMap((pair) => [pair.input?.path, pair.output?.path]),
  ].filter(Boolean);
  for (const file of files) if (!(await isFile(file))) errors.push(`Missing file: ${file}`);
}

const fresh = await scanProblemLibrary(path.join(root, 'problems'));
if (JSON.stringify(fresh) !== JSON.stringify(problems)) errors.push('data/problems.json is stale. Run npm run index.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const withSolution = problems.filter((problem) => problem.solution.length).length;
  const withTests = problems.filter((problem) => problem.testcases.length).length;
  console.log(`Validated ${problems.length} problem folders: ${withSolution} with solutions, ${withTests} with testcases.`);
}
