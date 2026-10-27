import { createContext, useContext } from 'react';

/*
 * The grid's accessible name, as passed to `DataGrid`'s `label` prop. The two components that
 * render landmarks read it: the table's scroll wrapper becomes a `region` named with the label,
 * and the pagination plugin's pager becomes a `nav` named "<label> pagination" (the wording lives
 * in `messages.pagination.ariaLabelFor`). A context rather than a grid store: the label is
 * render-time naming only -- nothing loads it, persists it, or writes it from a second place --
 * so carrying it from the component that owns the prop renames both landmarks on the very render
 * that changes it, with no effect and no store write in between.
 *
 * `undefined` is a value, not an absence of wiring: it is what a grid without a `label` provides,
 * and its consumers must then render exactly what they rendered before the prop existed (the pager
 * keeps its "Pagination" name, the table wrapper stays roleless). The context default is
 * `undefined` for the same reason.
 */
const DataGridLabelContext = createContext<string | undefined>(undefined);

export const DataGridLabelProvider = DataGridLabelContext.Provider;

/**
 * The grid's `label` prop, or `undefined` when the grid has none or the prop is blank.
 */
export function useDataGridLabel(): string | undefined {
  return useContext(DataGridLabelContext);
}
