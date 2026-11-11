import { runDocTest } from './helpers';

const longText = (lines) =>
  Array.from(
    { length: lines },
    (_, i) => `Linha ${i + 1} das observações livres da ficha.`,
  ).join('\n');

describe('fcm', function () {
  test('drawRowLabelTexts divider between rows', function () {
    return runDocTest(function (doc) {
      doc.drawRowLabelTexts(
        [
          { label: 'Nome', text: 'Fulano de Tal', w: 250 },
          { label: 'Idade', text: '30', w: 100 },
          { label: 'Endereço', text: 'Rua de Teste, 123', w: 300 },
          { label: 'Cidade', text: 'Porto Alegre', w: 120 },
          { label: 'Observação', text: 'Terceira linha de itens', w: 400 },
        ],
        {
          y: 100,
          label: { font: 'Helvetica-Bold', size: 10 },
          text: { font: 'Helvetica', size: 10 },
          box: { radius: 4 },
          divider: true,
        },
      );
    });
  });

  test('drawRowLabelTexts item taller than the page', function () {
    return runDocTest(function (doc) {
      doc.text('Ficha da pesquisa');
      doc.drawRowLabelTexts(
        [
          { label: 'Pesquisa', text: 'Satisfação 2026', w: 400 },
          { label: 'Observações', text: longText(70), w: 400 },
          { label: 'Responsável', text: 'Fulano de Tal', w: 400 },
        ],
        {
          label: { font: 'Helvetica-Bold', size: 10 },
          text: { font: 'Helvetica', size: 10 },
          box: { radius: 4 },
          itemBox: { active: true, padding: 2 },
          divider: true,
        },
      );
      doc.text('Fim da ficha');
    });
  });
});
