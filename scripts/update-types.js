#!/usr/bin/env node

/**
 * Script para atualizar automaticamente os tipos TypeScript a partir do JSDoc
 * Analisa o arquivo fcm.js e gera as definições de tipos correspondentes
 */

const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

// Caminhos dos arquivos
const FCM_JS_PATH = path.join(__dirname, '../lib/mixins/fcm.js');
const TYPES_PATH = path.join(__dirname, '../types/fcmpdfkit/index.d.ts');

// Delimitam, dentro de `interface PDFFcm`, o único trecho que este script reescreve
const START_MARKER = '// <fcm-mixin:generated>';
const END_MARKER = '// </fcm-mixin:generated>';
// Indentação dos membros de PDFFcm (namespace + interface)
const INDENT = '    ';

// Parâmetros de opções tipados por interfaces escritas à mão no index.d.ts
const OPTION_INTERFACES = {
  startRect: { options: 'FCMStartRectOptions' },
  drawRowLabelTexts: { itens: 'any[]', options: 'FCMDrawRowLabelTextsOptions' },
};

console.log('🔄 Iniciando atualização automática de tipos...');

/**
 * Extrai informações de métodos do JSDoc
 */
function extractMethodsFromJSDoc(content) {
  const methods = [];
  
  // Regex para capturar blocos JSDoc + métodos. O bloco não pode atravessar um
  // `*/` (senão um JSDoc sem método logo abaixo engole o do método seguinte) e
  // comentários de linha entre o JSDoc e o método são tolerados
  // (ex.: `// eslint-disable-next-line`).
  const jsDocMethodRegex =
    /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*(?:\/\/[^\n]*\n\s*)*([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/g;
  
  let match;
  while ((match = jsDocMethodRegex.exec(content)) !== null) {
    const jsDocBlock = match[1];
    const methodName = match[2];
    
    // Extrai parâmetros do JSDoc
    const paramRegex = /@param\s+\{([^}]+)\}\s+(?:\[([^\]]+)\]|(\w+))\s*-?\s*(.*)/g;
    const params = [];
    let paramMatch;
    
    while ((paramMatch = paramRegex.exec(jsDocBlock)) !== null) {
      const type = paramMatch[1];
      const fullParamName = paramMatch[2] || paramMatch[3];
      const description = paramMatch[4];
      const isOptional = !!paramMatch[2]; // Se usa [param], é opcional
      
      // Remove valor padrão do nome do parâmetro (ex: "r=0" -> "r")
      const paramName = fullParamName.split('=')[0];
      
      params.push({
        name: paramName,
        type: convertJSDocTypeToTS(type),
        optional: isOptional,
        description
      });
    }
    
    // Extrai tipo de retorno
    const returnRegex = /@returns?\s+\{([^}]+)\}/;
    const returnMatch = returnRegex.exec(jsDocBlock);
    const returnType = returnMatch ? convertJSDocTypeToTS(returnMatch[1]) : 'this';
    
    // Extrai descrição
    const descriptionMatch = jsDocBlock.match(/^\s*\*\s*(.+?)(?:\n|@)/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    methods.push({
      name: methodName,
      params,
      returnType,
      description
    });
  }
  
  return methods;
}

/**
 * Converte tipos JSDoc para TypeScript
 */
function convertJSDocTypeToTS(jsDocType) {
  const typeMap = {
    'Array': 'any[]',
    'Object': 'object',
    'number': 'number',
    'string': 'string',
    'boolean': 'boolean',
    'PDFDocument': 'this',
    'void': 'void'
  };
  
  // Remove espaços e processa tipos complexos
  let tsType = jsDocType.trim();
  
  // Converte Array<Type> para Type[]
  tsType = tsType.replace(/Array<([^>]+)>/g, '$1[]');
  
  // Converte tipos básicos
  Object.keys(typeMap).forEach(jsType => {
    tsType = tsType.replace(new RegExp(`\\b${jsType}\\b`, 'g'), typeMap[jsType]);
  });
  
  return tsType;
}

/**
 * Gera as definições TypeScript dos métodos públicos do mixin
 */
function generateTypeDefinitions(methods) {
  let definitions = '';

  methods.forEach((method) => {
    // Pula métodos internos (handlers de evento, inicialização e helpers `_`)
    if (
      method.name.startsWith('on') ||
      method.name.startsWith('_') ||
      method.name === 'initFcm'
    ) {
      return;
    }

    if (method.description) {
      definitions += `${INDENT}/** ${method.description} */\n`;
    }

    // Parâmetros aninhados do JSDoc (options.x) não viram parâmetros: as
    // opções são tipadas pelas interfaces de OPTION_INTERFACES.
    const paramList = method.params
      .filter((param) => !param.name.includes('.'))
      .map((param) => {
        const type = OPTION_INTERFACES[method.name]?.[param.name] ?? param.type;
        return `${param.name}${param.optional ? '?' : ''}: ${type}`;
      })
      .join(', ');

    definitions += `${INDENT}${method.name}(${paramList}): ${method.returnType};\n`;
  });

  return definitions;
}

/**
 * Substitui, no index.d.ts, o trecho entre os marcadores dentro de PDFFcm.
 * O resto do arquivo (inclusive as interfaces de opções do mixin) é escrito à
 * mão e nunca é tocado. O resultado passa pelo Prettier do projeto, que também
 * checa types/ (`npm run prettier`).
 */
async function updateTypesFile(newDefinitions) {
  const content = fs.readFileSync(TYPES_PATH, 'utf8');
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Marcadores "${START_MARKER}" e "${END_MARKER}" não encontrados em ${TYPES_PATH}`,
    );
  }

  const before = content.slice(0, start + START_MARKER.length);
  const after = content.slice(content.lastIndexOf('\n', end) + 1);
  const prettierOptions = await prettier.resolveConfig(TYPES_PATH);
  const updated = await prettier.format(`${before}\n${newDefinitions}${after}`, {
    ...prettierOptions,
    filepath: TYPES_PATH,
  });

  if (updated === content) {
    console.log('✅ index.d.ts já estava atualizado');
    return;
  }

  fs.writeFileSync(TYPES_PATH, updated, 'utf8');
  console.log('✅ index.d.ts atualizado');
}

/**
 * Função principal
 */
async function main() {
  try {
    const fcmContent = fs.readFileSync(FCM_JS_PATH, 'utf8');
    const methods = extractMethodsFromJSDoc(fcmContent);

    console.log(`📝 Encontrados ${methods.length} métodos com JSDoc:`);
    methods.forEach((method) => {
      console.log(`   - ${method.name}(${method.params.length} parâmetros)`);
    });

    await updateTypesFile(generateTypeDefinitions(methods));
  } catch (error) {
    console.error('❌ Erro durante a atualização:', error.message);
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { extractMethodsFromJSDoc, generateTypeDefinitions, updateTypesFile };
