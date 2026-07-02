/**
 * Signet "Stone + Ink" design tokens.
 *
 * Palette:
 *   - Base background: #0d0d0d (stone black)
 *   - Surface / cards: rgba(18, 20, 28, 0.65) with glass
 *   - Primary accent: #a78bfa (cool violet — law, trust, notary seal)
 *   - Secondary: #f0f0f0 (off‑white — ink on stone)
 *   - Success: #4ade80 (emerald — "attested")
 *   - Borders: rgba(255, 255, 255, 0.06)
 *
 * These are exported as a CSS-variable object so consumers can inject them
 * into a `signet-widget` wrapper without colliding with their own styles.
 */

export const SIGNET_CSS_VARS = {
  '--signet-bg': '#0d0d0d',
  '--signet-surface': 'rgba(18, 20, 28, 0.65)',
  '--signet-surface-hover': 'rgba(24, 26, 34, 0.75)',
  '--signet-border': 'rgba(255, 255, 255, 0.06)',
  '--signet-border-hover': 'rgba(167, 139, 250, 0.25)',
  '--signet-accent': '#a78bfa',
  '--signet-accent-dim': 'rgba(167, 139, 250, 0.15)',
  '--signet-accent-glow': 'rgba(167, 139, 250, 0.35)',
  '--signet-text-primary': 'rgba(255, 255, 255, 0.92)',
  '--signet-text-secondary': 'rgba(255, 255, 255, 0.60)',
  '--signet-text-tertiary': 'rgba(255, 255, 255, 0.30)',
  '--signet-success': '#4ade80',
  '--signet-success-dim': 'rgba(74, 222, 128, 0.15)',
  '--signet-error': '#f87171',
  '--signet-error-dim': 'rgba(248, 113, 113, 0.15)',
  '--signet-warning': '#fbbf24',
  '--signet-warning-dim': 'rgba(251, 191, 36, 0.15)',
  '--signet-radius': '12px',
  '--signet-radius-sm': '8px',
  '--signet-font-mono': "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
  '--signet-font-body': "'Inter', system-ui, -apple-system, sans-serif",
} as const;

export type SignetCssVarKey = keyof typeof SIGNET_CSS_VARS;

/** Convert the token map to a flat CSS custom-property string for inline style injection. */
export function cssVarBlock(): string {
  const vars = Object.entries(SIGNET_CSS_VARS)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `:root {\n${vars}\n}`;
}
