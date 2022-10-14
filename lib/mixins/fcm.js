
// This constant is used to approximate a symmetrical arc using a cubic
// Bezier curve.
const KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);
export default {
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

  roundedRectMid(x, y, w, h, r) {
    if (r == null) {
      r = 0;
    }
    r = Math.min(r, 0.5 * w, 0.5 * h); // amount to inset control points from corners (see `ellipse`)
    const c = r * (1.0 - KAPPA);
    this.moveTo(x, y + h);
    this.lineTo(x, y);
    this.moveTo(x+w, y + h);
    return this.lineTo(x+w, y);
  },

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


  drawRuler(x=0,y=0) {
    const xBase = this.x;
    const yBase = this.y;
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

    // console.log('this.page.maxY()', this.page.maxY());
    // console.log('this.usefulH', this.usefulH);

    this.x = xBase;
    this.y = yBase;
  }
};
