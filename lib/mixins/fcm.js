/**
 * FCM - Additional functionality for PDFKit
 * Provides enhanced drawing methods, multi-page rectangle system, and positioning utilities.
 * @module FCMMixin
 */

/**
 * Mathematical constant used to approximate a symmetrical arc using a cubic Bezier curve.
 * This value represents the control point distance for creating smooth circular arcs.
 * @constant {number}
 */
const KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);

export default {
  /**
   * Initializes the FCM system for multi-page rectangles and event handling.
   * Called automatically when the document is created.
   * Sets up internal data structures for tracking rectangle states and event listeners.
   * @private
   */
  initFcm() {
    this._fcmRectInfos = [];
    this._fcmListenerBeforeAddPage = null;
    this._fcmListenerAddPage = null;
  },

  /**
   * Registers the page listeners that draw the open multi-page rectangles.
   * @private
   */
  _fcmEnsurePageListeners() {
    if (!this._fcmListenerBeforeAddPage) {
      this._fcmListenerBeforeAddPage = this.onBeforePageAdded.bind(this);
      this.on('beforePageAdded', this._fcmListenerBeforeAddPage);
    }
    if (!this._fcmListenerAddPage) {
      this._fcmListenerAddPage = this.onPageAdded.bind(this);
      this.on('pageAdded', this._fcmListenerAddPage);
    }
  },

  /**
   * Strokes the path built by `drawPath` with the given line width, inside
   * `save()`/`restore()`, so the caller's graphics state is left untouched.
   * @private
   * @param {number} lineWidth
   * @param {Function} drawPath - Builds the path on the document
   */
  _fcmStroke(lineWidth, drawPath) {
    this.save();
    this.lineWidth(lineWidth);
    drawPath();
    this.stroke();
    return this.restore();
  },

  /**
   * Captures the font and fill color, to give them back to the caller.
   * @private
   */
  _fcmSaveTextState() {
    return {
      fillColor: this._fillColor,
      font: this._font,
      // font() also sets the source, which the table reads to roll back
      // a cell font
      fontSource: this._fontSource,
      fontFamily: this._fontFamily,
      fontSize: this._fontSize,
    };
  },

  /**
   * Restores the font captured by `_fcmSaveTextState()`, without
   * touching the fill color.
   * @private
   */
  _fcmRestoreFont(state) {
    this._font = state.font;
    this._fontSource = state.fontSource;
    this._fontFamily = state.fontFamily;
    this._fontSize = state.fontSize;
  },

  /**
   * Restores the state captured by `_fcmSaveTextState()`.
   * @private
   */
  _fcmRestoreTextState(state) {
    this._fcmRestoreFont(state);
    if (state.fillColor) {
      this.fillColor(...state.fillColor);
    } else {
      // PDF's initial fill color
      this.fillColor('black');
      this._fillColor = undefined;
    }
  },

  /**
   * Draws the top portion of a rounded rectangle with rounded top corners.
   * Used for creating multi-page rectangles where this is the first part.
   * @param {number} x - X coordinate of the rectangle's left edge
   * @param {number} y - Y coordinate of the rectangle's top edge  
   * @param {number} w - Width of the rectangle
   * @param {number} h - Height of the rectangle portion
   * @param {number} [r=0] - Radius for rounded corners
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.roundedRectUp(50, 100, 200, 150, 10).stroke();
   */
  roundedRectUp(x, y, w, h, r) {
    if (r == null) {
      r = 0;
    }
    r = Math.min(r, 0.5 * w, 0.5 * h); // amount to inset control points from corners (see `ellipse`)
    const c = r * (1.0 - KAPPA);
    this.moveTo(x, y + h);
    this.lineTo(x, y + r);
    this.bezierCurveTo(x, y + c, x + c, y, x + r, y);
    this.lineTo(x + w - r, y);
    this.bezierCurveTo(x + w - c, y, x + w, y + c, x + w, y + r);
    return this.lineTo(x + w, y + h);
  },

  /**
   * Draws the middle portion of a rectangle with straight vertical sides.
   * Used for creating multi-page rectangles where this is a middle section.
   * @param {number} x - X coordinate of the rectangle's left edge
   * @param {number} y - Y coordinate of the rectangle's top edge
   * @param {number} w - Width of the rectangle
   * @param {number} h - Height of the rectangle portion
   * @param {number} [r=0] - Radius (not used in middle sections but kept for consistency)
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.roundedRectMid(50, 250, 200, 300).stroke();
   */
  // eslint-disable-next-line no-unused-vars
  roundedRectMid(x, y, w, h, r) {
    this.moveTo(x, y + h);
    this.lineTo(x, y);
    this.moveTo(x + w, y + h);
    return this.lineTo(x + w, y);
  },

  /**
   * Draws the bottom portion of a rounded rectangle with rounded bottom corners.
   * Used for creating multi-page rectangles where this is the final part.
   * @param {number} x - X coordinate of the rectangle's left edge
   * @param {number} y - Y coordinate of the rectangle's top edge
   * @param {number} w - Width of the rectangle
   * @param {number} h - Height of the rectangle portion
   * @param {number} [r=0] - Radius for rounded corners
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.roundedRectDown(50, 550, 200, 100, 10).stroke();
   */
  roundedRectDown(x, y, w, h, r) {
    if (r == null) {
      r = 0;
    }
    r = Math.min(r, 0.5 * w, 0.5 * h); // amount to inset control points from corners (see `ellipse`)
    const c = r * (1.0 - KAPPA);
    this.moveTo(x + w, y);
    this.lineTo(x + w, y + h - r);
    this.bezierCurveTo(x + w, y + h - c, x + w - c, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.bezierCurveTo(x + c, y + h, x, y + h - c, x, y + h - r);
    return this.lineTo(x, y);
  },

  /**
   * Draws a ruler with tick marks and measurements for development and debugging.
   * Useful for visualizing coordinates and spacing while developing layouts.
   * Preserves the current drawing position, font and font size.
   * @param {number} [x=0] - X coordinate where the ruler starts
   * @param {number} [y=0] - Y coordinate where the ruler starts
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.drawRuler(0, 0); // Draw ruler at top-left corner
   * doc.drawRuler(50, 50); // Draw ruler starting at position (50, 50)
   */
  drawRuler(x = 0, y = 0) {
    const xBase = this.x;
    const yBase = this.y;
    const noPageBreak = this.noPageBreak;
    const textState = this._fcmSaveTextState();
    this.noPageBreak = true;
    this.font('Helvetica').fontSize(8);
    for (let i = 1; i < 100; i++) {
      const d = i * 10;
      if (d > this.page.maxY()) {
        break;
      }
      // Each tick is stroked before its label: a text object inside an open
      // path is invalid PDF, and an unpainted path never shows up.
      if (i % 5 === 0) {
        this.moveTo(x, d + y)
          .lineTo(5 + x, d + y)
          .stroke();
        this.text(String(d), 7 + x, d - 4 + y);
      } else {
        this.moveTo(x, d + y)
          .lineTo(3 + x, d + y)
          .stroke();
      }
    }
    for (let i = 1; i < 100; i++) {
      const d = i * 10;
      if (i % 5 === 0) {
        this.moveTo(d + x, y)
          .lineTo(d + x, 5 + y)
          .stroke();
        this.text(String(d), d - 4 + x, 7 + y);
      } else {
        this.moveTo(d + x, y)
          .lineTo(d + x, 3 + y)
          .stroke();
      }
    }

    this.x = xBase;
    this.y = yBase;
    this._fcmRestoreFont(textState);
    this.noPageBreak = noPageBreak;
    return this;
  },

  /**
   * Increments the current X position by the specified amount.
   * @param {number} x - Amount to add to the current X position
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.incX(50); // Move 50 points to the right
   */
  incX(x) {
    this.x += x;
    return this;
  },

  /**
   * Increments the current Y position by the specified amount.
   * @param {number} y - Amount to add to the current Y position
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.incY(20); // Move 20 points down
   */
  incY(y) {
    this.y += y;
    return this;
  },

  /**
   * Increments both X and Y positions by the specified amounts.
   * @param {number} x - Amount to add to the current X position
   * @param {number} y - Amount to add to the current Y position
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.incXY(30, 15); // Move 30 points right and 15 points down
   */
  incXY(x, y) {
    this.y += y;
    this.x += x;
    return this;
  },

  /**
   * Sets the current X position to the specified value.
   * @param {number} x - New X position
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.setX(100); // Set X position to 100 points
   */
  setX(x) {
    this.x = x;
    return this;
  },

  /**
   * Sets the current Y position to the specified value.
   * @param {number} y - New Y position
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.setY(200); // Set Y position to 200 points
   */
  setY(y) {
    this.y = y;
    return this;
  },

  /**
   * Sets both X and Y positions to the specified values.
   * @param {number} x - New X position
   * @param {number} y - New Y position
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.setXY(50, 100); // Set position to (50, 100)
   */
  setXY(x, y) {
    this.y = y;
    this.x = x;
    return this;
  },

  /**
   * Resets the X position to the left margin of the page.
   * Useful for returning to the start of a line after positioning operations.
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.startX(); // Return to left margin
   */
  startX() {
    this.x = this.page.margins.left;
    return this;
  },

  /**
   * Gets the useful height of the page (total height minus top and bottom margins).
   * @returns {number}
   * @example
   * const availableHeight = doc.usefulH();
   * console.log(`Available space: ${availableHeight} points`);
   */
  usefulH() {
    return (
      this.page.height - (this.page.margins.bottom + this.page.margins.top)
    );
  },

  /**
   * Gets the useful width of the page (total width minus left and right margins).
   * @returns {number}
   * @example
   * const availableWidth = doc.usefulW();
   * console.log(`Available space: ${availableWidth} points`);
   */
  usefulW() {
    return this.page.width - (this.page.margins.left + this.page.margins.right);
  },

  /**
   * Internal callback triggered before a new page is added.
   * Handles drawing the appropriate rectangle portions for multi-page rectangles.
   * Temporarily disables page breaks to prevent infinite recursion.
   * @private
   */
  onBeforePageAdded() {
    const noPageBreak = this.noPageBreak;
    this.noPageBreak = true;

    const flow = this._fcmFlow;
    if (flow) {
      flow.consumed += this.y - flow.segmentStart;
    }

    for (const info of this._fcmRectInfos) {
      // While a text flows, the borders reach into the space reserved
      // below it (see _fcmFlowText)
      const h = this.y + (flow ? info.padBottom || 0 : 0) - info.y;
      if (info.state === 1) {
        this._fcmStroke(info.lineWidth, () =>
          this.roundedRectUp(info.x, info.y, info.w, h, info.r || 0),
        );
      }
      if (info.state === 2) {
        this._fcmStroke(info.lineWidth, () =>
          this.roundedRectMid(info.x, info.y, info.w, h, info.r || 0),
        );
      }
      info.state = 2;
    }
    this.noPageBreak = noPageBreak;
  },

  /**
   * Internal callback triggered after a new page is added.
   * Updates the Y position for all active multi-page rectangles to continue on the new page.
   * @private
   */
  onPageAdded() {
    const flow = this._fcmFlow;
    if (flow) {
      // Reserve the padding of the flowing item on the new page as well,
      // before the text wrapper reads the page limits
      this._fcmReservePageSpace(flow);
      this.y = this.page.margins.top;
      flow.segmentStart = this.y;
    }
    for (const info of this._fcmRectInfos) {
      info.y = this.y - (flow ? flow.padTop : 0);
    }
  },

  /**
   * Shrinks the current page's margins by the space a flowing item
   * reserves above and below its text, remembering the original margins.
   * @private
   */
  _fcmReservePageSpace(flow, top = flow.padTop) {
    const { margins } = this.page;
    flow.pages.push({ page: this.page, margins });
    this.page.margins = {
      ...margins,
      top: margins.top + top,
      bottom: margins.bottom + flow.padBottom,
    };
  },

  /**
   * Starts a multi-page rectangle that can span across page breaks.
   * Sets up event listeners to handle rectangle drawing across pages automatically.
   * The border is stroked with its own line width and leaves the document's
   * graphics state unchanged.
   * @param {Object} [options={}] - Configuration options for the rectangle
   * @param {number} [options.x] - X coordinate of the rectangle (defaults to current position; 0 is a valid coordinate)
   * @param {number} [options.y] - Y coordinate of the rectangle (defaults to current position; 0 is a valid coordinate)
   * @param {number} [options.w=0] - Width of the rectangle (defaults to usefulW)
   * @param {number} [options.r=0] - Radius for rounded corners
   * @param {number} [options.lineWidth=0.7] - Line width for the rectangle border
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.startRect({
   *   x: 50,
   *   y: 100,
   *   w: 400,
   *   r: 5,
   *   lineWidth: 1.5
   * });
   */
  startRect({ x, y, w = 0, r = 0, lineWidth = 0.7 } = {}) {
    this._fcmEnsurePageListeners();
    this._fcmRectInfos.push({
      state: 1,
      x: x ?? this.x,
      y: y ?? this.y,
      w: w || this.usefulW(),
      r: r || 0,
      lineWidth: lineWidth || 0.3,
    });
    return this;
  },

  /**
   * Ends the most recently started multi-page rectangle.
   * Draws the final portion of the rectangle and removes it from the tracking system.
   * @returns {PDFDocument} Returns this for method chaining
   * @throws {Error} If called without a matching startRect
   * @example
   * doc.startRect({w: 300, r: 10});
   * // ... add content ...
   * doc.stopRect(); // Completes the rectangle
   */
  stopRect() {
    const info = this._fcmRectInfos.pop();
    if (!info) {
      throw new Error('stopRect() called without a matching startRect()');
    }
    this._fcmCloseRect(info, this.y);
    return this;
  },

  /**
   * Draws the last portion of a multi-page rectangle, ending at `bottom`.
   * @private
   */
  _fcmCloseRect(info, bottom) {
    const h = bottom - info.y;
    if (info.state === 1) {
      this._fcmStroke(info.lineWidth, () =>
        this.roundedRect(info.x, info.y, info.w, h, info.r || 0),
      );
    }
    if (info.state === 2) {
      this._fcmStroke(info.lineWidth, () =>
        this.roundedRectDown(info.x, info.y, info.w, h, info.r || 0),
      );
    }
    info.state = 0;
  },

  /**
   * Automatically adds a new page if the remaining usable space is less than the specified minimum.
   * Helps prevent content from being cut off at page boundaries.
   * @param {number} minSize - Minimum required space in points before triggering a new page
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.tryAddPage(100); // Add page if less than 100 points remaining
   * doc.text('This text will have enough space'); // Safe to add content
   */
  tryAddPage(minSize) {
    if (this.page.maxY() - this.y < minSize) {
      this.addPage();
    }
    return this;
  },

  /**
   * Draws a collection of items with labels and text in an automatic multi-line layout.
   * Provides intelligent text wrapping, auto-sizing, and multi-page support with optional borders.
   * A row that does not fit in the rest of the page moves to a new page. A row with a
   * single item taller than the useful page height is written across pages instead,
   * with the container and item borders continuing on each page. An item taller than
   * the page in a row with other items is not split.
   * The fill color, font and font size of the caller are restored at the end, and the
   * borders do not change the document's line width.
   * @param {Array} itens - Array of items to render. Can be strings or objects with label/text properties
   * @param {Object} [options={}] - Configuration options for the layout
   * @param {Object} [options.label] - Label text styling options
   * @param {string} [options.label.font] - Font family for labels (defaults to the caller's font)
   * @param {number} [options.label.size] - Font size for labels (defaults to the caller's size)
   * @param {number} [options.label.h] - Fixed height for labels
   * @param {Object} [options.text] - Main text styling options
   * @param {string} [options.text.font] - Font family for main text (defaults to the caller's font)
   * @param {number} [options.text.size] - Font size for main text (defaults to the caller's size)
   * @param {number} [options.text.h] - Fixed height for main text, reserved in full (across pages when taller than the page)
   * @param {number} [options.defaultItemW=50] - Default width for items without specified width
   * @param {number} [options.padding=5] - Spacing between items and borders
   * @param {boolean} [options.debug=false] - Enable debug mode to show boundaries
   * @param {number} [options.x] - X position to start drawing (defaults to current position; 0 is a valid coordinate)
   * @param {number} [options.y] - Y position to start drawing (defaults to current position; 0 is a valid coordinate)
   * @param {number} [options.w] - Total width available (defaults to page width minus margins)
   * @param {boolean} [options.noLabel=false] - Disable label rendering
   * @param {boolean} [options.divider=false] - Add divider lines between rows on the same page
   * @param {Object} [options.box] - Container box options
   * @param {number} [options.box.radius=0] - Border radius for container box
   * @param {Object} [options.itemBox] - Individual item box options
   * @param {number} [options.itemBox.radius=0] - Border radius for item boxes
   * @param {number} [options.itemBox.padding=0] - Padding inside item boxes
   * @param {boolean} [options.itemBox.active=false] - Enable individual item borders
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * // Simple text items
   * doc.drawRowLabelTexts(['Item 1', 'Item 2', 'Item 3']);
   *
   * @example
   * // Complex items with labels and custom widths
   * const items = [
   *   { label: 'Name:', text: 'John Doe', w: 200 },
   *   { label: 'Age:', text: '30', w: 100 },
   *   { label: 'Email:', text: 'john@example.com', link: 'mailto:john@example.com' }
   * ];
   *
   * doc.drawRowLabelTexts(items, {
   *   label: { font: 'Helvetica-Bold', size: 12 },
   *   text: { font: 'Helvetica', size: 10 },
   *   box: { radius: 5 },
   *   padding: 10
   * });
   */
  drawRowLabelTexts(itens, options = {}) {
    const noPageBreak = this.noPageBreak;
    const textState = this._fcmSaveTextState();
    this.noPageBreak = true;
    try {
      this._fcmDrawRowLabelTexts(itens, options, textState);
    } finally {
      this.noPageBreak = noPageBreak;
      this._fcmRestoreTextState(textState);
    }
    return this;
  },

  /**
   * Layout and drawing of `drawRowLabelTexts`, which saves and restores the
   * caller's state around it.
   * @private
   * @param {Object} callerState - The caller's font, from `_fcmSaveTextState()`
   */
  _fcmDrawRowLabelTexts(itens, options, callerState) {
    const hasLabel = !options?.noLabel;
    const _options = {
      label: {
        font: options?.label?.font || null,
        size: options?.label?.size || null,
        h: options?.label?.h || 0,
      },
      text: {
        font: options?.text?.font || null,
        size: options?.text?.size || null,
        h: options?.text?.h || 0,
      },
      defaultItemW: options?.defaultItemW ?? 50,
      padding: options?.padding ?? 5,
      debug: options?.debug || false,
      x: options?.x ?? this.x,
      y: options?.y ?? this.y,
      w: 0,
      box: null,
      divider: options.divider || false,
      itemBox: {
        padding: 0,
      },
    };
    _options.w =
      options?.w || this.page.width - (_options.x + this.page.margins.right);
    if (options.box) {
      _options.box = {
        radius: options.box.radius || 0,
      };
    }

    if (options.itemBox) {
      _options.itemBox = {
        radius: options.itemBox.radius || 0,
        padding: options.itemBox.padding || 0,
        active: options.itemBox.active || false,
      };
    }
    const ip = _options.itemBox.padding;
    // Space between items, between rows and around them
    const gap = _options.padding + ip * 2;
    const boxInfo = {
      state: _options.box ? 1 : 0, // 0 - noBox  1 - box not start   2 - box started
      x: _options.x,
      y: _options.y,
    };
    // Labels and texts without their own font or size use the caller's,
    // never the one left by the previous label or text: the text is
    // measured and drawn with the same font.
    const useFont = ({ font, size }) => {
      this._fcmRestoreFont(callerState);
      font && this.font(font);
      size && this.fontSize(size);
    };
    const useTextFont = () => useFont(_options.text);
    const useLabelFont = () => useFont(_options.label);

    this.setXY(_options.x, _options.y);

    // Cálculo automático de larguras e distribuição de linhas
    // Ele é feito antes da pintura em si para distribuir possíveis espaços sobrando
    let usefulW = _options.w - _options.padding;
    const _items = [];
    const newLineInfo = () => ({
      remainW: 0,
      countAuto: 0,
      count: 0,
      maxH: 0,
      flow: false,
    });
    const linesInfo = [newLineInfo()];
    let line = 0;
    for (const item of itens) {
      const it = {
        item,
        autoW: false,
        line: line,
        w: item.w,
        color: item.color || 'black',
        // A fixed height (per item, else from options) skips measuring.
        hLabel: item.hLabel || _options.label.h,
        hText: item.hText || _options.text.h,
        // A fixed text height reserves that space, also across pages
        fixedText: Boolean(item.hText || _options.text.h),
        // Height of one line of the text
        hLine: 0,
      };
      if (typeof item === 'string') {
        it.item = {
          text: item,
        };
      }
      if (!it.w) {
        it.w = _options.defaultItemW;
        it.autoW = true;
      } else if (it.w > _options.w) {
        it.w = _options.w;
      }
      if (usefulW - it.w < 0) {
        // New Line
        linesInfo[line].remainW = usefulW;
        line++;
        linesInfo.push(newLineInfo());
        it.line = line;
        usefulW = _options.w - gap;
      }
      usefulW -= it.w;
      usefulW -= gap;
      if (it.autoW) {
        linesInfo[line].countAuto++;
      }
      linesInfo[line].count++;
      _items.push(it);
    }
    linesInfo[line].remainW = usefulW;
    for (const it of _items) {
      if (it.autoW) {
        it.w += linesInfo[it.line].remainW / linesInfo[it.line].countAuto;
      }
      useTextFont();
      it.hLine = this.currentLineHeight(true);
      if (!it.hText) {
        it.hText = this.heightOfString(it.item.text, {
          align: it.item.align || 'left',
          width: it.w,
        });
      }
      if (hasLabel && !it.hLabel) {
        useLabelFont();
        it.hLabel = this.heightOfString(it.item.label, {
          align: it.item.align || 'left',
          width: it.w,
        });
      }
      const itemH = hasLabel
        ? it.hText + it.hLabel + _options.padding + ip
        : it.hText;
      if (linesInfo[it.line].maxH < itemH) {
        linesInfo[it.line].maxH = itemH;
      }
    }
    // A single item taller than the page is written across pages: holding
    // it back for a new page would not make it fit.
    for (const lineInfo of linesInfo) {
      lineInfo.flow =
        lineInfo.count === 1 && lineInfo.maxH + gap > this.usefulH();
    }

    // Space a flowing item keeps above and below its text on every page:
    // the item box padding, and the spacing that closes the row
    const flowPad = {
      top: _options.itemBox.active ? ip : 0,
      bottom: Math.max(
        hasLabel ? _options.padding + ip : 0,
        _options.itemBox.active ? ip : 0,
      ),
    };

    // Agora é hora de desenhar os itens
    let cX = _options.x + gap;
    let cY = _options.y + gap;
    let currentLine = 0;
    let firstItem = true;
    for (const it of _items) {
      let newLine = false;
      if (it.line !== currentLine) {
        cX = _options.x + gap;
        cY += linesInfo[currentLine].maxH + gap;
        currentLine = it.line;
        newLine = true;
      }
      const lineInfo = linesInfo[currentLine];
      // A row that flows only needs room for its label and one line of text
      const neededH = lineInfo.flow
        ? (hasLabel ? it.hLabel : 0) + it.hLine + flowPad.bottom
        : lineInfo.maxH;
      let pageBreak = false;
      if ((newLine || firstItem) && neededH + cY > this.page.maxY()) {
        if (currentLine > 0) {
          const h = cY - boxInfo.y;
          const r = _options.box?.radius || 0;
          if (boxInfo.state === 1) {
            this._fcmStroke(0.3, () =>
              this.roundedRectUp(boxInfo.x, boxInfo.y, _options.w, h, r),
            );
            boxInfo.state = 2;
          } else if (boxInfo.state === 2) {
            this._fcmStroke(0.3, () =>
              this.roundedRectMid(boxInfo.x, boxInfo.y, _options.w, h, r),
            );
          }
        }

        this.addPage();
        pageBreak = true;
        if (currentLine > 0) {
          boxInfo.y = this.y;
          cY = this.y;
        } else {
          boxInfo.y = this.y;
          cY = this.y + gap;
        }
      }
      firstItem = false;

      // A first item wider than the row leaves an empty row 0 before it,
      // which gets no divider
      const afterItems = linesInfo[currentLine - 1]?.count > 0;
      if (newLine && afterItems && !pageBreak && _options.divider) {
        const y = cY - gap / 2;
        this._fcmStroke(0.4, () =>
          this.moveTo(_options.x + 5, y).lineTo(_options.x + _options.w - 5, y),
        );
      }

      this.fillColor(it.color);
      if (hasLabel) {
        useLabelFont();
        this.text(it.item.label, cX, cY, {
          align: it.item.align || 'left',
          width: it.w,
          height: it.hLabel,
        });
        if (_options.debug) {
          this._fcmStroke(0.1, () => this.rect(cX, cY, it.w, it.hLabel));
        }
      }
      useTextFont();
      const textY = cY + (hasLabel ? it.hLabel : 0);
      const optionsAux = {
        align: it.item.align || 'left',
        width: it.w,
      };
      if (it.item.link) {
        optionsAux.link = it.item.link || '';
        optionsAux.underline = true;
      }

      if (lineInfo.flow) {
        const textEnd = this._fcmFlowText(it, cX, textY, optionsAux, {
          boxInfo,
          boxW: _options.w,
          boxRadius: _options.box?.radius || 0,
          itemBox: _options.itemBox.active ? ip : null,
          pad: flowPad,
        });
        // The row now ends where the text ended, plus the space reserved
        // below it
        cY = textEnd;
        lineInfo.maxH = flowPad.bottom;
      } else {
        optionsAux.height = it.hText;
        this.text(it.item.text, cX, textY, optionsAux);

        if (_options.debug) {
          this._fcmStroke(0.1, () => this.rect(cX, textY, it.w, it.hText));
        }

        if (_options.itemBox.active) {
          this._fcmStroke(0.1, () =>
            this.rect(cX - ip, textY - ip, it.w + ip * 2, it.hText + ip * 2),
          );
        }
      }
      cX += it.w + gap;
    }
    cY += linesInfo[currentLine].maxH;

    const r = _options.box?.radius || 0;
    const h = cY - boxInfo.y;
    if (boxInfo.state === 1) {
      this._fcmStroke(0.3, () =>
        this.roundedRect(boxInfo.x, boxInfo.y, _options.w, h, r),
      );
    }
    if (boxInfo.state === 2) {
      this._fcmStroke(0.3, () =>
        this.roundedRectDown(boxInfo.x, boxInfo.y, _options.w, h, r),
      );
    }

    this.setXY(_options.x, cY);
  },

  /**
   * Writes the text of an item that is taller than the page, letting it
   * continue on the following pages. The container box, the item box and any
   * open `startRect()` are drawn on each page by the multi-page rectangle
   * listeners.
   *
   * On every page the margins are shrunk by `pad` while the text flows, so
   * the item box padding and the spacing that closes the row stay inside the
   * original margins, and the item box keeps its padding at the top of the
   * continuation pages. A fixed text height is reserved in full, across pages
   * if needed; text longer than it is not cut.
   * @private
   * @returns {number} The y position where the text (or its fixed height) ended
   */
  _fcmFlowText(
    it,
    x,
    y,
    textOptions,
    { boxInfo, boxW, boxRadius, itemBox, pad },
  ) {
    const frames = [];
    let boxFrame = null;
    let itemFrame = null;
    if (boxInfo.state) {
      boxFrame = {
        state: boxInfo.state,
        x: boxInfo.x,
        y: boxInfo.y,
        w: boxW,
        r: boxRadius,
        lineWidth: 0.3,
        padBottom: pad.bottom,
      };
      frames.push(boxFrame);
    }
    if (itemBox != null) {
      itemFrame = {
        state: 1,
        x: x - itemBox,
        y: y - itemBox,
        w: it.w + itemBox * 2,
        r: 0,
        lineWidth: 0.1,
        padBottom: itemBox,
      };
      frames.push(itemFrame);
    }

    // The caller's open rectangles also reach the reserved space, so they
    // keep enclosing the container box
    const callerFrames = this._fcmRectInfos.map((info) => ({
      info,
      padBottom: info.padBottom,
    }));
    for (const { info } of callerFrames) {
      info.padBottom = pad.bottom;
    }

    const flow = {
      padTop: pad.top,
      padBottom: pad.bottom,
      // Pages whose margins were shrunk, with the original margins
      pages: [],
      // Height taken by the text on the previous pages
      consumed: 0,
      segmentStart: y,
    };
    this._fcmEnsurePageListeners();
    this._fcmRectInfos.push(...frames);
    // On the current page the text already starts below the item box top
    this._fcmReservePageSpace(flow, 0);
    this._fcmFlow = flow;
    this.noPageBreak = false;
    let textEnd;
    try {
      this.text(it.item.text, x, y, textOptions);
      if (it.fixedText) {
        this._fcmReserveFlowHeight(
          it.hText - (flow.consumed + this.y - flow.segmentStart),
        );
      }
      textEnd = this.y;
    } finally {
      this.noPageBreak = true;
      this._fcmFlow = null;
      for (const { page, margins } of flow.pages) {
        page.margins = margins;
      }
      this._fcmRectInfos.splice(this._fcmRectInfos.length - frames.length);
      for (const { info, padBottom } of callerFrames) {
        info.padBottom = padBottom;
      }
    }

    if (itemFrame) {
      this._fcmCloseRect(itemFrame, textEnd + itemBox);
    }
    if (boxFrame) {
      boxInfo.y = boxFrame.y;
      boxInfo.state = boxFrame.state;
    }
    return textEnd;
  },

  /**
   * Moves down by `height` while a text flows, adding pages as needed.
   * @private
   */
  _fcmReserveFlowHeight(height) {
    let remaining = height;
    while (remaining > this.page.maxY() - this.y) {
      remaining -= this.page.maxY() - this.y;
      this.y = this.page.maxY();
      this.continueOnNewPage();
    }
    if (remaining > 0) {
      this.y += remaining;
    }
  },
};
