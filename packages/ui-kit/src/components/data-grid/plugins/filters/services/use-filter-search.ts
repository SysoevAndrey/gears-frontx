import { useState } from 'react';
import type { ReactNode } from 'react';

export interface FilterSearchOption {
  label: ReactNode;
}

export function resolveLabel(label: ReactNode): string {
  if (typeof label === 'string') return label;
  if (typeof label === 'number') return String(label);
  return '';
}

export function resolveTreeLabel<Item extends Record<string, unknown>>(
  item: Item,
  treeLabel: string | ((item: Item) => string),
): string {
  if (typeof treeLabel === 'function') {
    return treeLabel(item);
  }
  return String(item[treeLabel] || '');
}

export function useFilterSearch<T extends FilterSearchOption>(options: T[], enabled: boolean) {
  const [searchTerm, setSearchTerm] = useState('');

  let filteredOptions = options;

  if (enabled && searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredOptions = options.filter((option) => {
      return resolveLabel(option.label).toLowerCase().includes(term);
    });
  }

  return {
    searchTerm,
    setSearchTerm,
    filteredOptions,
  };
}
