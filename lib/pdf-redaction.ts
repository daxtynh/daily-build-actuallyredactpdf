import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

export interface RedactionArea {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextMatch {
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PatternMatch extends TextMatch {
  pattern: string;
  patternType: 'ssn' | 'email' | 'phone' | 'credit_card';
}

// Common sensitive data patterns
export const PATTERNS = {
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
};

/**
 * ActuallyRedactPDF - True PDF Redaction Engine
 *
 * This engine TRULY removes text by flattening pages to images.
 * The text is not just covered up - it's completely removed from the document.
 *
 * How it works:
 * 1. Render the PDF page to a canvas at high resolution
 * 2. Draw black rectangles over the redaction areas on the canvas
 * 3. Convert the canvas to an image (PNG)
 * 4. Replace the PDF page content with the flattened image
 *
 * The result: The original text vectors are GONE. There's nothing to search,
 * copy, or extract - just pixels.
 */

export async function redactPdfByAreas(
  pdfBytes: ArrayBuffer,
  redactionAreas: RedactionArea[],
  renderScale: number = 2 // Higher = better quality but larger file
): Promise<Uint8Array> {
  // Load the PDF with pdf.js for rendering
  const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

  // Create a new PDF document with pdf-lib
  const newPdfDoc = await PDFDocument.create();

  // Group redactions by page for efficiency
  const redactionsByPage = new Map<number, RedactionArea[]>();
  for (const area of redactionAreas) {
    const existing = redactionsByPage.get(area.pageIndex) || [];
    existing.push(area);
    redactionsByPage.set(area.pageIndex, existing);
  }

  // Process each page
  for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
    const pageIndex = pageNum - 1;
    const page = await pdfJsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });

    // Create a canvas to render the page
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    // Render the PDF page to the canvas
    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    // Draw black rectangles over redaction areas
    const pageRedactions = redactionsByPage.get(pageIndex) || [];
    ctx.fillStyle = '#000000';

    for (const area of pageRedactions) {
      // Scale the coordinates to match the render scale
      const scaledX = area.x * renderScale;
      const scaledY = area.y * renderScale;
      const scaledWidth = area.width * renderScale;
      const scaledHeight = area.height * renderScale;

      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
    }

    // Convert canvas to PNG image data
    const imageDataUrl = canvas.toDataURL('image/png', 1.0);
    const imageBytes = dataUrlToBytes(imageDataUrl);

    // Embed the image in the new PDF
    const pngImage = await newPdfDoc.embedPng(imageBytes);

    // Get original page dimensions
    const originalViewport = page.getViewport({ scale: 1 });

    // Add a page with the original dimensions
    const newPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);

    // Draw the flattened image on the new page
    newPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height,
    });
  }

  // Strip all metadata
  newPdfDoc.setTitle('');
  newPdfDoc.setAuthor('');
  newPdfDoc.setSubject('');
  newPdfDoc.setKeywords([]);
  newPdfDoc.setProducer('ActuallyRedactPDF - True Redaction');
  newPdfDoc.setCreator('ActuallyRedactPDF');

  return await newPdfDoc.save();
}

/**
 * Search for text in a PDF and return match locations
 */
export async function findTextInPdf(
  pdfBytes: ArrayBuffer,
  searchTerm: string,
  caseSensitive: boolean = false
): Promise<TextMatch[]> {
  const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const matches: TextMatch[] = [];

  const searchTermLower = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
    const page = await pdfJsDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    for (const item of textContent.items) {
      if (!('str' in item)) continue;

      const textItem = item as { str: string; transform: number[]; width: number; height: number };
      const text = caseSensitive ? textItem.str : textItem.str.toLowerCase();

      if (text.includes(searchTermLower)) {
        // Get the position from the transform matrix
        // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
        const x = textItem.transform[4];
        const y = viewport.height - textItem.transform[5]; // Convert to top-left origin

        matches.push({
          pageIndex: pageNum - 1,
          text: textItem.str,
          x: x,
          y: y - (textItem.height || 12), // Adjust for text height
          width: textItem.width || 100,
          height: (textItem.height || 12) + 4, // Add padding
        });
      }
    }
  }

  return matches;
}

/**
 * Find all instances of a search term and return redaction areas
 */
export async function findAndCreateRedactions(
  pdfBytes: ArrayBuffer,
  searchTerm: string,
  caseSensitive: boolean = false
): Promise<RedactionArea[]> {
  const matches = await findTextInPdf(pdfBytes, searchTerm, caseSensitive);

  return matches.map(match => ({
    pageIndex: match.pageIndex,
    x: match.x,
    y: match.y,
    width: match.width,
    height: match.height,
  }));
}

