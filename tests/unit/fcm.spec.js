import { vi } from 'vitest';
import { fileURLToPath } from 'url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import PDFDocument from '../../lib/document';
import { toBytes } from '../../lib/output';

const newDocument = (options = {}) =>
  new PDFDocument({ compress: false, bufferPages: true, ...options });

/** Content stream of a page that has not been flushed yet. */
const pageContent = (page) =>
  Buffer.concat(
    page.content.buffer.map((chunk) => Buffer.from(chunk)),
  ).toString('binary');

/**
 * Line width, fill color and save depth in effect at the end of a content
 * stream, following `q`/`Q`. Starts from the PDF defaults.
 */
const graphicsState = (content) => {
  let state = { lineWidth: 1, fill: '0', depth: 0 };
  const stack = [];
  let operands = [];
  for (const token of content.split(/\s+/)) {
    if (/^-?[\d.]+$/.test(token)) {
      operands.push(token);
      continue;
    }
    if (token === 'q') {
      stack.push(state);
      state = { ...state, depth: state.depth + 1 };
    } else if (token === 'Q') {
      if (!stack.length) {
        throw new Error('Unbalanced Q');
      }
      state = stack.pop();
    } else if (token === 'w') {
      state = { ...state, lineWidth: Number(operands.at(-1)) };
    } else if (token === 'scn') {
      state = { ...state, fill: operands.join(' ') };
    }
    operands = [];
  }
  return state;
};

const currentState = (doc) => graphicsState(pageContent(doc.page));

/** Horizontal segments stroked with the given line width. */
const strokedSegments = (content, lineWidth) => {
  const re = new RegExp(
    `${lineWidth} w\\n(-?[\\d.]+) (-?[\\d.]+) m\\n(-?[\\d.]+) (-?[\\d.]+) l\\nS`,
    'g',
  );
  return [...content.matchAll(re)].map((m) => ({
    x1: Number(m[1]),
    y1: Number(m[2]),
    x2: Number(m[3]),
    y2: Number(m[4]),
  }));
};

/** Text items of each page, with the baseline in document coordinates. */
const extractText = async (doc) => {
  const output = toBytes(doc);
  doc.end();
  const pdf = await getDocument({
    data: await output,
    useSystemFonts: false,
    // pdf.js requires a trailing forward slash, also on Windows
    standardFontDataUrl: fileURLToPath(
      new URL('../../node_modules/pdfjs-dist/standard_fonts/', import.meta.url),
    ).replace(/\\/g, '/'),
  }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const [, , , pageHeight] = page.view;
    const { items } = await page.getTextContent();
    pages.push(
      items
        .filter((item) => item.str.trim())
        .map((item) => ({
          str: item.str,
          font: item.fontName,
          baseline: pageHeight - item.transform[5],
        })),
    );
  }
  return pages;
};

/** Largest y reached by the paths (m, l, c, re) of a content stream. */
const pathMaxY = (content) => {
  let max = -Infinity;
  let operands = [];
  for (const token of content.split(/\s+/)) {
    if (/^-?[\d.]+$/.test(token)) {
      operands.push(Number(token));
      continue;
    }
    if (token === 'm' || token === 'l') {
      max = Math.max(max, operands[1]);
    } else if (token === 'c') {
      max = Math.max(max, operands[1], operands[3], operands[5]);
    } else if (token === 're') {
      max = Math.max(max, operands[1], operands[1] + operands[3]);
    }
    operands = [];
  }
  return max;
};

/**
 * Vertical extent of each border stroked by the extensions (a `q`, line
 * width, path, `S`, `Q` block), keyed by line width.
 */
const borderExtents = (content) => {
  const extents = {};
  for (const [, lineWidth, path] of content.matchAll(
    /q\n([\d.]+) w\n([\s\S]*?)\nS\nQ/g,
  )) {
    const ys = [];
    let operands = [];
    for (const token of path.split(/\s+/)) {
      if (/^-?[\d.]+$/.test(token)) {
        operands.push(Number(token));
        continue;
      }
      if (token === 'm' || token === 'l') ys.push(operands[1]);
      if (token === 'c') ys.push(operands[1], operands[3], operands[5]);
      operands = [];
    }
    const extent = (extents[lineWidth] ??= {
      top: Infinity,
      bottom: -Infinity,
    });
    extent.top = Math.min(extent.top, ...ys);
    extent.bottom = Math.max(extent.bottom, ...ys);
  }
  return extents;
};

