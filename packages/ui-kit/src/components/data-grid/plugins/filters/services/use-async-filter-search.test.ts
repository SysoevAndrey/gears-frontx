import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncFilterSearch } from './use-async-filter-search';

function option(value: string) {
  return { label: value, value };
}

describe('useAsyncFilterSearch', () => {
  it('resolves the initial (empty) query on mount and exposes loading state', async () => {
    const searchOptions = vi.fn((query: string) => Promise.resolve([option(query || 'all')]));

    const { result } = renderHook(() => useAsyncFilterSearch(searchOptions, 0));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchOptions).toHaveBeenCalledWith('');
    expect(result.current.options).toEqual([option('all')]);
  });

  it('re-queries with the trimmed term when the search changes', async () => {
    const searchOptions = vi.fn((query: string) => Promise.resolve([option(query)]));

    const { result } = renderHook(() => useAsyncFilterSearch(searchOptions, 0));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setSearchTerm('  admin  '));

    await waitFor(() => expect(result.current.options).toEqual([option('admin')]));
    expect(searchOptions).toHaveBeenLastCalledWith('admin');
  });

  it('keeps the latest response when an earlier, slower request resolves after it', async () => {
    const searchOptions = vi.fn(
      (query: string) =>
        new Promise<{ label: string; value: string }[]>((resolve) => {
          setTimeout(() => resolve([option(query)]), query === 'slow' ? 50 : 5);
        }),
    );

    const { result } = renderHook(() => useAsyncFilterSearch(searchOptions, 0));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setSearchTerm('slow'));
    act(() => result.current.setSearchTerm('fast'));

    await waitFor(() => expect(result.current.options).toEqual([option('fast')]));

    // The stale 'slow' response resolves later but must not overwrite 'fast'.
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(result.current.options).toEqual([option('fast')]);
  });

  describe('when a request answers after a newer one was made', () => {
    // Every request stays pending until the test settles it, so the order of the answers is the
    // test's to choose.
    function controlledResolver() {
      const pending = new Map<
        string,
        { resolve: (options: ReturnType<typeof option>[]) => void; reject: (error: Error) => void }
      >();
      const searchOptions = vi.fn(
        (query: string) =>
          new Promise<ReturnType<typeof option>[]>((resolve, reject) => {
            pending.set(query, { resolve, reject });
          }),
      );
      return { pending, searchOptions };
    }

    async function startTwoRequests() {
      const { pending, searchOptions } = controlledResolver();
      const { result } = renderHook(() => useAsyncFilterSearch(searchOptions, 0));
      await waitFor(() => expect(searchOptions).toHaveBeenCalledWith(''));
      act(() => result.current.setSearchTerm('a'));
      await waitFor(() => expect(searchOptions).toHaveBeenCalledWith('a'));
      act(() => result.current.setSearchTerm('ab'));
      await waitFor(() => expect(searchOptions).toHaveBeenCalledWith('ab'));
      return { pending, result };
    }

    it('keeps the answer to the latest term, whatever order the answers come in', async () => {
      const { pending, result } = await startTwoRequests();

      await act(async () => pending.get('ab')?.resolve([option('ab')]));
      await waitFor(() => expect(result.current.options).toEqual([option('ab')]));
      await act(async () => {
        pending.get('a')?.resolve([option('a')]);
        pending.get('')?.resolve([option('all')]);
      });

      expect(result.current.options).toEqual([option('ab')]);
      expect(result.current.isLoading).toBe(false);
    });

    it('keeps the list when an older request fails after the latest one answered', async () => {
      const { pending, result } = await startTwoRequests();
      await act(async () => pending.get('ab')?.resolve([option('ab')]));
      await waitFor(() => expect(result.current.options).toEqual([option('ab')]));

      await act(async () => {
        pending.get('a')?.reject(new Error('down'));
        pending.get('')?.reject(new Error('down'));
      });

      expect(result.current.options).toEqual([option('ab')]);
      expect(result.current.isLoading).toBe(false);
    });

    it('keeps loading until the latest request answers, and ignores a failed older one', async () => {
      const { pending, result } = await startTwoRequests();

      await act(async () => {
        pending.get('a')?.resolve([option('a')]);
        pending.get('')?.reject(new Error('down'));
      });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.options).toEqual([]);

      await act(async () => pending.get('ab')?.resolve([option('ab')]));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.options).toEqual([option('ab')]);
    });
  });
});
