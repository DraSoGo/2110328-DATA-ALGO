import { highlightCpp } from '../lib/cpp-highlight.js';
import { escapeHtml } from '../lib/html.js';
import { moduleSummary, t } from '../lib/i18n.js';
import { fieldDefaultRaw, graphEdgesText, parseField, parseInteger } from './engine/input.js';
import { patchSvg } from './engine/morph.js';
import { createPlayer, SPEEDS } from './engine/player.js';
import { record } from './engine/recorder.js';
import { findModule, modulesFor } from './modules.js';
import { RENDERERS } from './render/index.js';
import { slidePath, slidesFor } from './slides.js';

let session = null;
const MAX_SCALE = 1.6;

export function unmountLearn() {
  if (!session) return;
  session.player?.destroy();
  session.cleanup.forEach((fn) => fn());
  session = null;
}

function stageMessage(title, text) {
  return `<div class="stage-empty"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div>`;
}

function playerMarkup() {
  return `<div class="player" role="group" aria-label="${escapeHtml(t('player.controls'))}">
    <button type="button" data-player="first" aria-label="${escapeHtml(t('player.first'))}">⏮</button>
    <button type="button" data-player="prev" aria-label="${escapeHtml(t('player.prev'))}">‹</button>
    <button type="button" data-player="toggle" class="player-play" aria-label="${escapeHtml(t('player.play'))}">▶</button>
    <button type="button" data-player="next" aria-label="${escapeHtml(t('player.next'))}">›</button>
    <button type="button" data-player="last" aria-label="${escapeHtml(t('player.last'))}">⏭</button>
    <input type="range" class="player-range" min="0" max="0" value="0" aria-label="${escapeHtml(t('player.step'))}">
    <span class="player-count">1 / 1</span>
    <label class="player-speed">${escapeHtml(t('learn.speed'))} <select>${SPEEDS.map((speed) => `<option value="${speed}"${speed === 1 ? ' selected' : ''}>${speed}×</option>`).join('')}</select></label>
  </div>`;
}

