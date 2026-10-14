import { create } from 'zustand';
import { Label } from '../../../../../label/public.js';
import { RadioGroup, RadioGroupItem } from '../../../../../radio-group/public.js';
import { useTreePluginContext } from '../../../../tree/services/core/tree-context';
import type { TreeLayoutSlotLabelProps } from '../../../../tree/services/layout/layout-types';
import { createTreePlugin } from '../../../../tree/services/plugins/plugins-helpers';
import type { PluginApi } from '../../../../tree/services/plugins/plugins-helpers';
import type {
  DataGridTreeItem,
  DataGridTreeItemId,
} from '../../../../tree-structure/tree-structure-types';
import styles from './tree-radio-select-plugin.module.css';

interface RadioSelectStore {
  selectedId: DataGridTreeItemId | undefined;
}

export interface TreeRadioSelectPluginProps extends Record<string, unknown> {
  value?: DataGridTreeItemId;
  name?: string;
  onChange?: (id: DataGridTreeItemId) => void;
}

export interface TreeRadioSelectPluginApi extends PluginApi<TreeRadioSelectPluginProps> {
  useSelectedId: () => DataGridTreeItemId | undefined;
  select: (id: DataGridTreeItemId) => void;
}

const SELECTED = 'selected';

function TreeNodeRadioLabel<TItem extends DataGridTreeItem>({
  item,
  label,
}: TreeLayoutSlotLabelProps<TItem>) {
  const treeContext = useTreePluginContext<TItem>();
  const plugin = treeContext.getPlugin<TreeRadioSelectPluginApi>('radioSelect')!;

  const itemId = item.id;
  const selectedId = plugin.useSelectedId();
  const isSelected = selectedId === itemId;

  function handleSelect() {
    if (typeof itemId === 'string' || typeof itemId === 'number') {
      plugin.select(itemId);
    }
  }

  // Each radio is a group of one, set to the sentinel value while it is the selected one: the
  // tree, not a radio group, knows which item is chosen, and the kit's radio takes its state from
  // a group.
  return (
    <Label>
      <RadioGroup
        className={styles.radioGroup}
        value={isSelected ? SELECTED : ''}
        onValueChange={handleSelect}
      >
        <RadioGroupItem value={SELECTED} data-tree-node-click-ignore="" />
      </RadioGroup>
      <span className={styles.text}>{label}</span>
    </Label>
  );
}

export const TreeRadioSelectPlugin = createTreePlugin<
  DataGridTreeItem,
  'radioSelect',
  TreeRadioSelectPluginProps
>('radioSelect', (context) => {
  let currentProps: TreeRadioSelectPluginProps = {};

  const useRadioSelectStore = create<RadioSelectStore>(() => ({
    selectedId: undefined,
  }));

  context.registerSlot('label', {
    component: TreeNodeRadioLabel,
  });

  const useSelectedId = () => useRadioSelectStore((s) => s.selectedId);

  return {
    useSelectedId,
    select,
    onPropsChange,
  };

  function onPropsChange(props: TreeRadioSelectPluginProps) {
    currentProps = props;
    if (props.value !== undefined) {
      useRadioSelectStore.setState({ selectedId: props.value });
    }
  }

  function select(id: DataGridTreeItemId) {
    useRadioSelectStore.setState({ selectedId: id });
    currentProps.onChange?.(id);
  }
});
