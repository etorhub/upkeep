import { svg, type TemplateResult } from 'lit';

/** Brand accent. Override per surface with `--upkeep-accent`. */
export const BRAND_ACCENT = '#11a387';

/**
 * The Upkeep mark: a roof over a «u» that fills as the task comes due.
 * The roof follows the text colour; the «u» uses the brand accent.
 * Decorative by default, so the text next to it stays the accessible name.
 */
export function upkeepMark(size: number, fill = 64): TemplateResult {
  const cup = 'M62 136 V158 A66 66 0 0 0 194 158 V136';
  return svg`
    <svg
      width=${size}
      height=${size}
      viewBox="22 26 212 212"
      aria-hidden="true"
      focusable="false"
      style="display:block;flex:none"
    >
      <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="28">
        <path d="M36 114 L128 40 L220 114" stroke="currentColor" />
        <path d=${cup} stroke="var(--upkeep-accent, ${BRAND_ACCENT})" stroke-opacity="0.28" />
        <path
          d=${cup}
          pathLength="100"
          stroke="var(--upkeep-accent, ${BRAND_ACCENT})"
          stroke-dasharray="${fill} 100"
        />
      </g>
    </svg>
  `;
}
