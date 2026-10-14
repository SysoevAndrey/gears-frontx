import { SearchIcon } from 'lucide-react';
import { Input } from '../../input/public.js';
import { messages } from '../messages';

interface FilterOptionsSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function FilterOptionsSearchInput({
  value,
  onValueChange,
  placeholder,
  autoFocus,
  disabled,
}: FilterOptionsSearchInputProps) {
  return (
    <Input
      value={value}
      placeholder={placeholder ?? messages.filters.searchPlaceholder}
      icon={<SearchIcon />}
      onValueChange={onValueChange}
      autoFocus={autoFocus}
      disabled={disabled}
    />
  );
}
