import { describe, expect, it, vi } from 'vitest';
import type { DataGridTreeItem } from '../../../tree-structure/tree-structure-types';
import { createHookedService } from '../hooked/hooked';
import { createPluginsService } from './plugins-service';

function createContext() {
  return { hooked: createHookedService() };
}

describe('createPluginsService', () => {
  it('registers and retrieves a plugin', () => {
    const service = createPluginsService<DataGridTreeItem>(createContext());

    service.registerPlugin({
      name: 'test',
      setup: () => ({ value: 42 }),
    });

    expect(service.getPlugin('test')).toEqual({ value: 42 });
  });

  it('skips duplicate registration, keeps original api and warns', () => {
    const service = createPluginsService<DataGridTreeItem>(createContext());
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());

    service.registerPlugin({ name: 'dup', setup: () => ({ version: 1 }) });
    service.registerPlugin({ name: 'dup', setup: () => ({ version: 2 }) });

    expect(service.getPlugin('dup')).toEqual({ version: 1 });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Plugin "dup" is already registered'),
    );

    warnSpy.mockRestore();
  });

  it('returns undefined for unregistered plugin', () => {
    const service = createPluginsService<DataGridTreeItem>(createContext());

    expect(service.getPlugin('nonexistent')).toBeUndefined();
  });
});