function opLineMarkup(op, values) {
  // Highlight the C++ around the placeholders; each {name} becomes a number input.
  return op.code.split(/(\{\w+\})/).map((part) => {
    const placeholder = part.match(/^\{(\w+)\}$/);
    if (!placeholder) return highlightCpp(part);
    const name = placeholder[1];
    const param = op.params.find((item) => item.name === name);
    const value = values[name] ?? param.default;
    return `<input class="op-arg" data-arg="${escapeHtml(name)}" inputmode="numeric" autocomplete="off" aria-label="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
  }).join('');
}

function slidesMarkup(module) {
  const slides = slidesFor(module);
  if (!slides.length) return '';
  return `<p class="slide-links"><span>${escapeHtml(t('learn.slides'))}</span>${slides.map((slide) => `<a href="${escapeHtml(new URL(`../../${slidePath(slide)}`, import.meta.url).href)}" target="_blank" rel="noopener">${escapeHtml(slide.title)} <small>${escapeHtml(slide.file)}</small></a>`).join('')}</p>`;
}

function complexityRows(module) {
  if (module.side === 'data') {
    return [...Object.entries(module.ops).map(([name, op]) => [name, op.time]), ['space', module.complexity.space]];
  }
  const { time, space } = module.complexity;
  return [['best', time.best], ['average', time.average], ['worst', time.worst], ['space', space]];
}

// One-line Big O summary for the module list.
export function complexitySummary(module) {
  if (module.widget) return module.widget.listLabel;
  if (module.side === 'data') return `space ${module.complexity.space}`;
  return `${module.complexity.time.worst} time · ${module.complexity.space} space`;
}

function complexityMarkup(module) {
  const rows = complexityRows(module).map(([label, value]) => `<div class="${label === 'space' ? 'is-space' : ''}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  return `<section class="complexity" aria-label="Big O complexity"><p class="complexity-title">${escapeHtml(t(module.side === 'data' ? 'learn.bigO.data' : 'learn.bigO.algo'))}</p><dl>${rows}</dl>${module.complexity.note ? `<p class="complexity-note">${escapeHtml(module.complexity.note)}</p>` : ''}</section>`;
}

function dataStageMarkup(module) {
  const ops = Object.keys(module.ops);
  return `<header class="stage-head"><h1>${escapeHtml(module.title)}</h1><p>${escapeHtml(moduleSummary(module))}</p>${slidesMarkup(module)}</header>
    ${complexityMarkup(module)}
    <div class="op-bar" role="toolbar" aria-label="Operations">${ops.map((name, index) => `<button type="button" data-op="${escapeHtml(name)}" aria-pressed="${index === 0}">${escapeHtml(name)}<small>${escapeHtml(module.ops[name].time)}</small></button>`).join('')}</div>
    <div class="code-panel data-code">
      <pre class="code-block" translate="no"><code class="language-cpp"><span class="code-line muted">${highlightCpp(module.declare)}</span><span class="code-line op-line" data-line="0"></span></code></pre>
      <div class="op-actions"><button type="button" class="run-button" data-action="run">${escapeHtml(t('learn.run'))}</button><button type="button" data-action="reset">${escapeHtml(t('learn.reset'))}</button></div>
      <p class="op-error" role="alert"></p>
    </div>
    <div class="viz-host"></div>
    <p class="step-msg" aria-live="polite"></p>
    ${playerMarkup()}
    <p class="history"><span>${escapeHtml(t('learn.history'))}</span><code class="history-list" translate="no"></code></p>`;
}

function nodeOptions(nodes, selected) {
  return nodes.map((node) => `<option value="${escapeHtml(node.id)}"${node.id === selected ? ' selected' : ''}>${escapeHtml(node.id)}</option>`).join('');
}

function fieldMarkup(module, field) {
  const name = escapeHtml(field.name);
  const label = `<span>${escapeHtml(field.label)}</span>`;
  if (field.kind === 'graph') {
    const raw = fieldDefaultRaw(field);
    const options = field.presets.map((preset) => `<option value="${escapeHtml(preset.id)}"${preset.id === raw.preset ? ' selected' : ''}>${escapeHtml(preset.name)}</option>`).join('');
    const hint = t(field.weighted === false ? 'learn.edgeHintUnweighted' : 'learn.edgeHint');
    return `<label class="graph-field">${label}<select data-preset-of="${name}" aria-label="${escapeHtml(field.label)} preset">${options}</select><textarea name="${name}" rows="6" spellcheck="false" aria-label="${escapeHtml(field.label)} edges">${escapeHtml(raw.text)}</textarea><small>${escapeHtml(hint)}</small></label>`;
  }
  if (field.kind === 'node') {
    const graph = module.input.fields.find((item) => item.name === field.graph);
    const preset = graph.presets.find((item) => item.id === graph.default);
    return `<label class="node-field">${label}<select name="${name}" data-node-of="${escapeHtml(field.graph)}">${nodeOptions(preset.nodes, field.default)}</select></label>`;
  }
  return `<label>${label}<input name="${name}" value="${escapeHtml(fieldDefaultRaw(field))}" autocomplete="off" spellcheck="false"></label>`;
}

function widgetStageMarkup(module) {
  return `<header class="stage-head"><h1>${escapeHtml(module.title)}</h1><p>${escapeHtml(moduleSummary(module))}</p>${slidesMarkup(module)}</header>
    <div class="widget-host"></div>`;
}

function algoStageMarkup(module) {
  const fields = module.input.fields.map((field) => fieldMarkup(module, field)).join('');
  return `<header class="stage-head"><h1>${escapeHtml(module.title)}</h1><p>${escapeHtml(moduleSummary(module))}</p>${slidesMarkup(module)}</header>
    ${complexityMarkup(module)}
    <form class="algo-input" novalidate>${fields}<button type="submit" class="run-button">${escapeHtml(t('learn.run'))}</button><p class="op-error" role="alert"></p></form>
    <div class="viz-host"></div>
    <p class="step-msg" aria-live="polite"></p>
    <div class="algo-detail">
      <pre class="code-block algo-code" translate="no"><code class="language-cpp">${module.code.map((line, index) => `<span class="code-line" data-line="${index}"><i>${index + 1}</i>${highlightCpp(line)}</span>`).join('')}</code></pre>
      <aside class="vars-box" aria-label="${escapeHtml(t('learn.variables'))}"><p class="vars-title">${escapeHtml(t('learn.variables'))}</p><dl class="vars-panel"></dl></aside>
    </div>
    ${playerMarkup()}`;
}

export function learnPageMarkup(route) {
  const modules = modulesFor(route.side);
  const module = route.module ? findModule(route.side, route.module) : null;
  const groups = [...new Set(modules.map((item) => item.group))];
  const list = groups.map((group) => `<p class="module-group">${escapeHtml(group)}</p>${modules
    .filter((item) => item.group === group)
    .map((item) => `<a class="module-link${item === module ? ' active' : ''}" href="#/learn/${route.side}/${escapeHtml(item.id)}"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(complexitySummary(item))}</small></a>`)
    .join('')}`).join('');
  let stage;
  if (!route.module) stage = stageMessage(t('learn.pick.title'), t(route.side === 'data' ? 'learn.pick.data' : 'learn.pick.algo'));
  else if (!module) stage = stageMessage(t('learn.missing.title'), t('learn.missing.text'));
  else if (module.widget) stage = widgetStageMarkup(module);
  else stage = module.side === 'data' ? dataStageMarkup(module) : algoStageMarkup(module);
  return `<div class="learn-view view-enter">
    <div class="terminal-label"><span>~/cedt/data_algo/learn/${route.side}</span><span>${escapeHtml(module ? module.id : route.side)}.exe</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/learn">${escapeHtml(t('crumb.learn'))}</a><span>/</span><a href="#/learn/${route.side}">${escapeHtml(t(route.side === 'data' ? 'nav.data' : 'nav.algo').toUpperCase())}</a>${module ? `<span>/</span><strong>${escapeHtml(module.title.toUpperCase())}</strong>` : ''}</nav>
    <div class="learn-layout"><nav class="module-list" aria-label="${route.side} modules">${list}</nav><section class="module-stage">${stage}</section></div>
  </div>`;
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
  return String(value);
}

function varsMarkup(vars) {
  if (!vars) return '';
  return Object.entries(vars).map(([name, value]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(formatValue(value))}</dd></div>`).join('');
}

// History entry for one op: the call with its arguments, without a trailing `;` or `// comment`.
export function callLabel(template, args) {
  return template.replace(/\{(\w+)\}/g, (_, name) => String(args[name])).replace(/\s*\/\/.*$/, '').replace(/;$/, '');
}

function mountData(module, root, ui, load) {
  let state = module.preset();
  let opName = Object.keys(module.ops)[0];
  const values = {};
  const history = [];
  const opLine = root.querySelector('.op-line');
  const historyList = root.querySelector('.history-list');

  const showOp = () => {
    opLine.innerHTML = opLineMarkup(module.ops[opName], values);
    root.querySelectorAll('[data-op]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.op === opName)));
    ui.error.textContent = '';
  };
  const idle = (msg) => load([{ line: null, msg, state: structuredClone(state), hl: {}, vars: null }], false);

  root.querySelectorAll('[data-op]').forEach((button) => button.addEventListener('click', () => {
    opName = button.dataset.op;
    showOp();
  }));
  opLine.addEventListener('input', (event) => {
    if (!event.target.dataset.arg) return;
    values[event.target.dataset.arg] = event.target.value;
    ui.error.textContent = '';
  });
  opLine.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') root.querySelector('[data-action="run"]').click();
  });
  root.querySelector('[data-action="run"]').addEventListener('click', () => {
    const op = module.ops[opName];
    const args = {};
    for (const param of op.params) {
      const input = opLine.querySelector(`[data-arg="${param.name}"]`);
      const parsed = parseInteger(input.value, param);
      if (parsed.error) {
        ui.error.textContent = `${param.name}: ${parsed.error}`;
        input.focus();
        return;
      }
      args[param.name] = parsed.value;
    }
    const problem = op.check ? op.check(state, args) : null;
    if (problem) {
      ui.error.textContent = problem;
      return;
    }
    let frames;
    try {
      frames = record(op.run(structuredClone(state), args));
    } catch (error) {
      ui.error.textContent = error.message;
      return;
    }
    if (!frames.length) return;
    state = structuredClone(frames.at(-1).state);
    history.push(callLabel(op.code, args));
    historyList.textContent = history.join('   ');
    load(frames, true);
    // Move focus off Run so Space controls playback instead of re-running the op.
    ui.play.focus({ preventScroll: true });
  });
  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    state = module.preset();
    history.length = 0;
    historyList.textContent = '';
    ui.error.textContent = '';
    idle(t('learn.resetDone'));
  });

  showOp();
  idle(t('learn.idle'));
}

