
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
  roundedRectMid(x, y, w, h, r) {
    if (r == null) {
      r = 0;
    }
    r = Math.min(r, 0.5 * w, 0.5 * h); // amount to inset control points from corners (see `ellipse`)
    this.moveTo(x, y + h);
    this.lineTo(x, y);
    this.moveTo(x+w, y + h);
    return this.lineTo(x+w, y);
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
    this.moveTo(x+w, y);
    this.lineTo(x + w, y + h - r);
    this.bezierCurveTo(x + w, y + h - c, x + w - c, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.bezierCurveTo(x + c, y + h, x, y + h - c, x, y + h - r);
    return this.lineTo(x, y);
  },


  /**
   * Draws a ruler with tick marks and measurements for development and debugging.
   * Useful for visualizing coordinates and spacing while developing layouts.
   * Preserves the current drawing position after completion.
   * @param {number} [x=0] - X coordinate where the ruler starts
   * @param {number} [y=0] - Y coordinate where the ruler starts
   * @returns {PDFDocument} Returns this for method chaining
   * @example
   * doc.drawRuler(0, 0); // Draw ruler at top-left corner
   * doc.drawRuler(50, 50); // Draw ruler starting at position (50, 50)
   */
  drawRuler(x=0,y=0) {
    const xBase = this.x;
    const yBase = this.y;
    const noPageBreak = this.noPageBreak;
    this.noPageBreak = true;
    this.font('Helvetica').fontSize(8);
    for(let i=1;i<100; i++) {
      const d = i*10;
      if(d>this.page.maxY()) {
        break;
      }
      if(i%5===0) {
        this.moveTo(x, d+y).lineTo(5+x, d+y);
        this.text(String(d), 7+x, (d-4)+y);
      }
      else {
        this.moveTo(x, d+y).lineTo(3+x, d+y);
      }
    }
    for(let i=1;i<100; i++) {
      const d = i*10;
      if(i%5===0) {
        this.moveTo(d+x, y).lineTo(d+x, 5+y);
        this.text(String(d), (d-4)+x, 7+y);
      }
      else {
        this.moveTo(d+x, y).lineTo(d+x, 3+y);
      }
    }

    this.x = xBase;
    this.y = yBase;
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
    return this.page.height - (this.page.margins.bottom + this.page.margins.top);
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

    for (const info of this._fcmRectInfos) {
      if (info.state === 1) {
        this.roundedRectUp(info.x, info.y, info.w, this.y - info.y, info.r || 0)
          .lineWidth(info.lineWidth).stroke();
      }
      if (info.state === 2) {
        this.roundedRectMid(info.x, info.y, info.w, this.y - info.y, info.r || 0)
          .lineWidth(info.lineWidth).stroke();
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
    for (const info of this._fcmRectInfos) {
      info.y = this.y;
    }
  },


  /**
   * Starts a multi-page rectangle that can span across page breaks.
   * Sets up event listeners to handle rectangle drawing across pages automatically.
   * @param {Object} [options={}] - Configuration options for the rectangle
   * @param {number} [options.x=0] - X coordinate of the rectangle (defaults to current position)
   * @param {number} [options.y=0] - Y coordinate of the rectangle (defaults to current position)
   * @param {number} [options.w=0] - Width of the rectangle (defaults to usefulW)
   * @param {number} [options.r=0] - Radius for rounded corners
   * @param {number} [options.lineWidth=0.7] - Line width for the rectangle border
   * @param {number} [options.padding=0] - Padding inside the rectangle (not yet implemented)
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
  startRect({x = 0, y = 0, w = 0, r = 0, lineWidth = 0.7, padding = 0} = {}) {
    if (padding) {
      console.log('TODO, padding not implemented');
    }
    if (!this._fcmListenerBeforeAddPage) {
      this._fcmListenerBeforeAddPage = this.addListener('beforePageAdded', this.onBeforePageAdded.bind(this));
    }
    if (!this._fcmListenerAddPage) {
      this._fcmListenerAddPage = this.addListener('pageAdded', this.onPageAdded.bind(this));
    }
    this._fcmRectInfos.push({
      state: 1,
      x: x || this.x,
      y: y || this.y,
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
   * @throws {Error} Logs warning if called without a matching startRect
   * @example
   * doc.startRect({w: 300, r: 10});
   * // ... add content ...
   * doc.stopRect(); // Completes the rectangle
   */
  stopRect() {
    const info = this._fcmRectInfos.pop();
    if (!info) {
      console.warn('stopRect: Close Rect without startRect');
      return this;
    }
    if (info.state === 1) {
      this.roundedRect(info.x, info.y, info.w, this.y - info.y, info.r || 0)
        .lineWidth(info.lineWidth).stroke();
    }
    if (info.state === 2) {
      this.roundedRectDown(info.x, info.y, info.w, this.y - info.y, info.r || 0)
        .lineWidth(info.lineWidth).stroke();
    }
    info.state = 0;
    return this;
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
    if ((this.page.maxY() - this.y) < minSize) {
      this.addPage();
    }
    return this;
  },

  /**
   * Draws a collection of items with labels and text in an automatic multi-line layout.
   * Provides intelligent text wrapping, auto-sizing, and multi-page support with optional borders.
   * @param {Array} itens - Array of items to render. Can be strings or objects with label/text properties
   * @param {Object} options - Configuration options for the layout
   * @param {Object} [options.label] - Label text styling options
   * @param {string} [options.label.font] - Font family for labels
   * @param {number} [options.label.size] - Font size for labels
   * @param {number} [options.label.h] - Fixed height for labels
   * @param {Object} [options.text] - Main text styling options
   * @param {string} [options.text.font] - Font family for main text
   * @param {number} [options.text.size] - Font size for main text
   * @param {number} [options.text.h] - Fixed height for main text
   * @param {number} [options.defaultItemW=50] - Default width for items without specified width
   * @param {number} [options.padding=5] - Spacing between items and borders
   * @param {boolean} [options.debug=false] - Enable debug mode to show boundaries
   * @param {number} [options.x] - X position to start drawing (defaults to current position)
   * @param {number} [options.y] - Y position to start drawing (defaults to current position)
   * @param {number} [options.w] - Total width available (defaults to page width minus margins)
   * @param {boolean} [options.noLabel=false] - Disable label rendering
   * @param {boolean} [options.divider=false] - Add divider lines between rows
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
  drawRowLabelTexts(itens, options) {
    const noPageBreak = this.noPageBreak;
    this.noPageBreak = true;
    const hasLabel = !options?.noLabel;
    const _options = {
      label: {
        font: options?.label?.font || null,
        size: options?.label?.size || null,
        h: options?.text?.h || 0,
      },
      text: {
        font: options?.text?.font || null,
        size: options?.text?.size || null,
        h: options?.text?.h || 0,
      },
      defaultItemW: options?.defaultItemW ?? 50,
      padding: options?.padding ?? 5,
      debug: options?.debug || false,
      x: options?.x || this.x,
      y: options?.y || this.y,
      w: 0,
      box: null,
      divider: options.divider || false,
      itemBox: {
        padding: 0
      }
    };
    _options.w = options?.w || (this.page.width - (_options.x + this.page.margins.right));
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
    const boxInfo = {
      state: _options.box ? 1 : 0, // 0 - noBox  1 - box not start   2 - box started
      x: _options.x,
      y: _options.y,
    };

    this.setXY(_options.x, _options.y);

    // Cálculo automático de larguras e distribuição de linhas
    // Ele é feito antes da pintura em si para distribuir possíveis espaços sobrando
    let usefulW = _options.w - _options.padding;
    const _items = [];
    const linesInfo = [
      {
        remainW: 0,
        countAuto: 0,
        maxH: 0,
      },
    ];
    let line = 0;
    for (const item of itens) {
      const it = {
        item,
        autoW: false,
        line: line,
        w: item.w,
        color: item.color || 'black',
        hLabel: _options.label.h,
        hText: _options.text.h,
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
      if (usefulW - it.w < 0) { // New Line
        linesInfo[line].remainW = usefulW;
        line++;
        linesInfo.push({
          remainW: 0,
          countAuto: 0,
          maxH: 0,
        });
        it.line = line;
        usefulW = _options.w - (_options.padding + _options.itemBox.padding * 2);
      }
      usefulW -= it.w;
      usefulW -= (_options.padding + _options.itemBox.padding * 2);
      if (it.autoW) {
        linesInfo[line].countAuto++;
      }
      _items.push(it);
    }
    linesInfo[line].remainW = usefulW;
    for (const it of _items) {
      if (it.autoW) {
        it.w += (linesInfo[it.line].remainW / linesInfo[it.line].countAuto);
      }
      if (!it.item.hText) {
        _options.text.font && this.font(_options.text.font);
        _options.text.size && this.fontSize(_options.text.size);
        it.hText = this.heightOfString(it.item.text, {align: it.item.align || 'left', width: it.w});
        if (linesInfo[it.line].maxH < it.hText) {
          linesInfo[it.line].maxH = it.hText;
        }
      }
      if (hasLabel && !it.item.hLabel) {
        _options.label.font && this.font(_options.label.font);
        _options.label.size && this.fontSize(_options.label.size);
        this.fillColor(it.color);
        it.hLabel = this.heightOfString(it.item.label, {align: it.item.align || 'left', width: it.w});
        if (linesInfo[it.line].maxH < (it.hText + it.hLabel + _options.padding + _options.itemBox.padding)) {
          linesInfo[it.line].maxH = (it.hText + it.hLabel + _options.padding + _options.itemBox.padding);
        }
      }

      if (_options.divider) {
        this.moveTo(this.x + 5, this.y).lineTo(this.x + this.usefulW() - 5, this.y).lineWidth(0.4).stroke();
      }
    }

    // Agora é hora de desenhar os itens
    let cX = _options.x + _options.padding + _options.itemBox.padding * 2;
    let cY = _options.y + _options.padding + _options.itemBox.padding * 2;
    let currentLine = 0;
    for (const it of _items) {
      if (it.line !== currentLine) {
        cX = _options.x + _options.padding + _options.itemBox.padding * 2;
        cY += linesInfo[currentLine].maxH + _options.padding + _options.itemBox.padding * 2;
        currentLine = it.line;
      }
      if (linesInfo[currentLine].maxH + cY > this.page.maxY()) {
        if (currentLine > 0) {
          if (boxInfo.state === 1) {
            this.roundedRectUp(boxInfo.x, boxInfo.y, _options.w, (cY) - boxInfo.y, options.box.radius || 0)
              .lineWidth(0.3).stroke();
            boxInfo.state = 2;
          } else if (boxInfo.state === 2) {
            this.roundedRectMid(boxInfo.x, boxInfo.y, _options.w, (cY) - boxInfo.y, options.box.radius || 0)
              .lineWidth(0.3).stroke();
          }
        }

        this.addPage();
        if (currentLine > 0) {
          boxInfo.y = this.y;
          cY = this.y;
        } else {
          boxInfo.y = this.y;
          cY = this.y + _options.padding + _options.itemBox.padding * 2;
        }
      }

      this.fillColor(it.color);
      if (hasLabel) {
        _options.label.font && this.font(_options.label.font);
        _options.label.size && this.fontSize(_options.label.size);
        this.text(it.item.label, cX, cY,
          {align: it.item.align || 'left', width: it.w, height: it.hLabel});
        if (_options.debug) {
          this.rect(cX, cY, it.w, it.hLabel).lineWidth(0.1).stroke();
        }
      }
      _options.text.font && this.font(_options.text.font);
      _options.text.size && this.fontSize(_options.text.size);
      const optionsAux = {align: it.item.align || 'left', width: it.w, height: it.hText};
      if (it.item.link) {
        optionsAux.link = it.item.link || '';
        optionsAux.underline = true;
      }
      this.text(it.item.text, cX, cY + (hasLabel ? it.hLabel : 0),
        optionsAux);

      if (_options.debug) {
        this.rect(cX, cY + (hasLabel ? it.hLabel : 0), it.w, it.hText).lineWidth(0.1).stroke();
      }

      if (_options.itemBox.active) {
        const p = _options.itemBox.padding;
        this.rect(cX - p, cY + (hasLabel ? it.hLabel : 0) - p, it.w + p * 2, it.hText + p * 2).lineWidth(0.1).stroke();
      }
      cX += it.w + _options.padding + _options.itemBox.padding * 2;
    }
    cY += linesInfo[currentLine].maxH;


    if (boxInfo.state === 1) {
      this.roundedRect(boxInfo.x, boxInfo.y, _options.w, cY - boxInfo.y, options.box.radius || 0)
        .lineWidth(0.3).stroke();
    }
    if (boxInfo.state === 2) {
      this.roundedRectDown(boxInfo.x, boxInfo.y, _options.w, cY - boxInfo.y, options.box.radius || 0)
        .lineWidth(0.3).stroke();
    }

    this.setXY(_options.x, cY);
    this.noPageBreak = noPageBreak;
    // this.off('pageAdded', listenerAddPage);
    this.fillColor('black');
    return this;
  },

};
