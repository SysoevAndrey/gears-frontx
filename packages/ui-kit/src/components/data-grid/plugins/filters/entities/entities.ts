import type { LoadContextFiltersState } from '../../../services/plugins/plugins-types';
import type { DataGridFilterEntity, filterStateBrandKey } from '../filters-types';

/**
 * Helper to create a filter entity with the brand key for type inference.
 */
export function createFilterEntity<
  State extends LoadContextFiltersState = LoadContextFiltersState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Params extends Record<PropertyKey, any> | void = any,
>(entity: Omit<DataGridFilterEntity<State, Params>, typeof filterStateBrandKey>) {
  return entity as DataGridFilterEntity<State, Params>;
}
