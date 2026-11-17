// Tests for scripts/check-english-only.mjs, the English-only guard (decision 039). Each test writes a small tree to a temporary
// folder and runs the real script on it with --root and --config, so the command line is what is tested. The Arabic samples are
// built from code points: this file holds no Arabic itself.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it, vi } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(here, 'check-english-only.mjs');
const AR_WORD = String.fromCodePoint(0x645, 0x631, 0x62d, 0x628, 0x627);
const hasGit = spawnSync('git', ['--version']).status === 0;
// Every run starts a node process; give them room while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const made = [];
afterAll(() => made.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** Writes `files` ({ path: text }) and a config to a new temporary folder; `config` overrides the defaults. */
function tree(files, config = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'english-only-'));
  made.push(dir);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  const configPath = join(dir, 'english-only.config.json');
  writeFileSync(configPath, JSON.stringify({ roots: ['src'], frontend: true, ...config }));
  return { dir, configPath };
}

/** Runs the script; `code` is the exit status and `out` everything it printed. */
function run(t, ...extra) {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', t.dir, '--config', t.configPath, ...extra], {
    encoding: 'utf8',
  });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

const entry = (path) => ({ path, why: 'a reason' });
/** One run over a tree with a file for each line (its second line); returns the lines the guard found. One run, not one per line. */
function flaggedLines(lines, config = {}) {
  const files = Object.fromEntries(lines.map((line, i) => [`src/l${i}.ts`, `const x = 1;\n${line}\n`]));
  const { out } = run(tree(files, config));
  return lines.filter((_, i) => out.includes(`src/l${i}.ts:2:`));
}

describe('R1 Arabic script', () => {
  it('passes a tree with no Arabic and says how many files it read', () => {
    const result = run(tree({ 'src/a.ts': 'export const a = 1;\n', 'src/b.md': 'Hello\n' }));
    expect(result).toEqual({ code: 0, out: 'english-only: ok (2 files read)\n' });
  });

  it('fails on Arabic letters and names the file and the line', () => {
    const result = run(tree({ 'src/a.ts': `const a = 1;\nconst name = '${AR_WORD}';\n` }));
    expect(result.code).toBe(1);
    expect(result.out).toContain('src/a.ts:2: R1 Arabic script');
  });

  it('covers the five ranges, edge to edge, and nothing next to them', () => {
    const inside = [0x600, 0x6ff, 0x750, 0x77f, 0x8a0, 0x8ff, 0xfb50, 0xfdff, 0xfe70, 0xfeff];
    const next = [0x5ff, 0x700, 0x74f, 0x780, 0x89f, 0x900, 0xfb4f, 0xfe00, 0xfe6f, 0xff00];
    const line = (code) => `// ${String.fromCodePoint(code)}`;
    expect(flaggedLines([...inside, ...next].map(line))).toEqual(inside.map(line));
  });

  it('does not take a byte order mark at the start of a file for Arabic', () => {
    const result = run(tree({ 'src/a.ts': `\ufeffexport const a = 1;\n` }));
    expect(result.code).toBe(0);
  });
});

describe('R2 the ar locale', () => {
  it('finds the literal, the tags, the attributes, hreflang, the query and the path', () => {
    const lines = [
      `const l = 'ar';`,
      `const l = "ar";`,
      'const l = `ar`;',
      `{"ar": "text"}`,
      `type L = "en" | "ar";`,
      `const tag = 'ar-JO';`,
      `Accept-Language: ar_JO`,
      `<html lang="ar">`,
      `<p lang=ar>`,
      `p:lang(ar) { color: red }`,
      `<link rel="alternate" hrefLang="en" />`,
      `fetch('/x?locale=ar')`,
      `const p = '/ar';`,
      `const p = '/ar/services/x';`,
      `const p = "/ar?x=1";`,
      'const p = `/ar/${slug}`;',
      `if (path.startsWith('/ar')) return;`,
      `const re = /^\\/ar(\\/|$)/;`,
      `const u = 'https://shop.example/ar/services';`,
    ];
    expect(flaggedLines(lines)).toEqual(lines);
  });

  it('leaves the country code, other words and other paths alone', () => {
    expect(
      flaggedLines([
        `const country = 'AR';`,
        `const word = 'area';`,
        `const word = "far" + 'char' + \`bar\`;`,
        `const v = ar + 1;`,
        `const name = 'name_ar_x';`,
        `const p = '/arrow';`,
        `const p = '/usr/bin/ar';`,
        `const p = '/en/services';`,
        `// ar is short for array here`,
        `const tag = 'en-GB';`,
        `<html lang="en" dir="ltr">`,
      ]),
    ).toEqual([]);
  });
});

