/// <reference path="./index.d.ts" />

// Type definitions for `fcmpdfkit/standard-fonts/*`: the metrics of each of the
// 14 standard PDF fonts, to be registered with `registerStdFonts()` in the
// browser ES build. The Node builds load them by themselves.

declare module 'fcmpdfkit/standard-fonts/Courier' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Courier' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/CourierBold' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Courier-Bold' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/CourierBoldOblique' {
  const font: FcmPDFKit.StandardFontData & {
    readonly name: 'Courier-BoldOblique';
  };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/CourierOblique' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Courier-Oblique' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/Helvetica' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Helvetica' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/HelveticaBold' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Helvetica-Bold' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/HelveticaBoldOblique' {
  const font: FcmPDFKit.StandardFontData & {
    readonly name: 'Helvetica-BoldOblique';
  };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/HelveticaOblique' {
  const font: FcmPDFKit.StandardFontData & {
    readonly name: 'Helvetica-Oblique';
  };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/Symbol' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Symbol' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/TimesBold' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Times-Bold' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/TimesBoldItalic' {
  const font: FcmPDFKit.StandardFontData & {
    readonly name: 'Times-BoldItalic';
  };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/TimesItalic' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Times-Italic' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/TimesRoman' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'Times-Roman' };
  export = font;
}

declare module 'fcmpdfkit/standard-fonts/ZapfDingbats' {
  const font: FcmPDFKit.StandardFontData & { readonly name: 'ZapfDingbats' };
  export = font;
}
