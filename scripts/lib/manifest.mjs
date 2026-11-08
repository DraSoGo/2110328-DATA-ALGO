import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.cpp', '.h', '.hpp']);
const byName = (a, b) => a.localeCompare(b, 'en', { numeric: true });

async function exists(target) {
  try {
    return await stat(target);
  } catch {
    return null;
  }
}

async function directories(folder) {
  return (await readdir(folder, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(byName);
}

export function topicFromDir(dir) {
  const match = dir.match(/^(\d+)_(.+)$/);
  if (!match) return { order: 999, name: dir };
  const order = Number(match[1]);
  return { order, name: order === 99 ? 'Other' : match[2] };
}

async function listSourceFiles(folder, relative = '') {
  const files = [];
  const entries = (await readdir(folder, { withFileTypes: true })).sort((a, b) => byName(a.name, b.name));
  for (const entry of entries) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listSourceFiles(path.join(folder, entry.name), name));
    else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(name);
  }
  return files;
}

async function scanSolution(problemPath, prefix) {
  const files = [];
  const single = path.join(problemPath, 'solution.cpp');
  if ((await exists(single))?.isFile() && (await readFile(single, 'utf8')).trim()) {
    files.push({ name: 'solution.cpp', path: `${prefix}/solution.cpp` });
  }
  const folder = path.join(problemPath, 'solution');
  if ((await exists(folder))?.isDirectory()) {
    for (const name of await listSourceFiles(folder)) files.push({ name, path: `${prefix}/solution/${name}` });
  }
  return files;
}

async function scanTestcases(problemPath, prefix, truncatedList) {
  const truncated = new Set(truncatedList);
  const sides = {};
  for (const [side, extension] of [['input', '.in'], ['output', '.out']]) {
    sides[side] = new Map();
    const folder = path.join(problemPath, 'testcase', side);
    if (!(await exists(folder))) continue;
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(extension)) continue;
      sides[side].set(entry.name.slice(0, -extension.length), {
        path: `${prefix}/testcase/${side}/${entry.name}`,
        size: (await stat(path.join(folder, entry.name))).size,
        truncated: truncated.has(`${side}/${entry.name}`),
      });
    }
  }
  const ids = new Set([...sides.input.keys(), ...sides.output.keys()]);
  return [...ids].sort(byName).map((id) => ({ id, input: sides.input.get(id) || null, output: sides.output.get(id) || null }));
}

export async function scanProblemLibrary(root) {
  const problems = [];
  for (const topicDir of await directories(root)) {
    const topic = topicFromDir(topicDir);
    for (const problemDir of await directories(path.join(root, topicDir))) {
      const problemPath = path.join(root, topicDir, problemDir);
      const configPath = path.join(problemPath, 'config.json');
      if (!(await exists(configPath))) continue;
      let config;
      try {
        config = JSON.parse(await readFile(configPath, 'utf8'));
      } catch (error) {
        throw new Error(`Invalid ${configPath}: ${error.message}`);
      }
      const prefix = `problems/${topicDir}/${problemDir}`;
      problems.push({
        id: `${topicDir}/${problemDir}`,
        graderId: config.id ?? null,
        name: config.name || problemDir,
        title: config.title || config.name || problemDir,
        tags: config.tags || [],
        source: config.source ?? null,
        topic: topic.name,
        topicDir,
        topicOrder: topic.order,
        schedule: (config.schedule || []).filter((entry) => entry.topic === topic.name),
        statement: (await exists(path.join(problemPath, 'statement.pdf'))) ? `${prefix}/statement.pdf` : null,
        solution: await scanSolution(problemPath, prefix),
        testcases: await scanTestcases(problemPath, prefix, config.testcase_truncated || []),
      });
    }
  }
  return problems;
}
