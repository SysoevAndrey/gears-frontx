import { useState, type ReactNode } from 'react';
import { Badge } from '../../../../badge/public.js';
import { FilterChip } from '../../../components/filter-chip';
import { FilterPopoverContent } from '../../../components/filter-popover-content';
import { FilterResetButton } from '../../../components/filter-reset-button';
import { useDataGrid } from '../../../services/core/data-grid-context';
import type { DataGridFilterEntity, DataGridFiltersPluginApi } from '../filters-types';
import { AdaptivePopover } from './adaptive-popover';
import { FilterLabel } from './filter-label';
import styles from './filter-popover.module.css';

const defaultMinInlineSize = 140;

interface FilterPopoverProps {
  filterEntity: DataGridFilterEntity;
  children: ReactNode;
}

export function FilterPopover({ filterEntity, children }: FilterPopoverProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;
  const [open, setOpen] = useState(false);

  const state = filtersApi.useState(filterEntity.filterKey);
  const value = state?.value;

  const isEmptyState = !filtersApi.isFilterValueActive(value);

  const stateLabel = Array.isArray(value) && value.length > 0 ? value.length : undefined;

  const popoverConfig = filterEntity.params?.popover;
  const minInlineSize = `${popoverConfig?.minInlineSize ?? defaultMinInlineSize}px`;
  const maxInlineSize =
    popoverConfig?.maxInlineSize != null ? `${popoverConfig.maxInlineSize}px` : undefined;

  function onReset() {
    filtersApi.removeState(filterEntity.filterKey);
  }

  const trigger = (
    <FilterChip hover={open} active={!isEmptyState}>
      <FilterLabel filterEntity={filterEntity} />
      {!isEmptyState &&
        (stateLabel != null ? (
          <Badge size="xs">{stateLabel}</Badge>
        ) : (
          <span className={styles.dot} />
        ))}
    </FilterChip>
  );

  return (
    <AdaptivePopover
      open={open}
      onOpenChange={setOpen}
      minInlineSize={minInlineSize}
      trigger={trigger}
    >
      <FilterPopoverContent maxInlineSize={maxInlineSize}>
        {children}

        <FilterResetButton disabled={isEmptyState} onClick={onReset} />
      </FilterPopoverContent>
    </AdaptivePopover>
  );
}
