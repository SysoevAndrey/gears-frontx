import type { ComponentType, ReactNode } from 'react';
import type {
  LoadContextFilterKey,
  LoadContextFiltersState,
} from '../../services/plugins/plugins-types';

/**
 * Brand key for type inference of filter entity state.
 */
export declare const filterStateBrandKey: unique symbol;

export type DataGridFilterEntity<
  State extends LoadContextFiltersState = LoadContextFiltersState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entity kind has params of its own shape
  Params extends Record<PropertyKey, any> | void = any,
> = {
  [filterStateBrandKey]: State;
  /** Column id or unique identifier. Used as filterKey default and for label resolution. */
  id: string;
  /** Key used in the filters load context. Defaults to `id`. */
  filterKey: LoadContextFilterKey;
  /** Display label. Falls back to column label if id matches a column. */
  label?: ReactNode;
  /** Quick-filter component rendered in the filter bar. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the component takes the entity of its own kind
  filterComponent?: ComponentType<{ filterEntity: any }>;
  /** Dialog-filter component rendered in the "All Filters" dialog. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the component takes the entity of its own kind
  dialogFilterComponent?: ComponentType<{ filterEntity: any }>;
  /** Optional transform applied when building the load context.
   *  Receives the raw filter state and returns the state sent to the load function. */
  resolveLoadValue?: (state: LoadContextFiltersState) => LoadContextFiltersState;
} & (Params extends void ? { params?: never } : { params: Params });

export type DataGridInferFilterEntityState<Entity extends DataGridFilterEntity> =
  Entity extends DataGridFilterEntity<infer State> ? State : never;

export interface DataGridFilterPopoverOptions {
  minInlineSize: number;
  /** Constraining the popover width. */
  maxInlineSize?: number;
}

// --- Entity-specific types ---

export interface DataGridFilterSearchState {
  value: string;
}
export type DataGridFilterSearchEntity = DataGridFilterEntity<DataGridFilterSearchState>;

export interface DataGridFilterToggleState {
  value: boolean;
}
export type DataGridFilterToggleEntity = DataGridFilterEntity<DataGridFilterToggleState>;

export interface DataGridFilterCheckboxGroupOption {
  label: ReactNode;
  value: string | number;
  component?: ComponentType<{ option: DataGridFilterCheckboxGroupOption }>;
}

export interface DataGridFilterCheckboxGroupState {
  value: DataGridFilterCheckboxGroupOption['value'][];
}

/**
 * Async options resolver for a checkbox filter. When `options` is a function
 * instead of an array, the search box queries it (debounced) instead of
 * filtering locally — use it when the option set is too large to load up front.
 * Receives the trimmed search term (empty string for the initial list) and
 * returns the options to show. The list manages its own debounce, loading, and
 * stale-response handling.
 */
export type DataGridFilterCheckboxGroupOptionsLoader = (
  query: string,
) => Promise<DataGridFilterCheckboxGroupOption[]>;

export interface DataGridFilterCheckboxGroupEntityParams {
  /** Static option list (filtered locally) or an async resolver (queried per search term). */
  options: DataGridFilterCheckboxGroupOption[] | DataGridFilterCheckboxGroupOptionsLoader;
  search?: boolean;
  /** Debounce in ms applied to the async options resolver. Defaults to 300. */
  searchDebounce?: number;
  popover?: DataGridFilterPopoverOptions;
}

export type DataGridFilterCheckboxGroupEntity = DataGridFilterEntity<
  DataGridFilterCheckboxGroupState,
  DataGridFilterCheckboxGroupEntityParams
>;

export interface DataGridFilterTagGroupOption {
  label: ReactNode;
  value: string | number;
  component?: ComponentType<{ option: DataGridFilterTagGroupOption }>;
}

export type DataGridFilterTagGroupMode = 'checkbox' | 'radio';

export interface DataGridFilterTagGroupState {
  value: DataGridFilterTagGroupOption['value'][];
}

export interface DataGridFilterTagGroupEntityParams {
  options: DataGridFilterTagGroupOption[];
  mode?: DataGridFilterTagGroupMode;
  search?: boolean;
  popover?: DataGridFilterPopoverOptions;
}

export type DataGridFilterTagGroupEntity = DataGridFilterEntity<
  DataGridFilterTagGroupState,
  DataGridFilterTagGroupEntityParams
>;

export interface DataGridFilterTreeState {
  value: string | number | undefined;
}

export interface DataGridFilterTreeEntityParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the tree's item type is the consumer's, and the entity does not carry it
  tree: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the tree's item type is the consumer's, and the entity does not carry it
  treeLabel: string | ((item: any) => string);
  search?: boolean;
  popover?: DataGridFilterPopoverOptions;
}

export type DataGridFilterTreeEntity = DataGridFilterEntity<
  DataGridFilterTreeState,
  DataGridFilterTreeEntityParams
>;

/**
 * Both bounds of a date-range filter, as strings in the entity's model date
 * format. Either bound may be absent: `{ from }` alone means "from this date
 * onwards", `{ to }` alone means "up to this date".
 */
export interface DataGridFilterDateRangeValue {
  from?: string;
  to?: string;
}

export interface DataGridFilterDateRangeState {
  /** `undefined` once the range is cleared — the dialog draft has no remove. */
  value: DataGridFilterDateRangeValue | undefined;
}

export interface DataGridFilterDateRangeEntityParams {
  /**
   * Format the bounds are emitted in and parsed from, as date-fns tokens. Defaults to
   * `yyyy-MM-dd` (calendar dates).
   */
  modelDateFormat?: string;
  popover?: DataGridFilterPopoverOptions;
}

export type DataGridFilterDateRangeEntity = DataGridFilterEntity<
  DataGridFilterDateRangeState,
  DataGridFilterDateRangeEntityParams
>;

// --- Plugin API ---

export interface DataGridFiltersPluginProps {
  entities: DataGridFilterEntity[];
  isAllFiltersOptionVisible?: boolean;
}

export interface DataGridFiltersPluginApi {
  useFilterEntities: () => DataGridFilterEntity[];
  useIsAllFiltersOptionVisible: () => boolean;

  useState: <S extends LoadContextFiltersState = LoadContextFiltersState>(
    filterKey: LoadContextFilterKey,
  ) => S | undefined;
  useActiveCount: (filterKeys: LoadContextFilterKey[]) => number;
  setState: <S extends LoadContextFiltersState = LoadContextFiltersState>(
    filterKey: LoadContextFilterKey,
    state: S,
  ) => void;
  removeState: (filterKey: LoadContextFilterKey) => void;

  useDraftState: <S extends LoadContextFiltersState = LoadContextFiltersState>(
    filterKey: LoadContextFilterKey,
  ) => S | undefined;
  setDraftState: <S extends LoadContextFiltersState = LoadContextFiltersState>(
    filterKey: LoadContextFilterKey,
    state: S,
  ) => void;
  applyDraftState: () => void;
  resetDraftState: () => void;

  isFilterValueActive: (value: unknown) => boolean;

  onPropsChange: (props: DataGridFiltersPluginProps) => void;
}
