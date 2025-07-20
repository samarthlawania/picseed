export interface PlaceholderOptions {
  width: number;
  height: number;
  seed: string;
  format?: 'svg' | 'png'; // Keeping it simple for MVP
  text?: string;
  textColor?: string;
  backgroundColor?: string; // Allow overriding deterministic color
}