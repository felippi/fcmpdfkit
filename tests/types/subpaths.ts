// Só os subpaths, sem importar o módulo principal nem usar typeRoots. Em node10,
// que ignora `exports`, quem resolve é o `typesVersions` do package.json.
import output = require('fcmpdfkit/output');
import Helvetica = require('fcmpdfkit/standard-fonts/Helvetica');

const toBytes: (document: FcmPDFKit.PDFDocument) => Promise<Uint8Array> =
  output.toBytes;
const name: 'Helvetica' = Helvetica.name;

export { toBytes, name };
