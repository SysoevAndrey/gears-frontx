import { useId } from 'react';
import { FilterChipLabel } from '../../../../components/filter-chip';
import { FilterControlArea } from '../../../../components/filter-control-area';
import { FilterOptionsSearchInput } from '../../../../components/filter-options-search-input';
import { FilterScrollableWrapper } from '../../../../components/filter-scrollable-wrapper';
import type {
  DataGridFilterTagGroupEntity,
  DataGridFilterTagGroupOption,
} from '../../filters-types';
import { useFilterSearch } from '../../services/use-filter-search';
import styles from './tag-group-list.module.css';

type SearchSize = 'm' | 'xl';

interface TagGroupListProps {
  filterEntity: DataGridFilterTagGroupEntity;
  value: DataGridFilterTagGroupOption['value'][];
  onChange: (value: DataGridFilterTagGroupOption['value'][]) => void;
  searchSize: SearchSize;
}

export function TagGroupList({ filterEntity, value, onChange, searchSize }: TagGroupListProps) {
  const name = useId();
  const { options, mode = 'checkbox', search: showSearch } = filterEntity.params;
  const { searchTerm, setSearchTerm, filteredOptions } = useFilterSearch(
    options,
    showSearch ?? false,
  );

  function isSelected(optionValue: DataGridFilterTagGroupOption['value']) {
    return value.includes(optionValue);
  }

  function handleClick(optionValue: DataGridFilterTagGroupOption['value']) {
    if (mode === 'radio') {
      onChange([optionValue]);
    } else {
      if (isSelected(optionValue)) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    }
  }

  return (
    <div>
      {showSearch && (
        <FilterControlArea size={searchSize}>
          <FilterOptionsSearchInput value={searchTerm} onValueChange={setSearchTerm} />
        </FilterControlArea>
      )}
      <FilterScrollableWrapper>
        <div className={styles.options}>
          {filteredOptions.map((item) => (
            <FilterChipLabel key={String(item.value)} active={isSelected(item.value)}>
              {item.component ? <item.component option={item} /> : <>{item.label}</>}
              <input
                type={mode === 'radio' ? 'radio' : 'checkbox'}
                name={name}
                value={String(item.value)}
                checked={isSelected(item.value)}
                onChange={() => handleClick(item.value)}
                className={styles.hiddenInput}
              />
            </FilterChipLabel>
          ))}
        </div>
      </FilterScrollableWrapper>
    </div>
  );
}
