// Load-bearing: a plugin is rendered as a child of <DataGrid>, so a Server Component can import
// and render it, and the component it returns calls hooks. This directive puts the banner on the
// plugin's own entry chunk (dist/data-grid/<plugin>.js). client-boundaries.test.ts only scans a
// component's top-level files, so scripts/verify-consumer.sh is what checks the built banner of
// every plugin entry.
'use client';

import type { ComponentType } from 'react';
import { create } from 'zustand';
import type { DataGridItem } from '../../data-grid-types';
import { createDataGridPlugin } from '../../services/plugins/plugins-helpers';
import type { DataGridActionsPluginApi, DataGridActionsPluginProps } from './actions-types';
import { DataGridActionsWrapper } from './components/data-grid-actions-wrapper';

export type { DataGridActionsPluginApi, DataGridActionsPluginProps };

interface ActionsStore {
  component: ComponentType | null;
  props?: Record<string, unknown>;
}

export const DataGridActionsPlugin = createDataGridPlugin<
  DataGridItem,
  'actions',
  DataGridActionsPluginProps
>('actions', (context) => {
  const useStore = create<ActionsStore>(() => ({
    component: null,
    props: undefined,
  }));

  context.registerSlot('top-end', {
    id: 'actions',
    component: DataGridActionsWrapper,
    order: 0,
  });

  const useComponent = () => useStore((s) => s.component);
  const useProps = () => useStore((s) => s.props);

  const api: DataGridActionsPluginApi = {
    useComponent,
    useProps,
    onPropsChange,
  };

  return api;

  function onPropsChange(props: DataGridActionsPluginProps) {
    useStore.setState({
      component: props.component,
      props: props.props,
    });
  }
});
