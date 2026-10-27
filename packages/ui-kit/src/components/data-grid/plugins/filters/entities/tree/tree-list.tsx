import { Tree } from '../../../../tree/tree';
import type {
  DataGridTreeItem,
  DataGridTreeItemId,
} from '../../../../tree-structure/tree-structure-types';
import { FilterControlArea } from '../../../../components/filter-control-area';
import { FilterOptionsSearchInput } from '../../../../components/filter-options-search-input';
import { FilterScrollableWrapper } from '../../../../components/filter-scrollable-wrapper';
import type { DataGridFilterTreeEntity } from '../../filters-types';
import { resolveTreeLabel } from '../../services/use-filter-search';
import { TreeRadioSelectPlugin } from './tree-radio-select-plugin';
import { useTreeSearch } from './use-tree-search';

type SearchSize = 'm' | 'xl';

interface TreeListProps {
  filterEntity: DataGridFilterTreeEntity;
  value: DataGridTreeItemId | undefined;
  onChange: (value: DataGridTreeItemId) => void;
  searchSize: SearchSize;
}

export function TreeList({ filterEntity, value, onChange, searchSize }: TreeListProps) {
  const { tree, treeLabel, search: showSearch } = filterEntity.params;

  const getLabel = (item: DataGridTreeItem) => resolveTreeLabel(item, treeLabel);
  const { searchTerm, setSearchTerm, filter } = useTreeSearch(tree, getLabel);

  return (
    <>
      {showSearch && (
        <FilterControlArea size={searchSize}>
          <FilterOptionsSearchInput value={searchTerm} onValueChange={setSearchTerm} />
        </FilterControlArea>
      )}
      <FilterScrollableWrapper>
        <Tree
          name={`filter-tree-${filterEntity.filterKey}`}
          treeStructure={tree}
          label={treeLabel}
          ellipsis={false}
          filter={filter}
        >
          <TreeRadioSelectPlugin value={value} onChange={onChange} name={filterEntity.filterKey} />
        </Tree>
      </FilterScrollableWrapper>
    </>
  );
}
