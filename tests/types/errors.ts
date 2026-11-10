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

// Formato de campo inválido
// @ts-expect-error
doc.formText('a', 10, 10, 100, 20, { format: { type: 'time', param: 5 } });

// pageLayout fora dos valores aceitos
// @ts-expect-error
new PDFDocument({ pageLayout: 'TwoColumnLeft' });

// usefulW é método, não propriedade
// @ts-expect-error
const width: string = doc.usefulW();

// PAGE_SIZES não é exportado por nenhum build
// @ts-expect-error
PDFDocument.PAGE_SIZES;

// registerStdFonts pode não existir (Node, standalone)
// @ts-expect-error
PDFDocument.registerStdFonts(undefined);

// registerFile só aceita Uint8Array ou undefined
// @ts-expect-error
PDFDocument.registerFile('/a', 'conteúdo');

// Os caminhos js/* não são exportados pelo pacote
// @ts-expect-error
import data = require('fcmpdfkit/js/data');

export { width, data };
