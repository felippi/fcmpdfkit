#!/usr/bin/env node

/**
 * Script para atualizar automaticamente os tipos TypeScript a partir do JSDoc
 * Analisa o arquivo fcm.js e gera as definições de tipos correspondentes
 */

const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos
const FCM_JS_PATH = path.join(__dirname, '../lib/mixins/fcm.js');
const TYPES_PATH = path.join(__dirname, '../types/fcmpdfkit/index.d.ts');

console.log('🔄 Iniciando atualização automática de tipos...');

/**
 * Extrai informações de métodos do JSDoc
 */
function extractMethodsFromJSDoc(content) {
  const methods = [];
  
  // Regex para capturar blocos JSDoc + métodos
  const jsDocMethodRegex = /\/\*\*([\s\S]*?)\*\/\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/g;
  
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
 * Gera definições TypeScript para os métodos
 */
function generateTypeDefinitions(methods) {
  let definitions = '';
  
  methods.forEach(method => {
    // Pula métodos internos/privados
    if (method.name.startsWith('on') || method.name === 'initFcm') {
      return;
    }
    
    // Adiciona comentário com descrição
    if (method.description) {
      definitions += `        /** ${method.description} */\n`;
    }
    
    // Detecta se é um getter (propriedade readonly)
    const isGetter = method.name.startsWith('useful') && method.params.length === 0;
    
    if (isGetter) {
      // Define como propriedade readonly
      definitions += `        readonly ${method.name}: ${method.returnType.replace('this', 'number')};\n`;
    } else {
      // Gera lista de parâmetros com sintaxe correta para opcionais
      const paramList = method.params.map(param => {
        const optional = param.optional ? '?' : '';
        return `${param.name}${optional}: ${param.type}`;
      }).join(', ');
      
      // Adiciona definição do método
      definitions += `        ${method.name}(${paramList}): ${method.returnType};\n`;
    }
  });
  
  return definitions;
}

/**
 * Atualiza o arquivo index.d.ts
 */
function updateTypesFile(newDefinitions) {
  let content = fs.readFileSync(TYPES_PATH, 'utf8');
  
  // Define interfaces para objetos complexos
  const interfaceDefinitions = `
    interface FCMStartRectOptions {
        x?: number;
        y?: number;
        w?: number;
        r?: number;
        lineWidth?: number;
        padding?: number;
    }

    interface FCMDrawRowLabelTextsOptions {
        label?: {
            font?: string;
            size?: number;
            h?: number;
        };
        text?: {
            font?: string;
            size?: number;
            h?: number;
        };
        defaultItemW?: number;
        padding?: number;
        debug?: boolean;
        x?: number;
        y?: number;
        w?: number;
        noLabel?: boolean;
        divider?: boolean;
        box?: {
            radius?: number;
        };
        itemBox?: {
            radius?: number;
            padding?: number;
            active?: boolean;
        };
    }

`;

  // Substitui tipos complexos por interfaces
  newDefinitions = newDefinitions
    .replace(/startRect\([^)]+\): this;/, 'startRect(options?: FCMStartRectOptions): this;')
    .replace(/drawRowLabelTexts\([^)]+\): this;/, 'drawRowLabelTexts(items: any[], options?: FCMDrawRowLabelTextsOptions): this;');
  
  // Encontra a interface PDFFcm e atualiza
  const interfaceRegex = /(interface PDFFcm \{)([\s\S]*?)(\n    \})/;
  
  if (interfaceRegex.test(content)) {
    // Adiciona as interfaces antes da interface PDFFcm
    content = content.replace(/(interface PDFFcm)/, `${interfaceDefinitions}    $1`);
    
    // Atualiza o conteúdo da interface PDFFcm
    content = content.replace(interfaceRegex, (match, start, oldContent, end) => {
      return `${start}\n${newDefinitions}${end}`;
    });
    
    fs.writeFileSync(TYPES_PATH, content, 'utf8');
    console.log('✅ Arquivo index.d.ts atualizado com sucesso!');
  } else {
    console.error('❌ Interface PDFFcm não encontrada no arquivo index.d.ts');
  }
}

/**
 * Função principal
 */
function main() {
  try {
    // Lê o arquivo fcm.js
    const fcmContent = fs.readFileSync(FCM_JS_PATH, 'utf8');
    
    // Extrai métodos do JSDoc
    const methods = extractMethodsFromJSDoc(fcmContent);
    
    console.log(`📝 Encontrados ${methods.length} métodos com JSDoc:`);
    methods.forEach(method => {
      console.log(`   - ${method.name}(${method.params.length} parâmetros)`);
    });
    
    // Gera definições TypeScript
    const typeDefinitions = generateTypeDefinitions(methods);
    
    // Atualiza arquivo de tipos
    updateTypesFile(typeDefinitions);
    
    console.log('🎉 Tipos atualizados com sucesso!');
    
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
