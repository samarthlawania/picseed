// src/__tests__/index.test.ts

import { generatePlaceholder } from '../index';
import { hashString, deterministicColor } from '../utils';

// --- 🛠️ MOCKS ---

// 1. Mock for the 2D rendering context's methods (the object returned by getContext)
// This object will hold Jest mock functions for fillRect, fillText, etc.
const mockCanvasContextMethods = {
  fillRect: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  // These properties are directly set by the code, so we need them on the mock object.
  // Jest's `mockClear()` only clears call history, not property values, so they're reset in beforeEach.
  font: '',
  fillStyle: '',
  textAlign: '',
  textBaseline: '',
};

// 2. Mock for the `getContext` method itself. This is the function that will be assigned to canvas.getContext.
const mockGetContextMethod = jest.fn(() => mockCanvasContextMethods);

// 3. Mock for the `toDataURL` method on the canvas element.
const mockToDataURLMethod = jest.fn(() => 'data:image/png;base64,mocked-png-data');

// 4. Mock for the HTMLCanvasElement structure (used for browser-like environments)
const mockCanvasElement = {
  getContext: mockGetContextMethod, // Assign the mock method here
  toDataURL: mockToDataURLMethod,   // Assign the mock method here
  width: 0,
  height: 0,
};

// Mock `document.createElement` to return our mock canvas element when 'canvas' is requested
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvasElement;
      }
      return null;
    }),
  },
  writable: true,
  configurable: true,
});

// Mock `window` object for browser environment detection.
// By explicitly setting window to `undefined`, we ensure the Node.js path in `renderPng` is always taken during Jest tests.
Object.defineProperty(global, 'window', {
  value: undefined,
  writable: true,
  configurable: true,
});

// Mock the 'canvas' package for Node.js usage.
// This mock intercepts `import('canvas')` calls in `renderPng`.
jest.mock('canvas', () => ({
  Canvas: {
    createCanvas: jest.fn((width: number, height: number) => {
      // Return a mock object mimicking Node.js canvas.createCanvas result
      const nodeCanvasInstance = {
        getContext: mockGetContextMethod, // Assign the same mock method here
        toDataURL: mockToDataURLMethod,   // Assign the same mock method here
        width,
        height,
      };
      return nodeCanvasInstance;
    }),
  },
  Image: class {}, // Minimal mock for Image constructor in Node.js, if your code used it.
}));

// --- 🔬 TESTS ---

describe('hashString', () => {
  it('should return a consistent hash for the same string', () => {
    expect(hashString('test')).toBe(hashString('test'));
    expect(hashString('hello')).not.toBe(hashString('world'));
  });

  it('should return a positive hash', () => {
    expect(hashString('negative')).toBeGreaterThanOrEqual(0);
  });
});

describe('deterministicColor', () => {
  it('should return a consistent HSL color for the same seed', () => {
    expect(deterministicColor('user1')).toBe(deterministicColor('user1'));
    expect(deterministicColor('user1')).not.toBe(deterministicColor('user2'));
  });

  it('should return a valid HSL string', () => {
    const color = deterministicColor('test');
    expect(color).toMatch(/^hsl\(\d{1,3}, \d{1,3}%, \d{1,3}%\)$/);
  });
});

