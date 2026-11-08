// CEDT Grader — DataAlgo dump
// วิธีใช้: เปิด https://cedt-grader.nattee.net/main/list (login แล้ว) → F12 → Console → วางทั้งไฟล์ → Enter
// ผลลัพธ์: dataalgo-dump-YYYY-MM-DD.zip ใน Downloads
// โครงสร้างใน zip:
//   <code>/meta.json        { id, code, title, tags, testcases: [{input_size, output_size}] }
//   <code>/statement.pdf
//   <code>/attachment.zip   (ถ้ามี)
//   <code>/input/NN.in, <code>/output/NN.out   (เป็น preview ≤2KB ตามสิทธิ์ grader)
(() => {
  'use strict';

  const TAG = 'DataAlgo';
  // ถ้าใส่ชื่อโจทย์ตรงนี้ จะโหลดเฉพาะโจทย์เหล่านี้ (ไม่สน tag) เช่น ['a66_q1a_day_cover']
  const CODES = ['a66_q1a_day_cover'];
  const enc = new TextEncoder();
  const ZW = /[\u200b-\u200d\ufeff]/g;

  const cleanName = (v) => (v || '')
    .replace(ZW, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[. ]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || 'unnamed';

  // ---------- zip (store only) ----------
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (b) => {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  function buildZip(files) {
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const local = [], central = [];
    let off = 0, csize = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = f.data;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, off, true);
      local.push(new Uint8Array(lh.buffer), name, data);
      central.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + data.length;
      csize += 46 + name.length;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob([...local, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  async function mapLimit(items, limit, worker) {
    const out = new Array(items.length);
    let next = 0;
    const run = async () => { while (next < items.length) { const i = next++; out[i] = await worker(items[i], i); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return out;
  }

  // ---------- collect DataAlgo problems from /main/list ----------
  function collectProblems() {
    const list = [];
    const seen = new Set();
    for (const tr of document.querySelectorAll('tbody tr')) {
      // problem id from any problem-scoped link (statement / attachment / testcases / submissions)
      const idLink = [...tr.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href').match(/\/problems\/(\d+)\/|\/show_problem\/(\d+)|\/submissions\/prob\/(\d+)/))
        .find(Boolean);
      if (!idLink) continue;
      const id = Number(idLink[1] || idLink[2] || idLink[3]);
      const tags = [...tr.querySelectorAll('.badge')].map((b) => b.textContent.trim());
      const code = cleanName(tr.querySelector('.text-muted.font-monospace')?.textContent);
      if (CODES.length ? !CODES.includes(code) : !tags.includes(TAG)) continue;
      seen.add(code);
      list.push({
        id,
        code,
        title: (tr.querySelector('strong')?.textContent || '').replace(ZW, '').trim(),
        tags: tags.filter((t) => t !== TAG),
        hasAttachment: !!tr.querySelector('a[href*="/download/attachment"]'),
        hasTestcases: !!tr.querySelector('a[href*="/testcases/show_problem/"]'),
      });
    }
    // fallback for CODES not in the table: take id from the submission dropdown "[code] title"
    for (const code of CODES) {
      if (seen.has(code)) continue;
      const opt = [...document.querySelectorAll('select option')]
        .find((o) => o.textContent.replace(ZW, '').trim().startsWith(`[${code}]`));
      if (!opt || !/^\d+$/.test(opt.value)) { console.warn(`ไม่พบ ${code} ทั้งในตารางและ dropdown`); continue; }
      list.push({
        id: Number(opt.value),
        code,
        title: opt.textContent.replace(ZW, '').replace(`[${code}]`, '').trim(),
        tags: [],
        hasAttachment: true,
        hasTestcases: true,
      });
      console.log(`${code}: ไม่อยู่ในตาราง ใช้ id ${opt.value} จาก dropdown`);
    }
    return list;
  }

  async function get(url) {
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r;
  }

  async function readTestcases(id) {
    const html = await (await get(`/testcases/show_problem/${id}`)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cases = [];
    for (const pane of doc.querySelectorAll('.tab-pane[id^="tc"]')) {
      const cols = [...pane.querySelectorAll('.col-md-6')];
      const ta = pane.querySelectorAll('textarea');
      if (ta.length < 2) continue;
      cases.push({
        input: ta[0].textContent || '',
        output: ta[1].textContent || '',
        input_size: cols[0]?.querySelector('.text-secondary.small')?.textContent.trim() || '',
        output_size: cols[1]?.querySelector('.text-secondary.small')?.textContent.trim() || '',
      });
    }
    return cases;
  }

  async function dumpProblem(p, files, errors) {
    const dir = p.code;
    const meta = { id: p.id, code: p.code, title: p.title, tags: p.tags, testcases: [] };

    try {
      const r = await get(`/problems/${p.id}/download/statement?disposition=attachment`);
      const b = new Uint8Array(await r.arrayBuffer());
      const isPdf = b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
      const html = (r.headers.get('content-type') || '').includes('text/html');
      if (b.length && (isPdf || !html)) files.push({ name: `${dir}/statement.${isPdf ? 'pdf' : 'bin'}`, data: b });
      else errors.push(`${dir} statement: ไม่ใช่ PDF (${r.headers.get('content-type')})`);
    } catch (e) { errors.push(`${dir} statement: ${e.message}`); }

    if (p.hasAttachment) {
      try {
        const r = await get(`/problems/${p.id}/download/attachment`);
        const b = new Uint8Array(await r.arrayBuffer());
        const html = (r.headers.get('content-type') || '').includes('text/html');
        if (b.length && !html) {
          const isZip = b[0] === 0x50 && b[1] === 0x4b;
          const cd = r.headers.get('content-disposition') || '';
          const fn = decodeURIComponent(cd.match(/filename\*=UTF-8''([^;]+)/)?.[1] || '') || cd.match(/filename="([^"]+)"/)?.[1];
          files.push({ name: `${dir}/attachment${isZip ? '.zip' : ''}`, data: b });
          meta.attachment_name = fn || null;
        }
      } catch (e) { errors.push(`${dir} attachment: ${e.message}`); }
    }

    if (p.hasTestcases) {
      try {
        const cases = await readTestcases(p.id);
        const w = Math.max(2, String(cases.length).length);
        cases.forEach((c, i) => {
          const n = String(i + 1).padStart(w, '0');
          files.push({ name: `${dir}/input/${n}.in`, data: enc.encode(c.input) });
          files.push({ name: `${dir}/output/${n}.out`, data: enc.encode(c.output) });
          meta.testcases.push({ n, input_size: c.input_size, output_size: c.output_size });
        });
      } catch (e) { errors.push(`${dir} testcases: ${e.message}`); }
    }

    files.push({ name: `${dir}/meta.json`, data: enc.encode(JSON.stringify(meta, null, 2)) });
  }

  async function main() {
    const problems = collectProblems();
    if (!problems.length) throw new Error(`ไม่พบโจทย์ (tag ${TAG} / CODES) — ต้องรันที่หน้า /main/list`);
    console.log(`พบ ${problems.length} โจทย์ ${TAG}`);

    const files = [];
    const errors = [];
    let done = 0;
    await mapLimit(problems, 3, async (p) => {
      await dumpProblem(p, files, errors);
      done++;
      console.log(`[${done}/${problems.length}] ${p.code}`);
    });

    files.push({ name: '_problems.json', data: enc.encode(JSON.stringify(problems, null, 2)) });
    if (errors.length) files.push({ name: '_errors.txt', data: enc.encode(errors.join('\n')) });

    console.log(`สร้าง ZIP (${files.length} ไฟล์)...`);
    const blob = buildZip(files);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dataalgo-dump-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    console.log(`เสร็จ: ${(blob.size / 1048576).toFixed(1)} MB, error ${errors.length} รายการ`, errors);
  }

  main().catch((e) => console.error('ล้มเหลว:', e));
})();
