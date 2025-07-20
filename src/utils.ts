// src/utils.ts

/**
 * Generates a simple, non-cryptographic hash from a string.
 * Used to create a deterministic number from the `seed`.
 * @param str The input string.
 * @returns A positive 32-bit integer hash.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash); // Ensure positive hash
}

/**
 * Generates a deterministic HSL color string based on a given seed.
 * @param seed The input string to base the color on.
 * @returns An HSL color string (e.g., "hsl(123, 70%, 50%)").
 */
export function deterministicColor(seed: string): string {
  const hash = hashString(seed);
  const hue = hash % 360; // Hue from 0 to 359 degrees
  const saturation = 70; // Keep saturation consistent for vibrancy
  const lightness = 50; // Keep lightness consistent for balance
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}