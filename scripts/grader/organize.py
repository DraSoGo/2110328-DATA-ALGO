#!/usr/bin/env python3
"""Sort dataalgo-dump zip (from grader_dump.js) into topic/problem folders.

usage: python3 -I scripts/grader/organize.py <dump.zip> scripts/grader/problems.csv problems

<out_root>/<NN_topic>/<code>/
    config.json      {id, name, title, tags, topic, schedule, testcase_truncated}
    statement.pdf
    solution/        (extracted attachment) or solution.cpp (empty) if no attachment
    testcase/input/NN.in, testcase/output/NN.out
Problems not listed in CSV go to 99_Other. Existing solution files are never overwritten.
"""
import csv, io, json, re, sys, zipfile
from collections import OrderedDict
from pathlib import Path, PurePosixPath

BAD = re.compile(r'[\\/:*?"<>|]')


def safe(name):
    return BAD.sub('_', name).strip().rstrip('. ') or 'unnamed'


def norm_code(s):
    m = re.match(r'[A-Za-z0-9_]+', s.strip())
    return m.group(0) if m else None


def size_bytes(label):
    m = re.match(r'([\d.,]+)\s*(Bytes?|KB|MB|GB)', label or '', re.I)
    if not m:
        return None
    v = float(m.group(1).replace(',', ''))
    mult = {'b': 1, 'k': 1024, 'm': 1024 ** 2, 'g': 1024 ** 3}[m.group(2)[0].lower()]
    return int(v * mult)


def safe_member(name):
    p = PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts:
        return None
    return p


def read_csv(path):
    topics = OrderedDict()           # topic -> folder name
    where = {}                       # code -> list of (topic, date, session)
    with open(path, encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            topic = (row.get('หัวข้อ') or '').strip()
            code = norm_code(row.get('ชื่อโจทย์') or '')
            if not topic or not code:
                continue
            if topic not in topics:
                topics[topic] = f'{len(topics) + 1:02d}_{safe(topic)}'
            where.setdefault(code, []).append(
                {'topic': topic, 'date': (row.get('วันที่') or '').strip(), 'session': (row.get('ช่วงเวลา') or '').strip()})
    return topics, where


def main(zip_path, csv_path, out_root):
    out_root = Path(out_root)
    topics, where = read_csv(csv_path)
    z = zipfile.ZipFile(zip_path)

    # group members by problem dir
    probs = {}
    for info in z.infolist():
        p = safe_member(info.filename)
        if p is None or info.is_dir() or len(p.parts) < 2:
            continue
        probs.setdefault(p.parts[0], {})['/'.join(p.parts[1:])] = info

    report = {'placed': 0, 'other': [], 'missing_in_grader': [], 'truncated': {}, 'no_statement': []}
    for code, members in sorted(probs.items()):
        meta = json.loads(z.read(members['meta.json'])) if 'meta.json' in members else {'code': code}
        entries = where.get(code) or []
        dests = []
        seen = set()
        for e in entries:
            if e['topic'] not in seen:
                seen.add(e['topic'])
                dests.append(topics[e['topic']])
        if not dests:
            dests = ['99_Other']
            report['other'].append(code)

        # truncation check
        truncated = []
        for tc in meta.get('testcases', []):
            for kind, sub, ext in (('input', 'input', 'in'), ('output', 'output', 'out')):
                m = members.get(f'{sub}/{tc["n"]}.{ext}')
                want = size_bytes(tc.get(f'{kind}_size'))
                if m and want is not None and m.file_size + 16 < want:
                    truncated.append(f'{sub}/{tc["n"]}.{ext}')
        if truncated:
            report['truncated'][code] = len(truncated)

        for d in dests:
            pdir = out_root / d / safe(code)
            pdir.mkdir(parents=True, exist_ok=True)
            cfg = {
                'id': meta.get('id'),
                'name': code,
                'title': meta.get('title'),
                'tags': meta.get('tags', []),
                'topic': d.split('_', 1)[1] if d != '99_Other' else None,
                'schedule': [e for e in entries],
                'testcase_truncated': truncated,
            }
            (pdir / 'config.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding='utf-8')

            if 'statement.pdf' in members:
                (pdir / 'statement.pdf').write_bytes(z.read(members['statement.pdf']))
            elif 'statement.bin' in members:
                (pdir / 'statement.bin').write_bytes(z.read(members['statement.bin']))
            else:
                report['no_statement'].append(code)

            # solution
            att = members.get('attachment.zip') or members.get('attachment')
            if att:
                sol = pdir / 'solution'
                sol.mkdir(exist_ok=True)
                data = z.read(att)
                if att.filename.endswith('.zip'):
                    with zipfile.ZipFile(io.BytesIO(data)) as az:
                        for ai in az.infolist():
                            ap = safe_member(ai.filename)
                            if ap is None or ai.is_dir() or '__MACOSX' in ap.parts:
                                continue
                            dst = sol.joinpath(*[safe(x) for x in ap.parts])
                            if dst.exists():
                                continue
                            dst.parent.mkdir(parents=True, exist_ok=True)
                            dst.write_bytes(az.read(ai))
                else:
                    dst = sol / safe(meta.get('attachment_name') or 'attachment')
                    if not dst.exists():
                        dst.write_bytes(data)
            else:
                sc = pdir / 'solution.cpp'
                if not sc.exists():
                    sc.write_text('', encoding='utf-8')

            # testcases
            for rel, info in members.items():
                parts = rel.split('/')
                if len(parts) == 2 and parts[0] in ('input', 'output'):
                    dst = pdir / 'testcase' / parts[0] / safe(parts[1])
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    dst.write_bytes(z.read(info))
            report['placed'] += 1

    report['missing_in_grader'] = sorted(c for c in where if c not in probs)
    if '_errors.txt' in [i.filename for i in z.infolist()]:
        report['grader_errors'] = z.read('_errors.txt').decode('utf-8', 'replace').splitlines()
    (Path(__file__).resolve().parent / 'organize_report.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: (v if not isinstance(v, (list, dict)) else len(v)) for k, v in report.items()}, ensure_ascii=False))
    print('missing_in_grader:', report['missing_in_grader'])


if __name__ == '__main__':
    main(*sys.argv[1:4])