/**
 * Detect sensitive patterns in a PDF (SSN, email, phone, credit card)
 */
export async function detectSensitivePatterns(
  pdfBytes: ArrayBuffer,
  patternTypes: ('ssn' | 'email' | 'phone' | 'credit_card')[] = ['ssn', 'email', 'phone', 'credit_card']
): Promise<PatternMatch[]> {
  const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const matches: PatternMatch[] = [];

  for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
    const page = await pdfJsDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    // Build full text with position mapping
    let fullText = '';
    const positionMap: { start: number; end: number; item: { transform: number[]; width: number; height: number } }[] = [];

    for (const item of textContent.items) {
      if (!('str' in item)) continue;

      const textItem = item as { str: string; transform: number[]; width: number; height: number };
      const start = fullText.length;
      fullText += textItem.str + ' ';
      positionMap.push({
        start,
        end: fullText.length - 1,
        item: textItem,
      });
    }

    // Search for each pattern type
    for (const patternType of patternTypes) {
      const regex = new RegExp(PATTERNS[patternType].source, 'g');
      let match;

      while ((match = regex.exec(fullText)) !== null) {
        // Find which text item contains this match
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        // Find all items that overlap with this match
        for (const pos of positionMap) {
          if (pos.start <= matchStart && pos.end >= matchStart) {
            const x = pos.item.transform[4];
            const y = viewport.height - pos.item.transform[5];

            matches.push({
              pageIndex: pageNum - 1,
              text: match[0],
              pattern: match[0],
              patternType,
              x: x,
              y: y - (pos.item.height || 12),
              width: pos.item.width || 100,
              height: (pos.item.height || 12) + 4,
            });
            break;
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Create redaction areas from pattern matches
 */
export function patternMatchesToRedactions(matches: PatternMatch[]): RedactionArea[] {
  return matches.map(match => ({
    pageIndex: match.pageIndex,
    x: match.x,
    y: match.y,
    width: match.width,
    height: match.height,
  }));
}

/**
 * Sanitize a PDF by removing all metadata
 */
export async function sanitizePdf(pdfBytes: ArrayBuffer): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Remove all metadata
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('ActuallyRedactPDF - Sanitized');
  pdfDoc.setCreator('ActuallyRedactPDF');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  return await pdfDoc.save({
    useObjectStreams: false,
  });
}

/**
 * Verify that a PDF has no extractable text in the given areas
 * Returns true if redaction was successful (no text found in areas)
 */
export async function verifyRedaction(
  pdfBytes: ArrayBuffer,
  redactionAreas: RedactionArea[]
): Promise<{ success: boolean; extractedText: string[] }> {
  const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const extractedText: string[] = [];

  for (const area of redactionAreas) {
    if (area.pageIndex >= pdfJsDoc.numPages) continue;

    const page = await pdfJsDoc.getPage(area.pageIndex + 1);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    for (const item of textContent.items) {
      if (!('str' in item)) continue;

      const textItem = item as { str: string; transform: number[]; width: number; height: number };
      const x = textItem.transform[4];
      const y = viewport.height - textItem.transform[5];

      // Check if this text item overlaps with the redaction area
      if (
        x < area.x + area.width &&
        x + (textItem.width || 0) > area.x &&
        y < area.y + area.height &&
        y + (textItem.height || 12) > area.y
      ) {
        extractedText.push(textItem.str);
      }
    }
  }

  return {
    success: extractedText.length === 0,
    extractedText,
  };
}

/**
 * Get PDF info including whether it has extractable text
 */
export async function getPdfInfo(pdfBytes: ArrayBuffer): Promise<{
  pageCount: number;
  title: string | undefined;
  author: string | undefined;
  hasMetadata: boolean;
  hasExtractableText: boolean;
  textSample: string;
}> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

  const title = pdfDoc.getTitle();
  const author = pdfDoc.getAuthor();
  const hasMetadata = !!(title || author || pdfDoc.getSubject() || pdfDoc.getKeywords()?.length);

  // Check for extractable text on first page
  let textSample = '';
  let hasExtractableText = false;

  if (pdfJsDoc.numPages > 0) {
    const page = await pdfJsDoc.getPage(1);
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        hasExtractableText = true;
        textSample += item.str + ' ';
        if (textSample.length > 200) break;
      }
    }
  }

  return {
    pageCount: pdfDoc.getPageCount(),
    title,
    author,
    hasMetadata,
    hasExtractableText,
    textSample: textSample.trim().substring(0, 200),
  };
}

/**
 * Download a PDF file
 */
export function downloadPdf(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert a data URL to a Uint8Array
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