const longText = (lines) =>
  Array.from(
    { length: lines },
    (_, i) => `Linha ${i + 1} das observações.`,
  ).join('\n');

describe('FCM extensions', () => {
  describe('console', () => {
    let spies;

    beforeEach(() => {
      spies = ['log', 'info', 'warn', 'error', 'debug'].map((method) =>
        vi.spyOn(console, method).mockImplementation(() => {}),
      );
    });

    afterEach(() => {
      spies.forEach((spy) => spy.mockRestore());
    });

    test('stopRect() without startRect() throws', () => {
      const doc = newDocument();
      expect(() => doc.stopRect()).toThrow(
        'stopRect() called without a matching startRect()',
      );
    });

    test('stopRect() throws once every startRect() is closed', () => {
      const doc = newDocument();
      doc.startRect().text('one').stopRect();
      expect(() => doc.stopRect()).toThrow();
    });

    test('the extensions never write to the console', () => {
      const doc = newDocument();
      // padding is no longer an option: it is ignored like any unknown key
      doc.startRect({ padding: 5 }).text(longText(80)).stopRect();
      doc.drawRuler(0, 0);
      doc.drawRowLabelTexts(
        [{ label: 'Observações', text: longText(120) }, 'curto'],
        { box: {}, itemBox: { active: true }, divider: true, debug: true },
      );
      spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    });
  });

  describe('graphics state of the caller', () => {
    let doc;

    beforeEach(() => {
      doc = newDocument();
      doc.lineWidth(2).fillColor('red');
    });

    const expectUnchanged = (before) => {
      expect(currentState(doc)).toEqual(before);
      expect(doc._fillColor).toEqual(['red', undefined]);
    };

    test('roundedRectUp, roundedRectMid and roundedRectDown', () => {
      const before = currentState(doc);
      doc.roundedRectUp(50, 50, 100, 50, 5).stroke();
      doc.roundedRectMid(50, 100, 100, 50).stroke();
      doc.roundedRectDown(50, 150, 100, 50, 5).stroke();
      expectUnchanged(before);
    });

    test('startRect and stopRect on one page', () => {
      const before = currentState(doc);
      doc.startRect({ lineWidth: 1.5, r: 4 }).text('dentro').stopRect();
      expectUnchanged(before);
    });

    test('startRect and stopRect across pages', () => {
      doc.startRect({ lineWidth: 1.5 }).text(longText(80));
      expect(doc.bufferedPageRange().count).toBe(2);
      for (const page of doc._pageBuffer.slice(0, -1)) {
        expect(graphicsState(pageContent(page)).depth).toBe(0);
      }
      doc.lineWidth(3);
      const before = currentState(doc);
      doc.stopRect();
      expectUnchanged(before);
    });

    test('drawRowLabelTexts with every border', () => {
      doc.font('Courier').fontSize(9);
      const before = currentState(doc);
      doc.drawRowLabelTexts(
        [
          { label: 'Nome', text: 'Fulano', w: 200, color: 'blue' },
          { label: 'Idade', text: '30', w: 100 },
          { label: 'Endereço', text: 'Rua de teste, 1', w: 400 },
        ],
        {
          label: { font: 'Helvetica-Bold', size: 12 },
          text: { font: 'Helvetica', size: 10 },
          box: { radius: 5 },
          itemBox: { active: true, padding: 2 },
          divider: true,
          debug: true,
        },
      );
      expectUnchanged(before);
      expect(doc._font.name).toBe('Courier');
      expect(doc._fontSize).toBe(9);
    });

    test('drawRowLabelTexts without a fill color set restores the default', () => {
      const plain = newDocument();
      plain.drawRowLabelTexts([{ label: 'L', text: 'T', color: 'blue' }]);
      expect(plain._fillColor).toBeUndefined();
      expect(graphicsState(pageContent(plain.page)).fill).toBe('0 0 0');
    });

    test('drawRowLabelTexts restores the state when it throws', () => {
      doc.noPageBreak = false;
      expect(() =>
        doc.drawRowLabelTexts([{ label: 'L', text: 'T' }], {
          label: { font: '/missing-font.ttf' },
        }),
      ).toThrow();
      expect(doc.noPageBreak).toBe(false);
      expect(doc._fillColor).toEqual(['red', undefined]);
    });
  });

  describe('drawRowLabelTexts divider', () => {
    test('draws one divider between two rows and none at the top', async () => {
      const doc = newDocument();
      const y = 100;
      doc.drawRowLabelTexts(
        [
          { label: 'Primeira', text: 'linha de cima', w: 500 },
          { label: 'Segunda', text: 'linha de baixo', w: 500 },
        ],
        { y, divider: true },
      );

      const dividers = strokedSegments(pageContent(doc.page), 0.4);
      expect(dividers).toHaveLength(1);
      const [divider] = dividers;
      expect(divider.y1).toBe(divider.y2);
      expect(divider.y1).toBeGreaterThan(y);

      const [page] = await extractText(doc);
      const baseline = (str) => page.find((item) => item.str === str).baseline;
      expect(divider.y1).toBeGreaterThan(baseline('linha de cima'));
      // The label of the second row starts below the divider
      expect(divider.y1).toBeLessThan(baseline('Segunda') - 8);
    });

    test('a row moved to a new page gets no divider at its top', () => {
      const doc = newDocument();
      // Row A fits at the bottom of the page, row B moves to the next one
      doc.drawRowLabelTexts(
        [
          { label: 'A', text: 'a', w: 400 },
          { label: 'B', text: 'b', w: 400 },
        ],
        { y: doc.page.maxY() - 40, divider: true },
      );
      expect(doc.bufferedPageRange().count).toBe(2);
      expect(doc.y).toBeLessThan(doc.page.margins.top + 40);
      for (const page of doc._pageBuffer) {
        expect(strokedSegments(pageContent(page), 0.4)).toHaveLength(0);
      }
    });
  });

  describe('drawRowLabelTexts item taller than the page', () => {
    const lines = 120;

    test('continues on the next page instead of overflowing', async () => {
      const doc = newDocument();
      doc.text('Antes da ficha');
      doc.drawRowLabelTexts([{ label: 'Observações', text: longText(lines) }]);
      const endY = doc.y;
      doc.text('Depois da ficha');

      const pages = await extractText(doc);
      expect(pages.length).toBeGreaterThanOrEqual(2);
      const all = pages.flat().map((item) => item.str);
      for (let i = 1; i <= lines; i++) {
        expect(
          all.filter((str) => str === `Linha ${i} das observações.`),
        ).toHaveLength(1);
      }
      expect(pages[0].map((item) => item.str)).toContain(
        'Linha 1 das observações.',
      );
      const last = pages.at(-1).map((item) => item.str);
      expect(last).toContain(`Linha ${lines} das observações.`);
      expect(last).toContain('Depois da ficha');
      // Nothing below the bottom margin of any page
      const maxY = 792 - 72;
      for (const page of pages) {
        for (const item of page) {
          expect(item.baseline).toBeLessThanOrEqual(maxY);
        }
      }
      expect(endY).toBeLessThan(maxY);
    });

    test('starts on the current page when the label and one line fit', async () => {
      const doc = newDocument();
      doc.text('Antes da ficha');
      doc.drawRowLabelTexts([{ label: 'Observações', text: longText(lines) }]);
      const pages = await extractText(doc);
      const first = pages[0].map((item) => item.str);
      expect(first).toEqual(
        expect.arrayContaining(['Antes da ficha', 'Observações']),
      );
    });

    test('keeps the container and item borders on every page', () => {
      const doc = newDocument();
      doc.drawRowLabelTexts(
        [
          { label: 'Nome', text: 'Fulano', w: 500 },
          { label: 'Observações', text: longText(lines), w: 500 },
          { label: 'Fim', text: 'última linha', w: 500 },
        ],
        { box: { radius: 4 }, itemBox: { active: true, padding: 2 } },
      );
      const pages = doc._pageBuffer;
      expect(pages.length).toBeGreaterThanOrEqual(2);
      for (const page of pages) {
        const content = pageContent(page);
        expect(graphicsState(content).depth).toBe(0);
        // container box (0.3) and item box (0.1) on each page
        expect(content).toMatch(/0\.3 w\n/);
        expect(content).toMatch(/0\.1 w\n/);
      }
      expect(doc._fcmRectInfos).toEqual([]);
      expect(doc.noPageBreak).toBe(false);
    });

    test('a caller rectangle keeps spanning the pages', () => {
      const doc = newDocument();
      doc.startRect({ lineWidth: 1.5 });
      doc.drawRowLabelTexts([{ label: 'Observações', text: longText(lines) }]);
      doc.stopRect();
      for (const page of doc._pageBuffer) {
        expect(pageContent(page)).toMatch(/1\.5 w\n/);
      }
      expect(() => doc.stopRect()).toThrow();
    });
  });

  describe('review fixes', () => {
    test('drawRowLabelTexts gives back the font source the table rolls back to', () => {
      const doc = newDocument();
      doc.font('Times-Roman');
      doc.drawRowLabelTexts([{ label: 'L', text: 'T' }], {
        label: { font: 'Helvetica-Bold' },
        text: { font: 'Courier' },
      });
      expect(doc._fontSource).toBe('Times-Roman');
      doc.table({ data: [[{ text: 'célula', font: { src: 'Courier' } }]] });
      expect(doc._font.name).toBe('Times-Roman');
    });

    test('drawRuler gives back the font source the table rolls back to', () => {
      const doc = newDocument();
      doc.font('Times-Roman').fontSize(11).drawRuler();
      expect(doc._fontSource).toBe('Times-Roman');
      expect(doc._fontSize).toBe(11);
      doc.table({ data: [[{ text: 'célula', font: { src: 'Courier' } }]] });
      expect(doc._font.name).toBe('Times-Roman');
    });

    test('text without its own font is measured and drawn in the caller font', async () => {
      const doc = newDocument();
      doc.font('Times-Roman').fontSize(10);
      doc.text('Antes');
      const paragraph = 'palavra '.repeat(60).trim();
      doc.drawRowLabelTexts(
        [
          { label: 'Primeiro', text: paragraph, w: 450 },
          { label: 'Segundo', text: paragraph, w: 450 },
        ],
        { label: { font: 'Helvetica-Bold', size: 14 } },
      );
      const [page] = await extractText(doc);
      const fontOf = (str) => page.find((item) => item.str === str).font;
      const texts = page.filter((item) => item.str.startsWith('palavra'));
      expect(texts.length).toBeGreaterThan(2);
      for (const item of texts) {
        expect(item.font).toBe(fontOf('Antes'));
      }
      expect(fontOf('Primeiro')).not.toBe(fontOf('Antes'));
      // The first row was measured with the font it is drawn in: its last
      // line sits above the label of the second row
      const firstRowEnd = Math.max(
        ...texts
          .filter(
            (item) =>
              item.baseline < page.find((i) => i.str === 'Segundo').baseline,
          )
          .map((item) => item.baseline),
      );
      expect(firstRowEnd).toBeLessThan(
        page.find((item) => item.str === 'Segundo').baseline - 14,
      );
    });

    test('borders of a flowing item stay inside the bottom margin', () => {
      // Different lengths end the text at different heights on the last page.
      // The text wrapper always leaves a line of room above the margin, so
      // the spacing below the text has to be taller than a line to cross it.
      for (let lines = 40; lines <= 120; lines += 1) {
        const doc = newDocument();
        doc.startRect({ lineWidth: 1 });
        doc.drawRowLabelTexts(
          [{ label: 'Observações', text: longText(lines) }],
          {
            padding: 20,
            box: { radius: 4 },
            itemBox: { active: true, padding: 8 },
          },
        );
        doc.stopRect();
        for (const page of doc._pageBuffer) {
          expect(pathMaxY(pageContent(page))).toBeLessThanOrEqual(
            page.maxY() + 0.001,
          );
          expect(page.margins.bottom).toBe(72);
          expect(page.margins.top).toBe(72);
        }
      }
    });

    test('a fixed text height is reserved across pages', () => {
      const doc = newDocument();
      const top = doc.page.margins.top;
      doc.drawRowLabelTexts(
        [{ label: 'Anotações', text: 'curto', hText: 900 }],
        {
          box: {},
        },
      );
      expect(doc.bufferedPageRange().count).toBe(2);
      // Of the 900pt, at most the useful height fits on the first page
      expect(doc.y).toBeGreaterThan(top + 900 - doc.usefulH());
      const [, second] = doc._pageBuffer;
      // The container box continues and closes on the second page
      expect(pageContent(second)).toMatch(/0\.3 w\n/);
    });

    test('the item box keeps its padding on continuation pages', async () => {
      const firstBaseline = async (padding) => {
        const doc = newDocument();
        doc.drawRowLabelTexts([{ label: 'Observações', text: longText(120) }], {
          itemBox: { active: true, padding },
        });
        const pages = await extractText(doc);
        return pages[1][0].baseline;
      };
      expect((await firstBaseline(8)) - (await firstBaseline(0))).toBeCloseTo(
        8,
        3,
      );
    });

    test('nested borders stay apart across the pages of a flowing item', () => {
      const doc = newDocument();
      doc.startRect({ lineWidth: 0.7 });
      doc.drawRowLabelTexts([{ label: 'Observações', text: longText(120) }], {
        padding: 5,
        box: {},
        itemBox: { active: true, padding: 2 },
      });
      doc.stopRect();
      const pages = doc._pageBuffer;
      expect(pages.length).toBeGreaterThanOrEqual(3);
      const first = borderExtents(pageContent(pages[0]));
      const middle = borderExtents(pageContent(pages[1]));
      // Bottom of the first page and top of a continuation page:
      // caller rectangle (0.7) outside the box (0.3) outside the item box (0.1)
      expect(first['0.7'].bottom - first['0.3'].bottom).toBeCloseTo(5, 3);
      expect(first['0.3'].bottom - first['0.1'].bottom).toBeCloseTo(5, 3);
      expect(middle['0.3'].top - middle['0.7'].top).toBeCloseTo(5, 3);
      expect(middle['0.1'].top - middle['0.3'].top).toBeCloseTo(5, 3);
      expect(middle['0.7'].top).toBe(doc.page.margins.top);
      expect(middle['0.7'].bottom).toBeLessThanOrEqual(pages[1].maxY());
    });

    test('page listeners see the real page limits while an item flows', () => {
      const doc = newDocument();
      const seen = [];
      const record = () =>
        seen.push({
          bottom: doc.page.margins.bottom,
          maxY: doc.page.maxY(),
        });
      doc.on('beforePageAdded', record);
      doc.on('pageAdded', record);
      doc.drawRowLabelTexts([{ label: 'Observações', text: longText(120) }], {
        box: {},
        itemBox: { active: true, padding: 4 },
      });
      expect(seen.length).toBeGreaterThanOrEqual(4);
      for (const limits of seen) {
        expect(limits).toEqual({ bottom: 72, maxY: 720 });
      }
      for (const page of doc._pageBuffer) {
        expect(Object.prototype.hasOwnProperty.call(page, 'maxY')).toBe(false);
      }
      expect(
        Object.prototype.hasOwnProperty.call(doc, 'continueOnNewPage'),
      ).toBe(false);
    });

    test('the flow starts below what a pageAdded listener draws at the top', async () => {
      const doc = newDocument();
      doc.on('pageAdded', () => {
        doc.text('Cabeçalho', doc.page.margins.left, doc.page.margins.top);
      });
      doc.drawRowLabelTexts([{ label: 'Observações', text: longText(120) }]);
      const pages = await extractText(doc);
      const [header, firstLine] = pages[1];
      expect(header.str).toBe('Cabeçalho');
      expect(firstLine.baseline).toBeGreaterThan(header.baseline + 10);
    });
  });
});
