// Code reading pages: the professor's header with clickable, explained regions.
// Every string placed in markup goes through escapeHtml or highlightCpp.

import { highlightCpp } from '../../lib/cpp-highlight.js';
import { escapeHtml } from '../../lib/html.js';
import { getLang, t } from '../../lib/i18n.js';
import { patchSvg } from '../engine/morph.js';
import { internalsFor } from '../internals.js';
import { findModule } from '../modules.js';
import { RENDERERS } from '../render/index.js';
import { buildFigure } from './figure-frames.js';
import { figureFor } from './figures.js';
import { HEADERS, loadAnnotations } from './index.js';
import { findRegions } from './regions.js';

const say = (value) => (value ? value[getLang()] || value.en : '');
const KIND_ORDER = ['class', 'type', 'field', 'ctor', 'helper', 'method', 'operator', 'iterator'];

let session = null;
let figureTimer = null;
let modalCleanup = null;

function stopFigure() {
  clearTimeout(figureTimer);
  figureTimer = null;
}

// First sentence, or a cut near 120 characters for text without sentence marks (Thai).
export function brief(text) {
  const first = text.match(/^(.{20,}?[.!?])(\s|$)/);
  if (first && first[1].length < text.length) return first[1];
  if (text.length <= 120) return text;
  const cutAt = text.lastIndexOf(' ', 120);
  return `${text.slice(0, cutAt > 60 ? cutAt : 120)}…`;
}

export function unmountCode() {
  stopFigure();
  modalCleanup?.();
  modalCleanup = null;
  session = null;
}

// ---------- index page ----------

const GUIDE = {
  intro: {
    en: 'Most data-structure problems on the grader hand you the professor\'s class (vector.h, list.h, map_bst.h …) and ask for ONE extra method. You write only its body, in student.h, and you may use every protected member directly. Read the header first: that is where the answer\'s building blocks are.',
    th: 'โจทย์ data structure บน grader ส่วนใหญ่จะให้ class ของอาจารย์มา (vector.h, list.h, map_bst.h …) แล้วให้เขียนเพิ่มแค่ "หนึ่ง" method เราเขียนเฉพาะตัว method ใน student.h และใช้สมาชิก protected ได้ทุกตัวโดยตรง จึงควรอ่าน header ให้เข้าใจก่อน เพราะชิ้นส่วนที่ใช้สร้างคำตอบอยู่ในนั้นหมด',
  },
  files: [
    { name: 'vector.h', en: 'The professor\'s class. Has one extra declaration, e.g. void uniq(); — do not edit the rest.', th: 'class ของอาจารย์ มีบรรทัดประกาศเพิ่มหนึ่งบรรทัด เช่น void uniq(); ส่วนอื่นห้ามแก้' },
    { name: 'student.h', en: 'Your file: the body of that one method, written outside the class.', th: 'ไฟล์ของเรา: เขียนตัว method นั้นไว้นอก class' },
    { name: 'main.cpp', en: 'The grader\'s test driver: includes the header, then student.h, reads input, calls your method, prints.', th: 'ตัวทดสอบของ grader: include header แล้วตามด้วย student.h อ่าน input เรียก method ของเรา แล้วพิมพ์ผล' },
  ],
  template: 'template <typename T>\nvoid CP::vector<T>::uniq() {\n  // inside, use the class members directly:\n  // mData, mSize, mCap, expand(), ensureCapacity() …\n}',
  rules: [
    { en: 'Start with template <typename T> (or the class\'s exact template list, e.g. <typename KeyT, typename MappedT, typename CompareT>) and qualify the name: CP::vector<T>::uniq.', th: 'ขึ้นต้นด้วย template <typename T> (หรือรายการ template ของ class นั้นให้ตรง เช่น <typename KeyT, typename MappedT, typename CompareT>) และเขียนชื่อเต็ม CP::vector<T>::uniq' },
    { en: 'Copy the return type and parameters exactly as declared in the header, including const and &.', th: 'คัดลอก return type และพารามิเตอร์ให้ตรงกับที่ประกาศใน header รวมถึง const และ &' },
    { en: 'A type declared inside the class needs typename in front when used as a return type: typename CP::list<T>::iterator.', th: 'type ที่ประกาศใน class ต้องมี typename นำหน้าเมื่อใช้เป็น return type เช่น typename CP::list<T>::iterator' },
    { en: 'Keep every invariant true when your method returns: sizes, capacities, front indexes, header links, parent pointers.', th: 'ก่อน method จบ ทุก invariant ต้องยังเป็นจริง: size, capacity, ตำแหน่ง front, ลิงก์ของ header, parent pointer' },
    { en: 'Reuse the header\'s helpers (expand, ensureCapacity, insert/erase, find_node, fixUp/fixDown …) instead of rewriting them.', th: 'ใช้ helper ที่ header มีให้ (expand, ensureCapacity, insert/erase, find_node, fixUp/fixDown …) แทนการเขียนใหม่เอง' },
    { en: 'Mind the required complexity in the statement: an O(n) loop that calls an O(n) erase is O(n²).', th: 'ดูความซับซ้อนที่โจทย์กำหนด: loop O(n) ที่เรียก erase ที่เป็น O(n) จะกลายเป็น O(n²)' },
    { en: 'Test locally: put the three files in one folder and run g++ -std=c++17 main.cpp -o main && ./main < input.txt.', th: 'ทดสอบเอง: วางสามไฟล์ไว้ในโฟลเดอร์เดียวแล้วรัน g++ -std=c++17 main.cpp -o main && ./main < input.txt' },
  ],
};

