// Casos que DEVEM falhar. Cada `@ts-expect-error` sem erro de fato vira erro de
// compilação (TS2578), então este arquivo também prova que os tipos estão sendo
// resolvidos e checados, não caindo em `any`. Não é executado.
import PDFDocument = require('fcmpdfkit');

const doc = new PDFDocument();

// Chave minúscula: desde a 0.20 não é mais convertida para `Contents`
// @ts-expect-error
doc.note(10, 10, 20, 20, 'nota', { contents: 'x' });

// Opção de formulário fora dos mapeamentos documentados é ignorada pela 0.20
// @ts-expect-error
doc.formText('a', 10, 10, 100, 20, { maxLength: 10 });

// Chave que não começa com letra maiúscula também é rejeitada
// @ts-expect-error
doc.annotate(10, 10, 20, 20, { _x: 1 });

// AA só é lido junto com format
// @ts-expect-error
doc.formText('a', 10, 10, 100, 20, { AA: { Bl: {} } });

// De MK só CA é copiado; BG é descartado (use backgroundColor)
// @ts-expect-error
doc.formPushButton('b', 10, 10, 100, 20, { MK: { BG: [1, 1, 0] } });

// link de imagem é URL ou índice de página, não opções de anotação
// @ts-expect-error
doc.image('/a.png', { link: { Contents: 'x' } });

// O LineWrapper usa o emitter mínimo do PDFKit, não o EventEmitter do Node
// @ts-expect-error
new PDFDocument.LineWrapper(doc, {}).removeAllListeners('line');

// Formato de campo inválido
// @ts-expect-error
doc.formText('a', 10, 10, 100, 20, { format: { type: 'time', param: 5 } });

// pageLayout fora dos valores aceitos (só a primeira letra pode mudar de caixa)
// @ts-expect-error
new PDFDocument({ pageLayout: 'twocolumnleft' });

// usefulW é método, não propriedade
// @ts-expect-error
const width: string = doc.usefulW();

// PAGE_SIZES não é exportado por nenhum build
// @ts-expect-error
PDFDocument.PAGE_SIZES;

// registerStdFonts pode não existir (builds de Node)
// @ts-expect-error
PDFDocument.registerStdFonts(undefined);

// registerFile só aceita Uint8Array ou undefined
// @ts-expect-error
PDFDocument.registerFile('/a', 'conteúdo');

// Os caminhos js/* não são exportados pelo pacote
// @ts-expect-error
import data = require('fcmpdfkit/js/data');

export { width, data };
