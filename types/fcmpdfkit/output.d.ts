/// <reference path="./index.d.ts" />

// Type definitions for `fcmpdfkit/output`: experimental helpers that collect the
// output of a document. Call them before `doc.end()` so no output is missed.

declare module 'fcmpdfkit/output' {
  /**
   * Collects a PDF document into a Blob of type `application/pdf`.
   *
   * @experimental This API may change before it is stabilized.
   */
  export function toBlob(document: FcmPDFKit.PDFDocument): Promise<Blob>;

  /**
   * Collects a PDF document into a contiguous Uint8Array.
   *
   * @experimental This API may change before it is stabilized.
   */
  export function toBytes(document: FcmPDFKit.PDFDocument): Promise<Uint8Array>;
}
