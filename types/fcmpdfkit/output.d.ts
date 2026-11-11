/// <reference path="./index.d.ts" />

// Type definitions for `fcmpdfkit/output`: helpers that collect the output of a
// document. Call them before `doc.end()` so no output is missed.

declare module 'fcmpdfkit/output' {
  /**
   * Collects a PDF document into a Blob of type `application/pdf`.
   */
  export function toBlob(document: FcmPDFKit.PDFDocument): Promise<Blob>;

  /**
   * Collects a PDF document into a contiguous Uint8Array.
   */
  export function toBytes(document: FcmPDFKit.PDFDocument): Promise<Uint8Array>;
}