function mountAlgo(module, root, ui, load) {
  const form = root.querySelector('.algo-input');
  const run = (autoplay) => {
    const input = {};
    for (const field of module.input.fields) {
      const element = form.elements.namedItem(field.name);
      const raw = field.kind === 'graph' ? { preset: form.querySelector(`[data-preset-of="${field.name}"]`).value, text: element.value } : element.value;
      const parsed = parseField(field, raw, input);
      if (parsed.error) {
        ui.error.textContent = `${field.label}: ${parsed.error}`;
        element.focus();
        return;
      }
      input[field.name] = parsed.value;
    }
    ui.error.textContent = '';
    try {
      const frames = record(module.run(input));
      if (frames.length) load(frames, autoplay);
    } catch (error) {
      ui.error.textContent = error.message;
    }
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run(true);
  });
  form.addEventListener('input', () => { ui.error.textContent = ''; });
  // Picking a preset graph resets its edge list and the node pickers that use it.
  form.querySelectorAll('[data-preset-of]').forEach((select) => select.addEventListener('change', () => {
    const field = module.input.fields.find((item) => item.name === select.dataset.presetOf);
    const preset = field.presets.find((item) => item.id === select.value);
    form.elements.namedItem(field.name).value = graphEdgesText(preset);
    form.querySelectorAll(`[data-node-of="${field.name}"]`).forEach((nodeSelect) => {
      const keep = nodeSelect.value;
      nodeSelect.innerHTML = nodeOptions(preset.nodes, preset.nodes.some((node) => node.id === keep) ? keep : preset.nodes[0].id);
    });
  }));
  run(false);
}

