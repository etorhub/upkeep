import { css } from 'lit';

export const cardStyles = css`
  :host {
    display: block;
    --hm-grid-columns: var(--grid-columns, 3);
    container: upkeep / inline-size;
  }

  ha-card {
    overflow: clip;
  }

  .card-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    padding: 16px 20px 12px;
  }
  .card-title {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
    color: var(--primary-text-color);
    text-wrap: balance;
  }
  .card-subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--secondary-text-color);
    text-wrap: pretty;
  }

  .card-content {
    padding: 16px 16px 16px;
  }
  .card-header ~ .card-content,
  .filter-bar ~ .card-content {
    padding-top: 0;
  }
  .card-content.grid {
    padding-inline: 16px;
  }
  .card-content.list {
    padding: 0 0 4px;
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    flex-wrap: balance;
    gap: 8px;
    padding: 0 20px 16px;
  }
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-block-size: 44px;
    padding: 0 6px 0 16px;
    border: 1px solid var(--divider-color);
    border-radius: 22px;
    background: transparent;
    color: var(--primary-text-color);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .filter-chip:hover {
    background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
  }
  .filter-chip.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: #102027;
  }
  .filter-chip:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  .filter-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 26px;
    block-size: 26px;
    padding: 0 7px;
    box-sizing: border-box;
    border-radius: 13px;
    background: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
    color: var(--secondary-text-color);
    font-size: 12px;
  }
  .filter-chip.active .filter-count {
    background: rgb(16 32 39 / 16%);
    color: inherit;
  }

  .task-grid {
    display: grid;
    grid-template-columns: repeat(
      auto-fit,
      minmax(min(100%, max(220px, calc(100% / var(--hm-grid-columns)))), 1fr)
    );
    gap: 12px;
    align-items: stretch;
  }
  .task-grid > * {
    min-inline-size: 0;
  }

  .task-list {
    display: flex;
    flex-direction: column;
  }

  @container upkeep (inline-size < 480px) {
    .card-header {
      padding: 14px 16px 12px;
    }
    .filter-bar {
      flex-wrap: nowrap;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      padding-inline: 16px;
    }
    .filter-chip {
      flex-shrink: 0;
    }
    .task-grid {
      grid-template-columns: repeat(min(2, var(--hm-grid-columns)), minmax(0, 1fr));
      gap: 8px;
    }
    .card-content.grid {
      padding-inline: 12px;
    }
  }

  /* Compact layout */
  .task-compact {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* Empty state */
  .empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--secondary-text-color);
    font-size: 14px;
  }
  .empty ha-icon {
    --mdc-icon-size: 48px;
    color: var(--divider-color);
    margin-bottom: 12px;
    display: block;
  }

  /* Skeleton */
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  .skeleton-tile {
    border-radius: 12px;
    height: 140px;
    background: linear-gradient(
      90deg,
      var(--secondary-background-color) 25%,
      var(--divider-color) 50%,
      var(--secondary-background-color) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
`;
