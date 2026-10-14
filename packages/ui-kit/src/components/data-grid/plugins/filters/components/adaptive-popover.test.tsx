import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import styles from './adaptive-popover.module.css';
import { AdaptivePopover } from './adaptive-popover';

describe('AdaptivePopover', () => {
  it('draws the popup with the class that lets it grow to its content', () => {
    render(
      <AdaptivePopover
        open
        onOpenChange={vi.fn()}
        trigger={<button type="button">Open</button>}
        minInlineSize="400px"
      >
        <p>Content</p>
      </AdaptivePopover>,
    );

    // The rules the class carries are pinned in adaptive-popover.module.css.test.ts.
    expect(screen.getByText('Content').closest('[role="dialog"]')).toHaveClass(styles.popover);
  });

  it('asks for the minimum width on what it holds, not on the popup', () => {
    render(
      <AdaptivePopover
        open
        onOpenChange={vi.fn()}
        trigger={<button type="button">Open</button>}
        minInlineSize="400px"
      >
        <p>Content</p>
      </AdaptivePopover>,
    );

    expect(screen.getByText('Content').parentElement).toHaveStyle({ minInlineSize: '400px' });
  });
});
