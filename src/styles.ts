import { css } from 'lit';

export const cardStyles = css`
  :host {
    --hm-grid-columns: var(--grid-columns, 3);
  }

  ha-card {
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 0 16px;
  }
  .card-title {
    font-size: 18px;
    font-weight: 500;
    color: var(--primary-text-color);
  }

  .card-content {
    padding: 16px;
  }

  /* Filter bar */
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 0 12px 0;
  }
  .filter-chip {
    border: none;
    border-radius: 16px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    background: var(--secondary-background-color);
    color: var(--secondary-text-color);
    transition: all 0.15s ease;
  }
  .filter-chip:hover {
    background: var(--divider-color);
  }
  .filter-chip.active {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }

  /* Grid layout */
  .task-grid {
    display: grid;
    grid-template-columns: repeat(var(--hm-grid-columns), 1fr);
    gap: 12px;
  }

  /* List layout */
  .task-list {
    display: flex;
    flex-direction: column;
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

  /* Responsive */
  @media (max-width: 900px) {
    :host {
      --hm-grid-columns: 2;
    }
  }
  @media (max-width: 500px) {
    :host {
      --hm-grid-columns: 1;
    }
    .card-content {
      padding: 12px;
    }
    .task-grid {
      gap: 8px;
    }
  }
`;
