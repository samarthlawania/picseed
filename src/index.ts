// src/index.ts

import { PlaceholderOptions } from './types';
import { deterministicColor } from './utils';

// Conditional import for Node.js Canvas, to keep it an optional peer dependency
// We declare these as 'any' to avoid TypeScript errors when they might not be defined globally
let NodeCanvas: any;
let NodeImage: any;

/**
 * Renders an SVG string based on the given options.
 * @param options The placeholder options.
 * @returns The raw SVG string.
 */
function renderSvg(options: PlaceholderOptions): string {
  const { width, height, seed, text, textColor, backgroundColor } = options;

  const bgColor = backgroundColor || deterministicColor(seed);
  const displayText = text || `${width}x${height}`;
  const fgColor = textColor || '#ffffff'; // Default text color

  // Basic font size calculation: roughly 30% of the smaller dimension
  const fontSize = Math.min(width, height) * 0.3;

  // Ensure proper XML declaration for standalone SVG
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text
        x="50%"
        y="50%"
        font-family="sans-serif"
        font-size="${fontSize}"
        fill="${fgColor}"
        text-anchor="middle"
        dominant-baseline="middle"
      >${displayText}</text>
    </svg>
  `;
  return svgContent.trim(); // Remove leading/trailing whitespace
}

/**
 * Renders a PNG Data URL using HTML5 Canvas.
 * Throws an error if Canvas API is not available (e.g., in Node.js without a canvas library).
 * @param options The placeholder options.
 * @returns A Promise resolving to the PNG Data URL string.
 */
async function renderPng(options: PlaceholderOptions): Promise<string> {
  const { width, height, seed, text, textColor, backgroundColor } = options;

  let canvasElement: HTMLCanvasElement | any; // Type for canvas element

  // Check if running in Node.js
  if (typeof window === 'undefined') {
    // If in Node.js, ensure 'canvas' module is loaded
    if (!NodeCanvas) { // Load only once
      try {
        // Dynamically import to avoid direct dependency if not used
        const nodeCanvasModule = await import('canvas');
        NodeCanvas = nodeCanvasModule.Canvas;
        NodeImage = nodeCanvasModule.Image;
      } catch (e: any) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new Error(
            'Canvas API not available for PNG generation in Node.js. Please install "canvas" or "@napi-rs/canvas" as a peer dependency (e.g., `npm install canvas`), or use `format: "svg"`.'
          );
        }
        throw e; // Re-throw other errors
      }
    }
    // Now that NodeCanvas is loaded, create canvas for Node.js
    canvasElement = NodeCanvas.createCanvas(width, height);
  } else {
    // If in Browser, use native HTMLCanvasElement
    canvasElement = document.createElement('canvas');
    canvasElement.width = width;
    canvasElement.height = height;
  }

  const ctx = canvasElement.getContext('2d');
  if (!ctx) {
      throw new Error('Could not get 2D rendering context from canvas.');
  }

  const bgColor = backgroundColor || deterministicColor(seed);
  const displayText = text || `${width}x${height}`;
  const fgColor = textColor || '#ffffff';

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Draw text
  const fontSize = Math.min(width, height) * 0.3;
  ctx.font = `${fontSize}px sans-serif`; // Basic font, can be refined
  ctx.fillStyle = fgColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayText, width / 2, height / 2);

  // Convert to Data URL
  return canvasElement.toDataURL('image/png');
}

/**
 * Generates a unique, minimalist image placeholder as a Data URL.
 * Supports SVG and PNG formats.
 *
 * @param options - Configuration for the placeholder.
 * @returns A Promise resolving to the Data URL string.
 *
 * @example
 * // Generate a PNG placeholder
 * import { generatePlaceholder } from 'seed-image-placeholder';
 * async function createPng() {
 * const url = await generatePlaceholder({ width: 200, height: 150, seed: 'product-id-123' });
 * console.log(url); // data:image/png;base64,...
 * }
 * createPng();
 *
 * @example
 * // Generate an SVG placeholder with custom text and color
 * async function createSvg() {
 * const url = await generatePlaceholder({
 * width: 100,
 * height: 100,
 * seed: 'user-456',
 * format: 'svg',
 * text: 'U456',
 * backgroundColor: '#FFD700', // Gold
 * textColor: '#000000'
 * });
 * console.log(url); // data:image/svg+xml;charset=utf-8,...
 * }
 * createSvg();
 */
export async function generatePlaceholder(options: PlaceholderOptions): Promise<string> {
  const format = options.format || 'png'; // Default to PNG

  if (format === 'svg') {
    const svgString = renderSvg(options);
    // For SVG, URL encoding often results in smaller URLs and is more direct than Base64
    const encodedSvg = encodeURIComponent(svgString)
      .replace(/'/g, '%27') // Escape single quotes
      .replace(/"/g, '%22'); // Escape double quotes
    return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  } else if (format === 'png') {
    return await renderPng(options);
  } else {
    throw new Error(`Unsupported format: ${format}. Only 'png' and 'svg' are supported.`);
  }
}