export function codeIndexMarkup() {
  const groups = [...new Set(HEADERS.map((item) => item.group))];
  return `<section class="code-guide">
      <p class="code-lead">${escapeHtml(say(GUIDE.intro))}</p>
      <div class="code-files">${GUIDE.files.map((file) => `<div><code translate="no">${escapeHtml(file.name)}</code><p>${escapeHtml(say(file))}</p></div>`).join('')}</div>
      <h2>${escapeHtml(t('code.howTo'))}</h2>
      <pre class="code-block" translate="no"><code class="language-cpp">${highlightCpp(GUIDE.template)}</code></pre>
      <ol class="code-rules">${GUIDE.rules.map((rule) => `<li>${escapeHtml(say(rule))}</li>`).join('')}</ol>
      <h2>${escapeHtml(t('code.headers'))}</h2>
      ${groups.map((group) => `<p class="module-group">${escapeHtml(group)}</p><div class="code-cards">${HEADERS.filter((item) => item.group === group).map((item) => `<a class="code-card" href="#/learn/data/${item.module}/code"><code translate="no">${escapeHtml(item.file)}</code><small translate="no">${escapeHtml(item.className)}</small></a>`).join('')}</div>`).join('')}
    </section>`;
}

// ---------- header reader (the Code tab of a Data module) ----------

function headerTopMarkup(data) {
  return `<p class="code-source-line"><code translate="no">${escapeHtml(data.title)}</code> · ${escapeHtml(brief(say(data.overview)))}</p>`;
}

function codeLinesMarkup(source, regions, data) {
  const lines = source.split('\n');
  // Smallest region covering each line, so nested methods win over the class region.
  const owner = lines.map((_, i) => {
    let best = null;
    for (const region of data.regions) {
      const range = regions[region.id].range;
      if (!range || i < range.start || i > range.end) continue;
      if (!best || range.end - range.start < best.size) best = { id: region.id, size: range.end - range.start };
    }
    return best?.id ?? null;
  });
  const starts = new Map(data.regions.filter((region) => regions[region.id].range).map((region) => [regions[region.id].range.start, region]));
  return lines.map((line, i) => {
    const start = starts.get(i);
    const tag = start ? `<b class="code-tag kind-${escapeHtml(start.kind)}">${escapeHtml(start.kind)}</b>` : '';
    return `<span class="code-line${owner[i] ? ' in-region' : ''}" data-line="${i}"${owner[i] ? ` data-region="${escapeHtml(owner[i])}"` : ''}><i>${i + 1}</i>${highlightCpp(line) || ' '}${tag}</span>`;
  }).join('');
}

