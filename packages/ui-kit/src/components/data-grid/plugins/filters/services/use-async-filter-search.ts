import { useEffect, useRef, useState } from 'react';

interface AsyncFilterSearchResult<T> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  options: T[];
  isLoading: boolean;
}

const defaultDebounceMs = 300;

/**
 * Server-side counterpart to {@link useFilterSearch}: instead of filtering a
 * static list locally, it debounces the search term, calls the async resolver,
 * and exposes the resulting options plus a loading flag. Stale responses are
 * discarded so the latest query always wins.
 *
 * The resolver is called on mount with the initial (empty) term, so the first
 * page loads as soon as the list is rendered — pair it with a lazily mounted
 * popover to avoid fetching before the filter is opened. Keep `searchOptions`
 * referentially stable (e.g. `useCallback`) to avoid redundant refetches.
 */
export function useAsyncFilterSearch<T>(
  searchOptions: (query: string) => Promise<T[]>,
  debounceMs: number = defaultDebounceMs,
): AsyncFilterSearchResult<T> {
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new term or resolver starts a request, so the list is loading from this render on; the effect is also what schedules the request
    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      searchOptions(searchTerm.trim())
        .then((result) => {
          if (requestId === requestIdRef.current) {
            setOptions(result);
          }
        })
        .catch(() => {
          if (requestId === requestIdRef.current) {
            setOptions([]);
          }
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchOptions, debounceMs]);

  return { searchTerm, setSearchTerm, options, isLoading };
}
