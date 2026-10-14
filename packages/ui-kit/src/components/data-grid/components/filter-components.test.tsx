import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../../__test-utils__/render-with-user';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover/public.js';
import { messages } from '../messages';
import { FilterChip, FilterChipLabel } from './filter-chip';
import { FilterOptionsSearchInput } from './filter-options-search-input';
import { FilterPopoverContent } from './filter-popover-content';
import { FilterResetButton } from './filter-reset-button';
import { FilterScrollableWrapper } from './filter-scrollable-wrapper';

describe('FilterResetButton', () => {
  it('calls onClick from a button named Reset', async () => {
    const onClick = vi.fn();
    const { user } = render(<FilterResetButton onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: messages.filters.reset }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick while disabled', async () => {
    const onClick = vi.fn();
    const { user } = render(<FilterResetButton disabled onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: messages.filters.reset }));

    expect(screen.getByRole('button', { name: messages.filters.reset })).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('FilterOptionsSearchInput', () => {
  it('reports what is typed, under the default placeholder or the given one', async () => {
    const onValueChange = vi.fn();
    const { user, rerender } = render(
      <FilterOptionsSearchInput value="" onValueChange={onValueChange} />,
    );
    expect(screen.getByPlaceholderText(messages.filters.searchPlaceholder)).toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'a');
    expect(onValueChange).toHaveBeenCalledWith('a', expect.anything());

    rerender(
      <FilterOptionsSearchInput value="" onValueChange={onValueChange} placeholder="Find a role" />,
    );
    expect(screen.getByPlaceholderText('Find a role')).toBeInTheDocument();
  });
});

describe('FilterChip', () => {
  it('is a button that passes its props and ref on', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const { user } = render(
      <FilterChip ref={ref} onClick={onClick} aria-label="Status">
        Status
      </FilterChip>,
    );

    expect(screen.getByRole('button', { name: 'Status' })).toHaveAttribute('type', 'button');
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Status' }));

    await user.click(screen.getByRole('button', { name: 'Status' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('can be the trigger of a popover', async () => {
    const { user } = render(
      <Popover>
        <PopoverTrigger render={<FilterChip>Status</FilterChip>} />
        <PopoverContent>Options</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByRole('button', { name: 'Status' }));

    expect(await screen.findByText('Options')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Status' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('FilterChipLabel', () => {
  it('is a label for the input it wraps, which stays the control', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <FilterChipLabel>
        Draft
        <input type="checkbox" onChange={onChange} />
      </FilterChipLabel>,
    );

    await user.click(screen.getByText('Draft'));

    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole('checkbox', { name: 'Draft' })).toBeChecked();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('FilterPopoverContent and FilterScrollableWrapper', () => {
  it('cap the width of the content when asked, and name the scroll region by the role given', () => {
    render(
      <FilterPopoverContent maxInlineSize="318px">
        <FilterScrollableWrapper role="listbox">items</FilterScrollableWrapper>
      </FilterPopoverContent>,
    );

    expect(screen.getByRole('listbox').parentElement).toHaveStyle({ maxInlineSize: '318px' });
  });
});