function outlineMarkup(data, regions) {
  const sorted = [...data.regions].filter((region) => regions[region.id].range)
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || regions[a.id].range.start - regions[b.id].range.start);
  return `<div class="code-outline">${sorted.map((region) => `<button type="button" class="kind-${escapeHtml(region.kind)}" data-pick="${escapeHtml(region.id)}">${escapeHtml(say(region.title))}</button>`).join('')}</div>`;
}

function panelMarkup(data, regions, id, figure) {
  const region = data.regions.find((item) => item.id === id);
  if (!region) return `<p class="code-hint">${escapeHtml(t('code.pickHint'))}</p>`;
  const notes = region.notes || [];
  const what = say(region.what);
  const short = brief(what);
  return `<p class="code-kind kind-${escapeHtml(region.kind)}">${escapeHtml(region.kind)}${region.time ? ` · <b translate="no">${escapeHtml(region.time)}</b>` : ''}</p>
    <h2 translate="no">${escapeHtml(say(region.title))}</h2>
    ${region.use ? `<div class="code-use"><span>${escapeHtml(t('code.usage'))}</span><pre translate="no"><code class="language-cpp">${highlightCpp(region.use)}</code></pre></div>` : ''}
    ${figure ? `<div class="code-figure"><div class="viz-host fig-host"></div><div class="fig-chips" translate="no"></div><p class="fig-msg"></p>
      <div class="fig-controls" hidden>
        <button type="button" data-fig="first" aria-label="${escapeHtml(t('player.first'))}">⏮</button>
        <button type="button" data-fig="prev" aria-label="${escapeHtml(t('player.prev'))}">‹</button>
        <button type="button" data-fig="toggle" class="fig-play" aria-label="${escapeHtml(t('player.pause'))}">❚❚</button>
        <button type="button" data-fig="next" aria-label="${escapeHtml(t('player.next'))}">›</button>
        <button type="button" data-fig="last" aria-label="${escapeHtml(t('player.last'))}">⏭</button>
        <input type="range" class="fig-range" min="0" max="0" value="0" aria-label="${escapeHtml(t('player.step'))}">
        <span class="fig-count">1 / 1</span>
      </div></div>` : ''}
    <p class="code-what">${escapeHtml(short)}${short !== what ? ` <button type="button" class="code-more" data-more>${escapeHtml(t('code.more'))}</button>` : ''}</p>
    ${notes.length ? `<div class="code-notes">${notes.map((note, i) => `<button type="button" data-note="${i}" ${regions[id].noteLines[i] === null ? 'disabled' : ''}><code translate="no">${escapeHtml(note.match)}</code></button>`).join('')}</div><p class="note-callout" hidden></p>` : ''}`;
}

function bottomMarkup(data, problemHref) {
  return `<div class="code-two">
      <section class="code-box"><h2>${escapeHtml(t('code.writing'))}</h2><pre class="code-block" translate="no"><code class="language-cpp">${highlightCpp(data.student.code)}</code></pre></section>
      <section class="code-box"><h2>${escapeHtml(t('code.problems'))}</h2><div class="code-problem-chips">${data.problems.map((item) => {
        const href = problemHref(item.name);
        const label = `<code translate="no">${escapeHtml(item.name)}</code>`;
        return href ? `<a href="${escapeHtml(href)}" title="${escapeHtml(brief(say(item)))}">${label}</a>` : `<span title="${escapeHtml(brief(say(item)))}">${label}</span>`;
      }).join('')}</div></section>
    </div>`;
}