describe('R3 right-to-left layout code', () => {
  it('finds a dir attribute with the value rtl, quoted either way or escaped, in every repository', () => {
    const lines = [
      `<div dir="rtl">`,
      `<div dir='rtl'>`,
      `const html = "<div dir=\\"rtl\\">";`,
      `<div dir={'rtl'}>`,
      `<div dir=rtl>`,
      `<div dir={isRtl ? 'rtl' : 'ltr'}>`,
      `el.setAttribute('dir', 'rtl');`,
      `const props = { dir: 'rtl' as const };`,
      `html[dir='rtl'] .switch { color: red }`,
      `[dir="rtl"] .x { color: red }`,
    ];
    expect(flaggedLines(lines, { frontend: false })).toEqual(lines);
    expect(flaggedLines(lines, { frontend: true })).toEqual(lines);
    expect(flaggedLines([`<div dir="auto"><bdi dir="ltr">x</bdi></div>`], { frontend: true })).toEqual([]);
  });

  it('finds the selectors, the Tailwind variant and the computed direction only where frontend is true', () => {
    const lines = [
      `[dir=rtl] .x { color: red }`,
      `.x:dir(rtl) { color: red }`,
      `<div className="ms-2 rtl:translate-x-full">`,
      `<div className="lg:rtl:translate-x-0">`,
      `const style = getComputedStyle(el).direction;`,
      `const style = getComputedStyle(e.currentTarget)  .direction;`,
    ];
    expect(flaggedLines(lines, { frontend: true })).toEqual(lines);
    expect(flaggedLines(lines, { frontend: false })).toEqual([]);
  });

  it('is not about the direction of a text run: comparing it or typing it is group C', () => {
    const lines = [
      `if (run.direction === 'rtl') reverse(run);`,
      `const rtl = direction === 'rtl';`,
      `type Direction = 'ltr' | 'rtl';`,
      `export function scriptDirection(text: string): 'ltr' | 'rtl' {`,
      `const flags = { rtl: true };`,
      `const state = { isRtl: false, rtl: 1 };`,
      `<html lang={lang} dir={dirOf(lang)}>`,
    ];
    expect(flaggedLines(lines, { frontend: true })).toEqual([]);
    expect(flaggedLines(lines, { frontend: false })).toEqual([]);
  });
});

describe('what is read', () => {
  it('reads the text extensions and skips the other kinds of file without decoding them', () => {
    const names = [
      'a.ts',
      'a.tsx',
      'a.js',
      'a.jsx',
      'a.mjs',
      'a.cjs',
      'a.json',
      'a.sql',
      'a.css',
      'a.md',
      'a.html',
      'a.yml',
      'a.yaml',
      'a.sh',
      'a.svg',
      'a.txt',
    ];
    const { out } = run(tree(Object.fromEntries(names.map((name) => [`src/${name}`, AR_WORD]))));
    for (const name of names) expect(out, name).toContain(`src/${name}:1: R1`);
    const skipped = tree({
      'src/a.png': Buffer.from([0xd9, 0x85, 0xd8, 0xb1]), // bytes that decode to Arabic letters
      'src/b.ttf': `${AR_WORD}`,
      'src/c.jpg': `${AR_WORD}`,
      'src/d.py': `${AR_WORD}`,
      'src/e': AR_WORD,
    });
    expect(run(skipped)).toEqual({ code: 0, out: 'english-only: ok (0 files read)\n' });
  });

  it('reads the folders and files of "roots" and nothing else, and a root named as a file whatever its extension', () => {
    const t = tree(
      {
        'src/in.ts': 'a',
        'other/out.ts': AR_WORD,
        'compose.yaml': 'a: 1',
        '.env.example': `KEY=${AR_WORD}`,
        'x.cfg': AR_WORD,
      },
      { roots: ['src', 'compose.yaml', '.env.example'] },
    );
    const result = run(t);
    expect(result.code).toBe(1);
    expect(result.out).toContain('.env.example:1: R1');
    expect(result.out).not.toContain('other/out.ts');
    expect(result.out).not.toContain('x.cfg');
  });

  it('never reads itself, its config or a file named check-english-only.test.*', () => {
    const t = tree(
      {
        'src/check-english-only.test.mjs': `'${AR_WORD}' "ar" dir="rtl"`,
        'src/deep/check-english-only.test.ts': AR_WORD,
        'src/ok.ts': 'a',
      },
      { roots: ['src', 'english-only.config.json'], why: AR_WORD },
    );
    expect(run(t)).toEqual({ code: 0, out: 'english-only: ok (1 files read)\n' });
    const own = tree(
      { 'src/ok.ts': 'a', 'scripts/english-only.config.json': '{}' },
      { roots: ['src', 'scripts'] },
    );
    writeFileSync(
      join(own.dir, 'scripts/english-only.config.json'),
      JSON.stringify({ roots: ['src', 'scripts'], why: AR_WORD }),
    );
    writeFileSync(join(own.dir, 'scripts/check-english-only.mjs'), readFileSync(SCRIPT, 'utf8'));
    // run the copy with the defaults: root is the folder above the script, config is the one next to it
    const result = spawnSync(process.execPath, [join(own.dir, 'scripts/check-english-only.mjs')], {
      encoding: 'utf8',
    });
    expect(`${result.stdout}${result.stderr}`).toBe('english-only: ok (1 files read)\n');
  });

  it('walks the tree without git, skipping node_modules and build output', () => {
    const t = tree({
      'src/node_modules/p/a.ts': AR_WORD,
      'src/dist/a.ts': AR_WORD,
      'src/build/a.ts': AR_WORD,
      'src/.next/a.ts': AR_WORD,
      'src/ok.ts': 'a',
    });
    expect(run(t)).toEqual({ code: 0, out: 'english-only: ok (1 files read)\n' });
  });

  it.skipIf(!hasGit)(
    'reads what git tracks and new files git does not ignore, and never an ignored or a deleted file',
    () => {
      const t = tree({
        '.gitignore': 'src/ignored.ts\n',
        'src/tracked.ts': 'a',
        'src/ignored.ts': AR_WORD,
        'src/gone.ts': AR_WORD,
      });
      const git = (...args) => spawnSync('git', ['-C', t.dir, ...args], { encoding: 'utf8' });
      expect(git('init', '-q').status).toBe(0);
      git('add', 'src/tracked.ts', 'src/gone.ts');
      rmSync(join(t.dir, 'src/gone.ts'));
      writeFileSync(join(t.dir, 'src/new.ts'), AR_WORD);
      const result = run(t);
      expect(result.code).toBe(1);
      expect(result.out).toContain('src/new.ts:1: R1');
      expect(result.out).not.toContain('ignored.ts');
      expect(result.out).not.toContain('gone.ts');
    },
  );
});

