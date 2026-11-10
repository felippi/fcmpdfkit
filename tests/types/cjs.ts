// Consumidor CommonJS: o mesmo padrão do volan_admin/functions. Cobre a API
// tipada da 0.18 à 0.20.2 e o mixin FCM. Só precisa compilar; não é executado.
import PDFDocument = require('fcmpdfkit');
import output = require('fcmpdfkit/output');
import Helvetica = require('fcmpdfkit/standard-fonts/Helvetica');

// `class ... extends PDFDocument`, como o FcmPdf do functions
class Report extends PDFDocument {
  header(): this {
    return this.text('header');
  }
}

const doc = new Report({
  size: 'A4',
  pageLayout: 'twoColumnLeft',
  userUnit: 2,
  bufferPages: true,
});
doc.header();
doc.addPage({ size: 'A4', userUnit: 4 });
const userUnit: number = doc.page.userUnit;

// Named exports como propriedades, como no build CJS
const { registerFile, LineWrapper } = PDFDocument;
registerFile('/logo.png', new Uint8Array([0x89, 0x50]), {
  birthtime: new Date(),
  ctime: new Date(),
});
registerFile('/logo.png', undefined);
const SameDocument: typeof PDFDocument = PDFDocument.PDFDocument;
new SameDocument();

const wrapper = new LineWrapper(doc, { width: 200 });
wrapper.on('line', (line: string) => line.length);
wrapper.on('sectionEnd', (options) => options.width);
const onLine = (line: string) => line.length;
wrapper.once('line', onLine);
wrapper.off('line', onLine);
const hadListeners: boolean = wrapper.emit('firstLine', {}, wrapper);
wrapper.wrap('texto', { width: 200 });
new PDFDocument({ pageLayout: 'TwoPageRight' });

// registerStdFonts só existe nos builds de browser
PDFDocument.registerStdFonts?.(Helvetica);
const fontName: FcmPDFKit.StandardFontName = Helvetica.name;

// Saída
const bytes: Promise<Uint8Array> = output.toBytes(doc);
const blob: Promise<Blob> = output.toBlob(doc);

// Desenho, imagens e fontes
doc.roundedRect(10, 10, 100, 50, 8);
doc.roundedRect(10, 10, 100, 50, [0, 20, 20, 0]);
doc.roundedRect(10, 10, 100, 50);
const fontkitFont = { layout: () => ({}) };
doc.font(fontkitFont);
doc.registerFont('parsed', fontkitFont);
doc.font(new Uint8Array(4), 12);
doc.image(new Uint8Array(8), 0, 0, { width: 50, opacity: 0.5 });
doc.image(new ArrayBuffer(8), { x: 10, y: 20, fit: [50, 50] });
doc.image('data:image/png;base64,iVBORw0KGgo=', { ignoreOrientation: true });
doc.image(Buffer.from([1, 2, 3]));
doc.image(new Uint8Array(8), { link: 'https://example.com' });
doc.image(new Uint8Array(8), { link: 0, goTo: 'capitulo-1' });
doc.text('ir para a página 1', { link: 0 });
const filespec: FcmPDFKit.PDFKitReference = doc.file(
  'data:text/plain;base64,YQ==',
  {
    name: 'a.txt',
    relationship: 'Data',
  },
);
doc.file(new Uint8Array(1), { hidden: true });

// Outline
const chapter = doc.outline.addItem('Capítulo 1', { expanded: true });
chapter.addItem('Seção', {
  pageNumber: 0,
  fit: false,
  top: 100,
  left: 0,
  zoom: 1.5,
});
doc.outline.addItem('Fim', { pageNumber: null });

// Estrutura e acessibilidade
const figure = doc.struct('Figure', {
  alt: 'logo',
  bbox: [100, 200, 500, 600],
  placement: 'Block',
});
doc.struct('TH', { scope: 'Column' });
doc.addStructure(figure);
doc.link(10, 10, 100, 20, 'https://example.com', { structParent: figure });
doc.link(10, 40, 100, 20, 0);

// Anotações: chaves PDF literais
doc.note(10, 10, 20, 20, 'nota', { Name: 'Help', color: [255, 0, 0] });
doc.annotate(10, 10, 20, 20, {
  Subtype: 'Square',
  Contents: 'x',
  T: 'autor',
  CA: 0.5,
});
doc.highlight(10, 10, 100, 12, { color: 'yellow' });
doc.fileAnnotation(10, 10, 20, 20, {
  src: new Uint8Array(1),
  name: 'a.bin',
  description: 'anexo',
});

// AcroForm: só opções documentadas
doc.initForm();
const parent = doc.formField('shipping', { required: true });
doc.formText('street', 10, 10, 200, 20, {
  parent,
  multiline: true,
  align: 'right',
  fontSize: 10,
});
doc.formText('price', 10, 40, 200, 20, {
  format: {
    type: 'number',
    nDec: 2,
    sepComma: true,
    negStyle: 'ParensRed',
    currency: 'R$',
    currencyPrepend: true,
  },
});
doc.formText('date', 10, 70, 200, 20, {
  format: { type: 'date', param: 'dd/mm/yyyy' },
});
doc.formText('time', 10, 100, 200, 20, { format: { type: 'time', param: 2 } });
doc.formCombo('site', 10, 130, 200, 20, {
  select: ['', 'github'],
  value: '',
  defaultValue: '',
  edit: true,
});
doc.formPushButton('btn', 10, 160, 100, 30, {
  backgroundColor: 'yellow',
  borderColor: [0, 0, 0],
  label: 'OK',
});
doc.formCheckbox('ok', 10, 200, 10, 10, { Ff: 0, MK: { CA: '8' } });
doc.formText('pct', 10, 230, 100, 20, {
  format: { type: 'percent', nDec: 1 },
  AA: { Bl: {} },
});
doc.formAnnotation('raw', 'radioButton', 10, 220, 10, 10, {
  toggleToOffButton: true,
});

// Mixin FCM
const usefulW: number = doc.usefulW();
const usefulH: number = doc.usefulH();
doc.noPageBreak = true;
doc
  .startRect({ x: 0, y: 0, r: 4 })
  .drawRowLabelTexts([{ label: 'a', text: 'b' }], {
    label: { h: 10 },
    divider: true,
  })
  .stopRect()
  .tryAddPage(50)
  .incXY(1, 1);

doc.end();

export {
  hadListeners,
  bytes,
  blob,
  filespec,
  fontName,
  userUnit,
  usefulW,
  usefulH,
};
