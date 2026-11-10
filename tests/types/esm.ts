// Consumidor ES modules: default + named exports e os subpaths. Compilado como
// .mts em node16/nodenext e como .ts em bundler. Não é executado.
import PDFDocument, {
  LineWrapper,
  registerFile,
  registerStdFonts,
} from 'fcmpdfkit';
import { toBlob, toBytes } from 'fcmpdfkit/output';
import Courier from 'fcmpdfkit/standard-fonts/Courier';
import TimesRoman from 'fcmpdfkit/standard-fonts/TimesRoman';

// Opcional: só o build ES de browser exporta registerStdFonts
if (registerStdFonts) {
  registerStdFonts(Courier, TimesRoman);
}

registerFile('/font.ttf', new Uint8Array(4));

const doc = new PDFDocument({ pageLayout: 'singlePage' });
new LineWrapper(doc, {}).wrap('texto', {});
doc.font('/font.ttf').text('olá').roundedRect(0, 0, 10, 10, [1, 2, 3, 4]);

const bytes: Promise<Uint8Array> = toBytes(doc);
const blob: Promise<Blob> = toBlob(doc);
const width: number = doc.usefulW();
doc.end();

export { bytes, blob, width };