describe('the allowlist (R1 to R3 outside it, R4 inside it)', () => {
  const arabic = { 'src/group-c.test.ts': `expect(name).toBe('${AR_WORD}');\n`, 'src/ok.ts': 'a' };

  it('lets an allowed file keep its Arabic text, and a glob or a folder allow what they match', () => {
    for (const path of [
      'src/group-c.test.ts',
      'src/*.test.ts',
      'src/**/*.test.ts',
      'src/group-c.{test,spec}.ts',
      'src/group-c.test.t?',
    ]) {
      expect(run(tree(arabic, { allow: [entry(path)] })).code, path).toBe(0);
    }
    expect(
      run(tree({ 'src/dir/a.ts': AR_WORD, 'src/dir/b.ts': AR_WORD }, { allow: [entry('src/dir')] })).code,
    ).toBe(0);
    expect(run(tree(arabic, { allow: [entry('src/other.ts')] })).code).toBe(1);
  });

  it('also lets an allowed file keep the ar locale and right-to-left code', () => {
    const t = tree({ 'src/a.ts': `const l = 'ar';\n<div dir="rtl">\n` }, { allow: [entry('src/a.ts')] });
    expect(run(t).code).toBe(0);
  });

  it('fails R4 when an allow entry matches no file', () => {
    const result = run(tree(arabic, { allow: [entry('src/group-c.test.ts'), entry('src/removed.test.ts')] }));
    expect(result.code).toBe(1);
    expect(result.out).toContain('R4 allow entry src/removed.test.ts matches no file');
  });

  it('fails R4 when an allowed file no longer holds Arabic script or the ar locale', () => {
    const result = run(
      tree({ 'src/group-c.test.ts': 'expect(1).toBe(1);\n' }, { allow: [entry('src/group-c.test.ts')] }),
    );
    expect(result.code).toBe(1);
    expect(result.out).toContain('R4 src/group-c.test.ts is allowed but no longer holds');
  });

  it('counts only R1 and R2: a file that holds right-to-left code and nothing else is not worth allowing', () => {
    const result = run(tree({ 'src/a.tsx': '<div dir="rtl" />\n' }, { allow: [entry('src/a.tsx')] }));
    expect(result.code).toBe(1);
    expect(result.out).toContain('R4 src/a.tsx is allowed but no longer holds');
  });

  it('fails R4 when an allowed file is not read at all (a picture, a file outside the roots)', () => {
    expect(run(tree({ 'src/a.png': AR_WORD, 'src/ok.ts': 'a' }, { allow: [entry('src/a.png')] })).code).toBe(
      1,
    );
    expect(
      run(tree({ 'other/a.ts': AR_WORD, 'src/ok.ts': 'a' }, { allow: [entry('other/a.ts')] })).code,
    ).toBe(1);
  });

  it('takes a file out of the scan with notScanned, and fails R4 when that entry matches nothing', () => {
    const files = { 'src/old/0001.sql': AR_WORD, 'src/old/0002.sql': AR_WORD, 'src/ok.ts': 'a' };
    expect(run(tree(files, { notScanned: [entry('src/old/000*.sql')] })).code).toBe(0);
    expect(run(tree(files, { notScanned: [entry('src/old')] })).code).toBe(0);
    const stale = run(tree(files, { notScanned: [entry('src/old'), entry('src/gone')] }));
    expect(stale.code).toBe(1);
    expect(stale.out).toContain('R4 notScanned entry src/gone matches no file');
  });

  it('refuses an entry without a path or a reason', () => {
    for (const bad of [{ path: 'src/a.ts' }, { path: 'src/a.ts', why: ' ' }, { why: 'x' }]) {
      const result = run(tree({ 'src/a.ts': 'a' }, { allow: [bad] }));
      expect(result.code).toBe(2);
      expect(result.out).toMatch(/english-only: .*"allow"/);
    }
    expect(run(tree({ 'src/a.ts': 'a' }, { roots: [] })).code).toBe(2);
  });
});

