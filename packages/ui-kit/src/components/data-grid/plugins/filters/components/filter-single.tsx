import type { DataGridFilterEntity } from '../filters-types';

interface FilterSingleProps {
  filterEntity: DataGridFilterEntity;
}

export function FilterSingle({ filterEntity }: FilterSingleProps) {
  if (!filterEntity.filterComponent) return null;

  const Component = filterEntity.filterComponent;
  return <Component filterEntity={filterEntity} />;
}
