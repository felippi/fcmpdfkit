// Checa as declarações publicadas do fcmpdfkit como um consumidor as vê.
//
// Empacota o pacote com `npm pack`, extrai o tarball num diretório temporário
// e compila os consumidores de tests/types em --strict nos modos de resolução
// suportados, cada programa num tsc separado e em paralelo. Precisa do build
// em js/.
//
// typescript e @types/node ficam em cache em node_modules/.cache: só a primeira
// execução de cada combinação de versões acessa o registry do npm.
//
// Uso: node tests/types/run.mjs [--keep]
//   TS_VERSION         versão do typescript (padrão 5.9.3, a do volan_admin)
//   TYPES_NODE_VERSION versão do @types/node (padrão 22; TS 4.x pede uma
//                      versão da época, como 16 ou 18)
//
// Com um TS antigo, os modos que ele não conhece são pulados: node16 e
// nodenext existem desde a 4.7 e bundler desde a 5.0; antes da 5.0, node10 se
// chama `node`.
import { execFile, execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const TS_VERSION = process.env.TS_VERSION ?? '5.9.3';
const TYPES_NODE_VERSION = process.env.TYPES_NODE_VERSION ?? '22';
const keep = process.argv.includes('--keep');

const root = fileURLToPath(new URL('../..', import.meta.url));
const sources = fileURLToPath(new URL('.', import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8'),
);

// Cada modo compila os arquivos que fazem sentido nele: `import x = require()`
// não existe em `module: esnext`, e ESM em node16/nodenext precisa de .mts.
// Cada grupo de `programs` é um tsc separado: subpaths.ts fica sozinho para
// provar que os subpaths resolvem sem o módulo principal no programa.
const [tsMajor, tsMinor] = TS_VERSION.split('.').map(Number);
const tsAtLeast = (major, minor) =>
  tsMajor > major || (tsMajor === major && tsMinor >= minor);

const modes = [
  {
    name: 'node10',
    flags: [
      '--module',
      'commonjs',
      '--moduleResolution',
      tsAtLeast(5, 0) ? 'node10' : 'node',
    ],
    programs: [['cjs.ts', 'errors.ts'], ['subpaths.ts']],
  },
  {
    name: 'node16',
    minVersion: [4, 7],
    flags: ['--module', 'node16', '--moduleResolution', 'node16'],
    programs: [['cjs.ts', 'errors.ts', 'esm.mts'], ['subpaths.ts']],
  },
  {
    name: 'nodenext',
    minVersion: [4, 7],
    flags: ['--module', 'nodenext', '--moduleResolution', 'nodenext'],
    programs: [['cjs.ts', 'errors.ts', 'esm.mts'], ['subpaths.ts']],
  },
  {
    name: 'bundler',
    minVersion: [5, 0],
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

// npm é npm.cmd no Windows, que execFile não executa sem shell. Quando o script
// roda por `npm run`, npm_execpath aponta para o npm-cli.js e dispensa o shell.
const npmCli = process.env.npm_execpath;
const npm = (args, cwd) =>
  npmCli && /npm-cli\.c?js$/.test(basename(npmCli))
    ? execFileSync(process.execPath, [npmCli, ...args], {
        cwd,
        encoding: 'utf8',
      })
    : execFileSync('npm', args, {
        cwd,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      });

// Toda fonte padrão em `exports` precisa declarar seus tipos, e o
// standard-fonts.d.ts precisa declarar o módulo dela.
function checkTypesConditions() {
  const declared = readFileSync(
    join(root, 'types/fcmpdfkit/standard-fonts.d.ts'),
    'utf8',
  );
  const problems = [];

  for (const [entry, target] of Object.entries(packageJson.exports)) {
    if (
      entry === './output' &&
      target.types !== './types/fcmpdfkit/output.d.ts'
    ) {
      problems.push(`${entry} sem a condição types de output.d.ts`);
    }
    if (!entry.startsWith('./standard-fonts/')) continue;

    if (target.types !== './types/fcmpdfkit/standard-fonts.d.ts') {
      problems.push(`${entry} sem a condição types de standard-fonts.d.ts`);
    }
    const name = `fcmpdfkit/${entry.slice(2)}`;
    if (!declared.includes(`declare module '${name}'`)) {
      problems.push(`${name} não declarado em standard-fonts.d.ts`);
    }
  }

  return problems;
}

// Instala typescript e @types/node uma vez por combinação de versões.
function compilerDir() {
  const dir = join(
    root,
    'node_modules',
    '.cache',
    'fcmpdfkit-types',
    `ts-${TS_VERSION}-node-${TYPES_NODE_VERSION}`,
  );
  if (!existsSync(join(dir, 'node_modules', 'typescript', 'bin', 'tsc'))) {
    console.log(
      `Instalando typescript@${TS_VERSION} e @types/node@${TYPES_NODE_VERSION} em ${dir}`,
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{ "private": true }\n');
    npm(
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--silent',
        `typescript@${TS_VERSION}`,
        `@types/node@${TYPES_NODE_VERSION}`,
      ],
      dir,
    );
  }
  return dir;
}

const problems = checkTypesConditions();
if (problems.length) {
  console.log('❌ exports/types fora de sincronia:');
  for (const problem of problems) console.log(`   - ${problem}`);
  process.exit(1);
}
console.log('✅ exports: condição types em output e nas 14 fontes padrão');

const compilers = compilerDir();
const work = mkdtempSync(join(tmpdir(), 'fcmpdfkit-types-'));
let failed = false;

try {
  console.log(`Diretório temporário: ${work}`);

  // Extrai o tarball em vez de instalá-lo: os tipos não dependem das
  // dependências do pacote, e assim nada vai à rede.
  const tarball = npm(
    ['pack', '--ignore-scripts', '--silent', '--pack-destination', work],
    root,
  )
    .trim()
    .split('\n')
    .pop();
  console.log(`Pacote: ${tarball}`);
  execFileSync('tar', ['-xzf', tarball], { cwd: work });
  mkdirSync(join(work, 'node_modules'));
  renameSync(join(work, 'package'), join(work, 'node_modules', 'fcmpdfkit'));

  const src = join(work, 'src');
  mkdirSync(src);
  for (const file of readdirSync(sources).filter((f) => f.endsWith('.ts'))) {
    copyFileSync(join(sources, file), join(src, file));
  }
  copyFileSync(join(sources, 'esm.ts'), join(src, 'esm.mts'));

  const tsc = join(compilers, 'node_modules', 'typescript', 'bin', 'tsc');
  const common = [
    '--strict',
    '--noEmit',
    '--target',
    tsAtLeast(4, 6) ? 'es2022' : 'es2020',
    '--typeRoots',
    join(compilers, 'node_modules', '@types'),
    '--types',
    'node',
  ];

  const supported = modes.filter(
    ({ name, minVersion }) =>
      !minVersion ||
      tsAtLeast(...minVersion) ||
      console.log(`⏭️  ${name}: não existe no TypeScript ${TS_VERSION}`),
  );

  const jobs = supported.flatMap((mode) =>
    mode.programs.map(async (files) => {
      const label = `${mode.name}: ${files.join(', ')}`;
      try {
        await promisify(execFile)(
          process.execPath,
          [tsc, ...common, ...mode.flags, ...files],
          { cwd: src },
        );
        return { label, ok: true };
      } catch (error) {
        return { label, ok: false, output: error.stdout || error.message };
      }
    }),
  );

  for (const { label, ok, output } of await Promise.all(jobs)) {
    console.log(`${ok ? '✅' : '❌'} ${label}`);
    if (!ok) {
      failed = true;
      console.log(output);
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