describe('R5 group C code is there', () => {
  const keep = (path, has) => ({ path, ...(has ? { has } : {}), why: 'Group C' });

  it('passes while the file exists and holds the text, also outside the roots and for a picture or a font', () => {
    const t = tree(
      {
        'src/pdf.ts': 'export function scriptDirection() {}',
        'package.json': '{"dependencies":{"bidi-js":"1"}}',
        'fonts/a.ttf': 'x',
      },
      {
        keep: [
          keep('src/pdf.ts', 'scriptDirection'),
          keep('package.json', '"bidi-js"'),
          keep('fonts/a.ttf'),
          keep('fonts/*.ttf'),
        ],
      },
    );
    expect(run(t).code).toBe(0);
  });

  it('fails when a kept file is missing or no longer contains what it protects', () => {
    const files = { 'src/pdf.ts': 'export function other() {}' };
    const missing = run(tree(files, { keep: [keep('src/gone.ts')] }));
    expect(missing.code).toBe(1);
    expect(missing.out).toContain('R5 src/gone.ts is missing');
    const stripped = run(tree(files, { keep: [keep('src/pdf.ts', 'scriptDirection')] }));
    expect(stripped.code).toBe(1);
    expect(stripped.out).toContain('R5 src/pdf.ts no longer contains "scriptDirection"');
  });
});

describe('--skip', () => {
  const files = { 'src/gen/a.ts': AR_WORD, 'src/fixtures/b.json': `{"x": "ar"}`, 'src/ok.ts': 'a' };

  it('leaves a path, a folder or a glob out of one run, and may be repeated', () => {
    const t = tree(files);
    expect(run(t).code).toBe(1);
    expect(run(t, '--skip', 'src/gen/a.ts').out).toContain('src/fixtures/b.json:1: R2');
    expect(run(t, '--skip', 'src/gen').out).toContain('src/fixtures/b.json:1: R2');
    expect(run(t, '--skip', 'src/gen', '--skip', 'src/fixtures/*.json')).toEqual({
      code: 0,
      out: 'english-only: ok (1 files read)\n',
    });
  });

  it('does not make an allow entry inside the skipped path stale', () => {
    const t = tree(files, { allow: [entry('src/gen/a.ts')] });
    expect(run(t, '--skip', 'src/gen').out).toContain('src/fixtures/b.json:1: R2');
    expect(run(t, '--skip', 'src/gen', '--skip', 'src/fixtures').code).toBe(0);
  });

  it('is never written into a package.json script, so there is no exclusion to remember to remove', () => {
    const { scripts } = JSON.parse(readFileSync(resolve(here, '..', 'package.json'), 'utf8'));
    expect(Object.keys(scripts).length).toBeGreaterThan(0);
    for (const [name, command] of Object.entries(scripts)) expect(command, name).not.toContain('--skip');
  });
});

describe('the command line', () => {
  it('stops with 2 on an argument it does not know or a config it cannot read', () => {
    const t = tree({ 'src/a.ts': 'a' });
    expect(
      spawnSync(process.execPath, [SCRIPT, '--root', t.dir, '--config', t.configPath, '--nope'], {
        encoding: 'utf8',
      }).status,
    ).toBe(2);
    expect(
      spawnSync(process.execPath, [SCRIPT, '--root', t.dir, '--config', join(t.dir, 'missing.json')], {
        encoding: 'utf8',
      }).status,
    ).toBe(2);
  });
});
