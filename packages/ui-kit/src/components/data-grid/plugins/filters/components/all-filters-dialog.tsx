import { Accordion } from '../../../../accordion/public.js';
import { Button } from '../../../../button/public.js';
import { SheetFooter, SheetHeader, SheetTitle } from '../../../../sheet/public.js';
import { messages } from '../../../messages';
import { useDataGrid } from '../../../services/core/data-grid-context';
import type { DataGridFiltersPluginApi } from '../filters-types';

interface AllFiltersDialogProps {
  onApply: () => void;
}

export function AllFiltersDialog({ onApply }: AllFiltersDialogProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const entities = filtersApi.useFilterEntities();

  return (
    <>
      <SheetHeader>
        <SheetTitle>{messages.filters.allFiltersTitle}</SheetTitle>
      </SheetHeader>
      <Accordion multiple>
        {entities.map((filterEntity) => {
          if (!filterEntity.dialogFilterComponent) return null;
          const DialogComponent = filterEntity.dialogFilterComponent;
          return <DialogComponent key={filterEntity.id} filterEntity={filterEntity} />;
        })}
      </Accordion>
      <SheetFooter>
        <Button onClick={onApply}>{messages.filters.apply}</Button>
      </SheetFooter>
    </>
  );
}