// Draws a region's figure into the panel: an op animation that loops, or a still
// picture with highlights and member chips.
function mountFigure(panel, header, figure) {
  stopFigure();
  const host = panel.querySelector('.fig-host');
  if (!host || !figure) return;
  const module = findModule('data', header.module);
  if (!module) return;
  const info = internalsFor(module);
  const msg = panel.querySelector('.fig-msg');
  const chips = panel.querySelector('.fig-chips');
  let frames;
  try {
    frames = buildFigure(module, figure);
  } catch {
    host.closest('.code-figure')?.remove();
    return;
  }
  if (!frames.length) return;
  let layout = '';
  const draw = (frame, animate) => {
    // Rebuild the panel slots when their number or labels change; otherwise patch in place so items slide.
    const signature = frame.panels.map((item) => `${item.renderer}|${item.label}`).join('/');
    if (signature !== layout) {
      layout = signature;
      animate = false;
      host.classList.toggle('is-multi', frame.panels.length > 1);
      host.innerHTML = frame.panels.map((item) => `<div class="fig-panel">${item.label ? `<p class="fig-label" translate="no">${escapeHtml(item.label)}</p>` : ''}<div class="fig-svg"></div></div>`).join('');
    }
    const slots = host.querySelectorAll('.fig-svg');
    host.style.setProperty('--viz-dur', '420ms');
    frame.panels.forEach((item, i) => patchSvg(slots[i], RENDERERS[item.renderer](item.state, item.hl), { animate }));
    msg.textContent = frame.msg;
    const rows = info ? info.members(frame.panels[0].state) : [];
    chips.innerHTML = (figure.members || []).map((name) => rows.find((row) => row.name === name)).filter(Boolean)
      .map((row) => `<span class="fig-chip"><b>${escapeHtml(row.name)}</b> ${escapeHtml(row.value)}</span>`).join('');
  };
  if (frames.length === 1) {
    draw(frames[0], false);
    return;
  }
  // Step controls: autoplay loops until the reader steps, seeks, or pauses.
  const controls = panel.querySelector('.fig-controls');
  const range = controls.querySelector('.fig-range');
  const count = controls.querySelector('.fig-count');
  const playButton = controls.querySelector('.fig-play');
  controls.hidden = false;
  range.max = String(frames.length - 1);
  let index = 0;
  let playing = true;
  const show = (target, animate) => {
    index = Math.max(0, Math.min(frames.length - 1, target));
    draw(frames[index], animate);
    range.value = String(index);
    count.textContent = `${index + 1} / ${frames.length}`;
  };
  const setPlaying = (value) => {
    playing = value;
    stopFigure();
    playButton.textContent = playing ? '❚❚' : '▶';
    playButton.setAttribute('aria-label', t(playing ? 'player.pause' : 'player.play'));
    if (playing) schedule();
  };
  const schedule = () => {
    figureTimer = setTimeout(() => {
      if (index < frames.length - 1) {
        show(index + 1, true);
        schedule();
      } else {
        figureTimer = setTimeout(() => {
          show(0, false);
          schedule();
        }, 1600);
      }
    }, 1100);
  };
  controls.addEventListener('click', (event) => {
    const action = event.target.closest('[data-fig]')?.dataset.fig;
    if (!action) return;
    if (action === 'toggle') {
      if (!playing && index === frames.length - 1) show(0, false);
      setPlaying(!playing);
      return;
    }
    setPlaying(false);
    if (action === 'first') show(0, false);
    else if (action === 'last') show(frames.length - 1, false);
    else if (action === 'prev') show(index - 1, false);
    else if (action === 'next') show(index + 1, true);
  });
  range.addEventListener('input', () => {
    setPlaying(false);
    show(Number(range.value), false);
  });
  show(0, false);
  setPlaying(true);
}

