// Checa as declarações publicadas do fcmpdfkit como um consumidor as vê.
//
// Empacota o pacote com `npm pack`, instala o tarball num diretório temporário
// junto com typescript e @types/node e compila os consumidores de tests/types
// em --strict nos modos de resolução suportados. Precisa do build em js/ e de
// acesso ao registry do npm.
//
// Uso: node tests/types/run.mjs [--keep]
//   TS_VERSION        versão do typescript (padrão 5.9.3, a do volan_admin)
//   TYPES_NODE_VERSION versão do @types/node (padrão 22)
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TS_VERSION = process.env.TS_VERSION ?? '5.9.3';
const TYPES_NODE_VERSION = process.env.TYPES_NODE_VERSION ?? '22';
const keep = process.argv.includes('--keep');

const root = fileURLToPath(new URL('../..', import.meta.url));
const sources = fileURLToPath(new URL('.', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'fcmpdfkit-types-'));

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

// Cada modo compila os arquivos que fazem sentido nele: `import x = require()`
// não existe em `module: esnext`, e ESM em node16/nodenext precisa de .mts.
// Cada grupo de `programs` é um tsc separado: subpaths.ts fica sozinho para
// provar que os subpaths resolvem sem o módulo principal no programa.
const modes = [
  {
    name: 'node10',
    flags: ['--module', 'commonjs', '--moduleResolution', 'node10'],
    programs: [['cjs.ts', 'errors.ts'], ['subpaths.ts']],
  },
  {
    name: 'node16',
    flags: ['--module', 'node16', '--moduleResolution', 'node16'],
    programs: [['cjs.ts', 'errors.ts', 'esm.mts'], ['subpaths.ts']],
  },
  {
    name: 'nodenext',
    flags: ['--module', 'nodenext', '--moduleResolution', 'nodenext'],
    programs: [['cjs.ts', 'errors.ts', 'esm.mts'], ['subpaths.ts']],
  },
  {
    name: 'bundler',
    flags: [
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--esModuleInterop',
    ],
    programs: [['esm.ts']],
  },
];

let failed = false;

try {
  console.log(`Diretório temporário: ${work}`);

  const tarball = run(
    'npm',
    ['pack', '--ignore-scripts', '--silent', '--pack-destination', work],
    root,
  )
    .trim()
    .split('\n')
    .pop();
  console.log(`Pacote: ${tarball}`);

  writeFileSync(
    join(work, 'package.json'),
    JSON.stringify({ private: true }, null, 2),
  );
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--silent',
      join(work, tarball),
      `typescript@${TS_VERSION}`,
      `@types/node@${TYPES_NODE_VERSION}`,
    ],
    work,
  );

  const src = join(work, 'src');
  mkdirSync(src);
  for (const file of readdirSync(sources).filter((f) => f.endsWith('.ts'))) {
    copyFileSync(join(sources, file), join(src, file));
  }
  copyFileSync(join(sources, 'esm.ts'), join(src, 'esm.mts'));

  const tsc = join(work, 'node_modules', 'typescript', 'bin', 'tsc');
  const common = [
    '--strict',
    '--noEmit',
    '--target',
    'es2022',
    '--types',
    'node',
  ];

  for (const mode of modes) {
    for (const files of mode.programs) {
      const label = `${mode.name}: ${files.join(', ')}`;
      try {
        run(process.execPath, [tsc, ...common, ...mode.flags, ...files], src);
        console.log(`✅ ${label}`);
      } catch (error) {
        failed = true;
        console.log(`❌ ${label}`);
        console.log(error.stdout || error.stderr || error.message);
      }
    }
  }
} finally {
  if (keep) {
    console.log(`Mantido em ${work}`);
  } else {
    rmSync(work, { recursive: true, force: true });
  }
}

if (failed) {
  process.exit(1);
}
