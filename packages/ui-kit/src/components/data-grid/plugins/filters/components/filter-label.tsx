import { useDataGridContext } from '../../../services/core/data-grid-context';
import type { ConfigurationEntry } from '../../../services/table/table-types';
import { isConfigurationGroup } from '../../../services/table/table-types';
import type { DataGridFilterEntity } from '../filters-types';

interface FilterLabelProps {
  filterEntity: DataGridFilterEntity;
}

export function FilterLabel({ filterEntity }: FilterLabelProps) {
  const context = useDataGridContext();
  const configEntries = context.table.useConfigurationColumns();

  if (filterEntity.label != null) {
    return <>{filterEntity.label}</>;
  }

  const flatColumns = flattenConfigEntries(configEntries);
  const column = flatColumns.find((col) => col.id === filterEntity.id);

  if (column == null) {
    throw new Error(
      `Label for "${filterEntity.id}" is not defined. "id" should match a column id or filter entity should have a label.`,
    );
  }

  return <>{column.label}</>;
}

function flattenConfigEntries(entries: ConfigurationEntry[]) {
  const result: { id: string; label: string }[] = [];
  for (const entry of entries) {
    if (isConfigurationGroup(entry)) {
      result.push(...entry.columns);
    } else {
      result.push(entry);
    }
  }
  return result;
}
