import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { declarationMap, extractRules } from '../../__test-utils__/css-rules';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from './combobox';
import styles from './combobox.module.css';

afterEach(cleanup);

// Parsed once from the raw CSS source, same shape as select.test.tsx — only
// used here to confirm the module actually defines a class this test
// asserts on, not to read declared values (no padding-ownership test needed
// for this file).
const cssPath = join(dirname(fileURLToPath(import.meta.url)), 'combobox.module.css');
const cssRules = extractRules(readFileSync(cssPath, 'utf8'));

const REGIONS = ['Europe', 'Americas'];

function renderCombobox(rootProps: Parameters<typeof Combobox>[0] = {}) {
  return render(
    <Combobox items={REGIONS} {...rootProps}>
      <ComboboxInput aria-label="Region" placeholder="Pick a region" />
      <ComboboxContent>
        <ComboboxEmpty>No regions found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>,
  );
}

describe('Combobox', () => {
  it('renders a closed input with the placeholder and kit classes', () => {
    renderCombobox();
    const input = screen.getByRole('combobox', { name: 'Region' });
    expect(input.className).toContain(styles.input);
    expect(input.getAttribute('placeholder')).toBe('Pick a region');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens the popup via the trigger button', () => {
    renderCombobox();
    const trigger = screen.getByRole('button', { name: 'Toggle options' });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('filters items as the user types, and applies the kit item class', () => {
    renderCombobox({ defaultOpen: true });
    const input = screen.getByRole('combobox', { name: 'Region' });
    fireEvent.change(input, { target: { value: 'Euro' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toBe('Europe');
    expect(options[0]?.className).toContain(styles.item);
  });

  it('renders the Empty part when filtering matches nothing', () => {
    renderCombobox({ defaultOpen: true });
    const input = screen.getByRole('combobox', { name: 'Region' });
    fireEvent.change(input, { target: { value: 'zz-no-match' } });
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByText('No regions found.').className).toContain(styles.empty);
  });

  it('selects an option and reports through onValueChange', () => {
    const onValueChange = vi.fn();
    renderCombobox({ defaultOpen: true, onValueChange });
    const option = screen.getByRole('option', { name: 'Europe' });
    // Base UI commits a mouse selection only when the click started on the
    // item (guards against a stray pointerup landing on an item that wasn't
    // clicked), so the pointerdown must precede the click — same guard as
    // select.test.tsx's equivalent case.
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[0]).toBe('Europe');
  });

  it('closes the popup on Escape', () => {
    renderCombobox({ defaultOpen: true });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Region' }), {
      key: 'Escape',
      code: 'Escape',
    });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('applies the kit group/label/separator classes', () => {
    render(
      <Combobox items={[{ value: 'eu', label: 'Europe' }]} defaultOpen>
        <ComboboxInput aria-label="Region" />
        <ComboboxContent>
          <ComboboxEmpty>No regions found.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxGroup>
              <ComboboxLabel>Europe</ComboboxLabel>
              <ComboboxItem value="eu">Frankfurt</ComboboxItem>
            </ComboboxGroup>
            <ComboboxSeparator />
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByText('Europe', { selector: `.${styles.groupLabel}` })).toBeTruthy();
    const separator = document.querySelector(`.${styles.separator}`);
    expect(separator).not.toBeNull();
  });

  it('portals the popup into a provided container', () => {
    const container = document.createElement('div');
    container.id = 'themed-section';
    document.body.appendChild(container);
    render(
      <Combobox items={REGIONS} defaultOpen>
        <ComboboxInput aria-label="Region" />
        <ComboboxContent container={container}>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    const listbox = screen.getByRole('listbox');
    expect(container.contains(listbox)).toBe(true);
    container.remove();
  });

  // Two independent renders, not one render()+rerender(): Base UI warns
  // (correctly) if a combobox switches between uncontrolled and controlled
  // across its own lifetime, which passing `value` on a second render of the
  // same instance would trigger.
  it('shows no clear button while uncontrolled and empty', () => {
    render(
      <Combobox items={REGIONS}>
        <ComboboxInput aria-label="Region" showClear />
        <ComboboxContent>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByRole('button', { name: 'Toggle options' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear value' })).toBeNull();
  });

  it('shows the clear button once a value is chosen', () => {
    render(
      <Combobox items={REGIONS} defaultValue="Europe">
        <ComboboxInput aria-label="Region" showClear />
        <ComboboxContent>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    // Clear mounts (Base UI's default keepMounted={false} means it isn't in
    // the DOM at all without a value) — CSS then hides the trigger in the
    // same slot (see combobox.module.css's :has() rule, checked separately
    // below since jsdom computes no layout to observe it through).
    expect(screen.getByRole('button', { name: 'Clear value' })).toBeTruthy();
  });

  // The three buttons this component renders are icon-only, so these
  // strings ARE their accessible names — hardcoding them made an English
  // combobox the only one the kit could ship.
  it('takes an override for every label it renders itself', () => {
    render(
      <Combobox multiple items={REGIONS} defaultValue={['Europe']}>
        <ComboboxChips>
          <ComboboxChip removeLabel="Entfernen">Europe</ComboboxChip>
          <ComboboxChipsInput aria-label="Region" />
        </ComboboxChips>
        <ComboboxInput
          aria-label="Region"
          showClear
          toggleLabel="Optionen umschalten"
          clearLabel="Auswahl löschen"
        />
      </Combobox>,
    );
    expect(screen.getByRole('button', { name: 'Optionen umschalten' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Auswahl löschen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entfernen' })).toBeTruthy();
  });

  it('adds and removes a chip in multi-select mode', () => {
    const onValueChange = vi.fn();

    function MultiSelect() {
      const anchor = useComboboxAnchor();
      return (
        <Combobox multiple items={REGIONS} onValueChange={onValueChange} defaultOpen>
          <ComboboxChips ref={anchor}>
            <ComboboxValue>
              {(values: string[]) => (
                <>
                  {values.map((value) => (
                    <ComboboxChip key={value}>{value}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput aria-label="Region" />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      );
    }

    render(<MultiSelect />);
    const option = screen.getByRole('option', { name: 'Europe' });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[0]).toEqual(['Europe']);

    const chip = screen.getByText('Europe', { selector: `.${styles.chip}` });
    expect(chip).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls[1]?.[0]).toEqual([]);
  });
});

/*
 * The select-style form: the trigger is the visible field and the search
 * input lives inside the popup. Rendered here the way combobox.md shows it,
 * single and multiple.
 */
function renderSelectStyle(rootProps: Parameters<typeof Combobox>[0] = {}) {
  return render(
    <Combobox items={REGIONS} {...rootProps}>
      <ComboboxTrigger variant="select" aria-label="Region">
        <ComboboxValue placeholder="Pick a region" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput showTrigger={false} aria-label="Search regions" />
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>,
  );
}

// A real press is pointerdown then mousedown; the trigger records the pointer
// type from the first before it opens on the second. It opens on an animation
// frame, not synchronously, so a test that asserts the popup stayed shut has
// to wait one out first or it would pass whatever the code does.
async function press(element: Element) {
  fireEvent.pointerDown(element, { pointerType: 'mouse' });
  fireEvent.mouseDown(element);
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
}

function renderMultipleSelectStyle(rootProps: Parameters<typeof Combobox>[0] = {}) {
  return render(
    <Combobox multiple items={REGIONS} {...rootProps}>
      <ComboboxTrigger variant="select" render={<div />} nativeButton={false} aria-label="Regions">
        <ComboboxChips>
          <ComboboxValue>
            {(values: string[]) =>
              values.map((value) => (
                <ComboboxChip key={value} removeLabel={`Remove ${value}`}>
                  {value}
                </ComboboxChip>
              ))
            }
          </ComboboxValue>
        </ComboboxChips>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput showTrigger={false} aria-label="Search regions" />
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>,
  );
}

describe('Combobox select-style trigger', () => {
  it('renders the value then a chevron on a trigger of its own, not the corner icon button', () => {
    renderSelectStyle({ defaultValue: 'Europe' });
    const trigger = screen.getByRole('combobox', { name: 'Region' });
    expect(trigger.className).toContain(styles.selectTrigger);
    expect(trigger.className).not.toContain(styles.inputTrigger);
    expect(trigger.textContent).toBe('Europe');
    // The chevron is the trigger's own and trails the value.
    expect(trigger.lastElementChild?.tagName.toLowerCase()).toBe('svg');
    expect(trigger.firstElementChild?.className).toContain(styles.selectValue);
  });

  it('keeps the default trigger the absolutely positioned corner button', () => {
    render(
      <Combobox items={REGIONS}>
        <ComboboxInput aria-label="Region" showTrigger={false}>
          <ComboboxTrigger aria-label="Show regions" />
        </ComboboxInput>
      </Combobox>,
    );
    const trigger = screen.getByRole('button', { name: 'Show regions' });
    expect(trigger.className).toContain(styles.inputTrigger);
    expect(trigger.className).not.toContain(styles.selectTrigger);
  });

  it('shows the placeholder, flags it, and swaps it for the chosen value', () => {
    renderSelectStyle();
    const trigger = screen.getByRole('combobox', { name: 'Region' });
    expect(trigger.textContent).toBe('Pick a region');
    // Base UI's placeholder state, which the muted tone selects on.
    expect(trigger.hasAttribute('data-placeholder')).toBe(true);
    cleanup();
    renderSelectStyle({ defaultValue: 'Americas' });
    const chosen = screen.getByRole('combobox', { name: 'Region' });
    expect(chosen.textContent).toBe('Americas');
    expect(chosen.hasAttribute('data-placeholder')).toBe(false);
  });

  it('opens a popup that holds the search input and filters through it', async () => {
    renderSelectStyle();
    await press(screen.getByRole('combobox', { name: 'Region' }));
    const popup = screen.getByRole('listbox').closest(`.${styles.popup}`);
    const search = screen.getByRole('combobox', { name: 'Search regions' });
    expect(popup?.contains(search)).toBe(true);
    // No trigger of its own on the in-popup field: the real trigger is outside.
    expect(popup?.querySelector(`.${styles.inputTrigger}`)).toBeNull();
    fireEvent.change(search, { target: { value: 'Euro' } });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Europe']);
  });

  it('picks an option through the popup and reports it', async () => {
    const onValueChange = vi.fn();
    renderSelectStyle({ onValueChange });
    await press(screen.getByRole('combobox', { name: 'Region' }));
    const option = screen.getByRole('option', { name: 'Americas' });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    expect(onValueChange.mock.calls[0]?.[0]).toBe('Americas');
  });

  it('does not open while disabled', async () => {
    renderSelectStyle({ disabled: true });
    await press(screen.getByRole('combobox', { name: 'Region' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('holds the chips of a multiple select, with the trigger rendered as a div', () => {
    renderMultipleSelectStyle({ defaultValue: ['Europe', 'Americas'] });
    const trigger = screen.getByRole('combobox', { name: 'Regions' });
    expect(trigger.tagName).toBe('DIV');
    expect(trigger.querySelectorAll(`.${styles.chip}`)).toHaveLength(2);
  });

  // The remove button sits inside the trigger's React tree, and the trigger
  // opens the popup on mousedown, so without the stopPropagation the press
  // that removes a chip also opened the list.
  it('removes a chip without opening the popup', async () => {
    const onValueChange = vi.fn();
    renderMultipleSelectStyle({ defaultValue: ['Europe', 'Americas'], onValueChange });
    const remove = screen.getByRole('button', { name: 'Remove Europe' });
    await press(remove);
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(remove);
    expect(onValueChange.mock.calls[0]?.[0]).toEqual(['Americas']);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  // The control for the test above: the same press, one element over, does
  // open the popup, so a closed popup there means the remove button stopped it.
  it('still opens from a press on the trigger beside the chips', async () => {
    renderMultipleSelectStyle({ defaultValue: ['Europe'] });
    await press(screen.getByRole('combobox', { name: 'Regions' }));
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  // The chips here sit in the trigger and the search input in the popup, so
  // the keys that take the classic chips field to a chip (ArrowLeft from the
  // input) and remove it (Backspace on an empty query) have no chip to reach.
  // What a keyboard user has instead is the list: an option that is chosen
  // toggles off with Enter, the same press that chose it.
  it('removes a chosen value by toggling its option off from the keyboard', async () => {
    const onValueChange = vi.fn();
    renderMultipleSelectStyle({ defaultValue: ['Europe'], onValueChange });
    await press(screen.getByRole('combobox', { name: 'Regions' }));
    const search = screen.getByRole('combobox', { name: 'Search regions' });
    // A chosen option is the one highlighted when the popup opens.
    const europe = screen.getByRole('option', { name: 'Europe' });
    expect(europe.getAttribute('aria-selected')).toBe('true');
    expect(europe.hasAttribute('data-highlighted')).toBe(true);
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[0]).toEqual([]);
    expect(europe.getAttribute('aria-selected')).toBe('false');
  });

  it('leaves the chosen values alone when Backspace is pressed in the empty search field', async () => {
    const onValueChange = vi.fn();
    renderMultipleSelectStyle({ defaultValue: ['Europe', 'Americas'], onValueChange });
    await press(screen.getByRole('combobox', { name: 'Regions' }));
    const search = screen.getByRole('combobox', { name: 'Search regions' });
    expect((search as HTMLInputElement).value).toBe('');
    fireEvent.keyDown(search, { key: 'Backspace' });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  // `<label for>` names a button, and the single form's trigger is one; the
  // multiple form's is a div, which no label can name, so the name has to be
  // an attribute on the trigger itself.
  describe('naming the trigger', () => {
    function renderNamed(trigger: 'button' | 'div', named: Record<string, string>) {
      const triggerProps =
        trigger === 'div' ? ({ render: <div />, nativeButton: false } as const) : ({} as const);
      return render(
        <>
          <label htmlFor="trigger" id="trigger-label">
            Regions
          </label>
          <span id="visible-label">Choose regions</span>
          <Combobox multiple={trigger === 'div'} items={REGIONS}>
            <ComboboxTrigger variant="select" id="trigger" {...triggerProps} {...named}>
              <ComboboxValue placeholder="Pick" />
            </ComboboxTrigger>
            <ComboboxContent>
              <ComboboxInput showTrigger={false} aria-label="Search regions" />
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </>,
      );
    }

    it('takes a <label for> as a name when the trigger is a button', () => {
      renderNamed('button', {});
      expect(screen.getByRole('combobox', { name: 'Regions' }).tagName).toBe('BUTTON');
    });

    it('is not named by a <label for> when the trigger is a div', () => {
      renderNamed('div', {});
      const trigger = screen.getByRole('combobox', { name: '' });
      expect(trigger.tagName).toBe('DIV');
      expect(screen.queryByRole('combobox', { name: 'Regions' })).toBeNull();
    });

    it('is named by aria-labelledby or aria-label when the trigger is a div', () => {
      renderNamed('div', { 'aria-labelledby': 'visible-label' });
      expect(screen.getByRole('combobox', { name: 'Choose regions' }).tagName).toBe('DIV');
      cleanup();
      renderNamed('div', { 'aria-label': 'Pick regions' });
      expect(screen.getByRole('combobox', { name: 'Pick regions' }).tagName).toBe('DIV');
    });
  });
});

describe('Combobox styling', () => {
  const rules = cssRules;
  const selectRules = extractRules(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'select', 'select.module.css'), 'utf8'),
  );

  function declared(source: typeof rules, selector: string, prop: string) {
    const rule = source.find((candidate) => candidate.selector === selector);
    return rule ? declarationMap(rule.body).get(prop) : undefined;
  }

  // The select-style trigger repeats select.module.css's recipe instead of
  // importing it, so this is what keeps the two from drifting apart: the
  // properties that make a trigger look like one control.
  it('draws the select-style trigger the way SelectTrigger is drawn', () => {
    for (const prop of [
      'border',
      'border-radius',
      'background-color',
      'color',
      'padding-block',
      'padding-inline',
      'font-size',
      'line-height',
      'font-weight',
      'gap',
    ]) {
      expect(declared(rules, '.selectTrigger', prop), prop).toBe(declared(selectRules, '.trigger', prop));
    }
    expect(declared(rules, '.selectTrigger', 'height')).toBe(declared(selectRules, '.sizeDefault', 'height'));
    expect(declared(rules, '.selectTrigger[data-placeholder]', 'color')).toBe(
      declared(selectRules, '.trigger[data-placeholder]', 'color'),
    );
  });

  it('stretches a search field that sits inside the popup, without its own width floor', () => {
    expect(declared(rules, '.popup .inputWrap', 'display')).toBe('flex');
    // `auto`, not fit-content: the wrapper then fills what the margin leaves.
    expect(declared(rules, '.popup .inputWrap', 'width')).toBe('auto');
    expect(declared(rules, '.popup .input', 'min-width')).toBe('0');
    // The same rule outside a popup keeps the field only as wide as itself.
    expect(declared(rules, '.inputWrap', 'width')).toBe('fit-content');
  });

  // `text-overflow` applies to a block container's own inline content; a flex
  // container turns the value's bare text into an anonymous flex item that never
  // gets an ellipsis. jsdom has no layout to show it, so the rule that keeps the
  // value a block container is what is pinned.
  it('keeps the select-style value a block container, so a long value ellipsises', () => {
    expect(declared(rules, '.selectValue', 'display')).toBeUndefined();
    expect(declared(rules, '.selectValue', 'min-width')).toBe('0');
    expect(declared(rules, '.selectValue', 'overflow')).toBe('hidden');
    expect(declared(rules, '.selectValue', 'text-overflow')).toBe('ellipsis');
    expect(declared(rules, '.selectValue', 'white-space')).toBe('nowrap');
    // The gap an icon in front of the text used to get from `gap`.
    expect(declared(rules, '.selectValue > svg', 'margin-inline-end')).toBe('var(--space-2)');
  });

  it('strips the chips container down to its content inside a select-style trigger', () => {
    expect(declared(rules, '.selectTrigger .chips', 'border')).toBe('none');
    expect(declared(rules, '.selectTrigger .chips', 'padding')).toBe('0');
    expect(declared(rules, '.selectTrigger:has(.chips)', 'height')).toBe('auto');
    expect(declared(rules, '.selectTrigger:has(.chips)', 'min-height')).toBe('var(--control-height-sm)');
  });

  // Regression guard for the shared inline-end slot: without .inputWrap's
  // :has() rule, a showClear combobox with a value would render both the
  // trigger and the clear button stacked in the same corner.
  it('hides the trigger while the clear button is mounted', () => {
    const rule = cssRules.find(
      (candidate) => candidate.selector === '.inputWrap:has(.inputClear) .inputTrigger',
    );
    expect(rule).toBeDefined();
  });
});