describe('generatePlaceholder', () => {
  // Reset all mocks and properties before each test to ensure isolation
  beforeEach(() => {
    // Clear mocks for context methods
    mockCanvasContextMethods.fillRect.mockClear();
    mockCanvasContextMethods.fillText.mockClear();
    mockCanvasContextMethods.measureText.mockClear();

    // Clear mock for getContext method itself
    mockGetContextMethod.mockClear();

    // Clear mock for toDataURL method
    mockToDataURLMethod.mockClear();

    // Clear document.createElement mock
    (global.document.createElement as jest.Mock).mockClear();

    // Re-import the mocked 'canvas' module within beforeEach to ensure fresh mock state for createCanvas
    const { Canvas: MockNodeCanvasModule } = require('canvas');
    (MockNodeCanvasModule.createCanvas as jest.Mock).mockClear();

    // Reset direct properties on mockCanvasContextMethods as they are not cleared by mockClear()
    mockCanvasContextMethods.font = '';
    mockCanvasContextMethods.fillStyle = '';
    mockCanvasContextMethods.textAlign = '';
    mockCanvasContextMethods.textBaseline = '';
  });

  // --- SVG Tests ---

  it('should generate an SVG data URL when format is svg', async () => {
    const dataUrl = await generatePlaceholder({ width: 100, height: 100, seed: 'test-svg', format: 'svg' });
    expect(dataUrl).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    const decodedSvg = decodeURIComponent(dataUrl.split(',')[1]);
    expect(decodedSvg).toContain('<svg');
    expect(decodedSvg).toContain('width="100"');
    expect(decodedSvg).toContain('height="100"');
    expect(decodedSvg).toContain(`fill="${deterministicColor('test-svg')}"`);
  });

  it('should use provided text for SVG if available', async () => {
    const dataUrl = await generatePlaceholder({ width: 100, height: 100, seed: 'abc', text: 'XYZ', format: 'svg' });
    const decodedSvg = decodeURIComponent(dataUrl.split(',')[1]);
    expect(decodedSvg).toContain('>XYZ<');
    expect(decodedSvg).not.toContain('>100x100<');
  });

  it('should use default dimensions as text for SVG if no text is provided', async () => {
    const dataUrl = await generatePlaceholder({ width: 75, height: 75, seed: 'def', format: 'svg' });
    const decodedSvg = decodeURIComponent(dataUrl.split(',')[1]);
    expect(decodedSvg).toContain('>75x75<');
  });

  it('should apply custom text and background colors for SVG', async () => {
    const dataUrl = await generatePlaceholder({
      width: 100,
      height: 100,
      seed: 'color_test',
      text: 'Hello',
      textColor: '#FF0000',
      backgroundColor: 'blue',
      format: 'svg',
    });
    const decodedSvg = decodeURIComponent(dataUrl.split(',')[1]);
    expect(decodedSvg).toContain('fill="#FF0000"');
    expect(decodedSvg).toContain('fill="blue"');
  });

  // --- PNG Tests ---

  it('should generate a PNG data URL by default (using canvas)', async () => {
    const dataUrl = await generatePlaceholder({ width: 100, height: 100, seed: 'pngtest-default' });
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);

    // Assert that the appropriate canvas creation method was called (Node.js path)
    const { Canvas: MockNodeCanvasModule } = require('canvas');
    expect(MockNodeCanvasModule.createCanvas).toHaveBeenCalledWith(100, 100);

    // Assert that getContext was called on the created canvas mock
    expect(mockGetContextMethod).toHaveBeenCalledWith('2d');
    expect(mockCanvasContextMethods.fillRect).toHaveBeenCalled();
    expect(mockCanvasContextMethods.fillText).toHaveBeenCalled();
    expect(mockToDataURLMethod).toHaveBeenCalledWith('image/png');
  });

  it('should generate a PNG data URL when format is specified as png', async () => {
    const dataUrl = await generatePlaceholder({ width: 100, height: 100, seed: 'pngtest-explicit', format: 'png' });
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    const { Canvas: MockNodeCanvasModule } = require('canvas');
    expect(MockNodeCanvasModule.createCanvas).toHaveBeenCalledWith(100, 100);
    expect(mockGetContextMethod).toHaveBeenCalledWith('2d');
  });

  it('should use provided text for PNG if available', async () => {
    await generatePlaceholder({ width: 100, height: 100, seed: 'pngtext', text: 'PNGA', format: 'png' });
    expect(mockCanvasContextMethods.fillText).toHaveBeenCalledWith('PNGA', expect.any(Number), expect.any(Number));
  });

  it('should use default dimensions as text for PNG if no text is provided', async () => {
    await generatePlaceholder({ width: 75, height: 75, seed: 'pngdefaulttext', format: 'png' });
    expect(mockCanvasContextMethods.fillText).toHaveBeenCalledWith('75x75', expect.any(Number), expect.any(Number));
  });

  it('should apply custom text and background colors for PNG', async () => {
    await generatePlaceholder({
      width: 100,
      height: 100,
      seed: 'png_color_test',
      textColor: 'purple',
      backgroundColor: 'green',
      format: 'png',
    });
    // This assertion checks the state of the mock *after* all assignments in renderPng.
    // fillStyle is first set to 'green', then overwritten to 'purple'.
    // So, at this point, it should be 'purple'.
    expect(mockCanvasContextMethods.fillStyle).toBe('purple'); // Text color is the final value
    expect(mockCanvasContextMethods.fillRect).toHaveBeenCalled(); // Ensure fillRect was called
    expect(mockCanvasContextMethods.fillText).toHaveBeenCalled(); // Ensure fillText was called
  });

  it('should throw error for unsupported format', async () => {
    await expect(
      generatePlaceholder({ width: 100, height: 100, seed: 'invalid', format: 'jpeg' as any })
    ).rejects.toThrow("Unsupported format: jpeg. Only 'png' and 'svg' are supported.");
  });
});