export function mountLearn(route, root) {
  unmountLearn();
  const module = route.module ? findModule(route.side, route.module) : null;
  if (!module) return;
  if (module.widget) {
    const current = { player: null, cleanup: [] };
    session = current;
    const cleanup = module.widget.mount(root.querySelector('.widget-host'));
    if (typeof cleanup === 'function') current.cleanup.push(cleanup);
    return;
  }
  const current = { player: null, cleanup: [] };
  session = current;
  const render = RENDERERS[module.renderer];
  const ui = {
    viz: root.querySelector('.viz-host'),
    msg: root.querySelector('.step-msg'),
    error: root.querySelector('.op-error'),
    range: root.querySelector('.player-range'),
    count: root.querySelector('.player-count'),
    play: root.querySelector('.player-play'),
    speed: root.querySelector('.player-speed select'),
    lines: [...root.querySelectorAll('.code-line[data-line]')],
    vars: root.querySelector('.vars-panel'),
  };

  const show = ({ frame, index, total, playing, speed, animate }) => {
    ui.viz.style.setProperty('--viz-dur', `${Math.round(300 / speed)}ms`);
    patchSvg(ui.viz, render(frame.state, frame.hl), { animate });
    // Cap the picture at MAX_SCALE times its natural size so a small structure does not fill the stage.
    const svg = ui.viz.querySelector(':scope > svg');
    const natural = svg?.viewBox?.baseVal?.width;
    if (natural) ui.viz.style.setProperty('--viz-max', `${Math.round(natural * MAX_SCALE)}px`);
    // Announce steps only while paused; autoplay would flood screen readers.
    ui.msg.setAttribute('aria-live', playing ? 'off' : 'polite');
    ui.msg.textContent = frame.msg;
    ui.range.max = String(total - 1);
    ui.range.value = String(index);
    ui.count.textContent = `${index + 1} / ${total}`;
    ui.play.textContent = playing ? '❚❚' : '▶';
    ui.play.setAttribute('aria-label', t(playing ? 'player.pause' : 'player.play'));
    ui.lines.forEach((line) => line.classList.toggle('is-current', Number(line.dataset.line) === frame.line));
    if (ui.vars) ui.vars.innerHTML = varsMarkup(frame.vars);
  };

  const load = (frames, autoplay) => {
    current.player?.destroy();
    current.player = createPlayer({ frames, onChange: show });
    current.player.setSpeed(Number(ui.speed.value));
    current.player.first();
    if (autoplay) current.player.play();
  };

  root.querySelectorAll('[data-player]').forEach((button) => button.addEventListener('click', () => current.player?.[button.dataset.player]()));
  ui.range.addEventListener('input', () => current.player?.seek(Number(ui.range.value)));
  ui.speed.addEventListener('change', () => current.player?.setSpeed(Number(ui.speed.value)));

  const onKey = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    const tag = event.target.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
    // Space on a player button means play/pause; on other buttons it keeps its native click.
    if (event.key === ' ' && tag === 'BUTTON' && !event.target.closest('.player')) return;
    if (!current.player) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      current.player.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      current.player.next();
    } else if (event.key === ' ') {
      event.preventDefault();
      current.player.toggle();
    }
  };
  document.addEventListener('keydown', onKey);
  current.cleanup.push(() => document.removeEventListener('keydown', onKey));

  if (module.side === 'data') mountData(module, root, ui, load);
  else mountAlgo(module, root, ui, load);
}