export async function mountHeader(host, header, { problemHref = () => null, focusOp = null } = {}) {
  const token = {};
  session = token;
  let data;
  let source;
  try {
    [data, source] = await Promise.all([
      loadAnnotations(header.id),
      fetch(new URL(`./headers/${header.file}`, import.meta.url)).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      }),
    ]);
  } catch {
    if (session === token) host.innerHTML = `<div class="stage-empty"><h2>${escapeHtml(t('code.notReady'))}</h2></div>`;
    return;
  }
  if (session !== token || !host.isConnected) return;
  const regions = findRegions(source, data.regions);
  host.innerHTML = `${headerTopMarkup(data)}
    <div class="code-reader">
      <div class="code-main">${outlineMarkup(data, regions)}<pre class="code-block code-source" translate="no"><code class="language-cpp">${codeLinesMarkup(source, regions, data)}</code></pre>
        <div class="code-pop" role="dialog" hidden>
          <button type="button" class="code-pop-close" data-close aria-label="${escapeHtml(t('code.close'))}">✕</button>
          <div class="code-panel-box" aria-live="polite"></div>
        </div></div>
    </div>
    ${bottomMarkup(data, problemHref)}`;

  const panel = host.querySelector('.code-panel-box');
  const pop = host.querySelector('.code-pop');
  const codeMain = host.querySelector('.code-main');
  const close = () => {
    stopFigure();
    pop.hidden = true;
  };
  pop.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) close();
  });
  const onKey = (event) => {
    if (event.key === 'Escape' && !pop.hidden) close();
  };
  // A click anywhere outside the popover and the code closes it.
  const onDocClick = (event) => {
    if (!pop.hidden && !pop.contains(event.target) && !event.target.closest('[data-region],[data-pick]')) close();
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', onDocClick);
  modalCleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onDocClick);
  };
  // Pins the popover just above the region's first line, or below its last line
  // when there is no room above. Anchoring by bottom lets it grow upward.
  const place = (range) => {
    const first = lineEls[range.start];
    const last = lineEls[range.end];
    pop.style.top = '';
    pop.style.bottom = '';
    const roomAbove = first.getBoundingClientRect().top - 80;
    if (pop.offsetHeight + 12 <= roomAbove) {
      pop.style.bottom = `${codeMain.clientHeight - first.offsetTop + 8}px`;
    } else {
      pop.style.top = `${last.offsetTop + last.offsetHeight + 8}px`;
    }
    pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  const lineEls = [...host.querySelectorAll('.code-source .code-line')];
  let selected = null;
  const select = (id, scroll) => {
    selected = id;
    const range = regions[id]?.range;
    lineEls.forEach((el, i) => {
      el.classList.toggle('is-sel', Boolean(range) && i >= range.start && i <= range.end);
      el.classList.remove('is-note');
    });
    (regions[id]?.noteLines || []).forEach((line) => { if (line !== null) lineEls[line].classList.add('is-note'); });
    host.querySelectorAll('[data-pick]').forEach((button) => button.classList.toggle('is-on', button.dataset.pick === id));
    const region = data.regions.find((item) => item.id === id);
    const figure = region ? figureFor(header.id, region) : null;
    panel.innerHTML = panelMarkup(data, regions, id, figure);
    pop.hidden = false;
    mountFigure(panel, header, figure);
    if (scroll && range) lineEls[range.start].scrollIntoView({ block: 'center' });
    if (range) place(range);
  };
  host.querySelector('.code-source').addEventListener('click', (event) => {
    const line = event.target.closest('[data-region]');
    if (line) select(line.dataset.region, false);
  });
  host.querySelector('.code-outline').addEventListener('click', (event) => {
    const button = event.target.closest('[data-pick]');
    if (button) select(button.dataset.pick, true);
  });
  panel.addEventListener('click', (event) => {
    if (event.target.closest('[data-more]')) {
      const region = data.regions.find((item) => item.id === selected);
      panel.querySelector('.code-what').textContent = say(region.what);
      return;
    }
    const button = event.target.closest('[data-note]');
    if (!button || !selected) return;
    const note = data.regions.find((item) => item.id === selected).notes[Number(button.dataset.note)];
    const callout = panel.querySelector('.note-callout');
    callout.hidden = false;
    callout.textContent = say(note);
    panel.querySelectorAll('[data-note]').forEach((item) => item.classList.toggle('is-on', item === button));
    const line = regions[selected].noteLines[Number(button.dataset.note)];
    if (line === null) return;
    lineEls.forEach((el) => el.classList.remove('is-note-active'));
    lineEls[line].classList.add('is-note-active');
    lineEls[line].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  const focus = focusOp && data.regions.find((region) => region.op === focusOp);
  if (focus) select(focus.id, true);
}
