import { createHooked } from '../../../utils/hooked';
import type { TreeHooked, TreeHooks } from './hooked-types';

export function createHookedService(): TreeHooked {
  const hooked = createHooked<TreeHooks>();

  return {
    hook: hooked.hook,
    callHook: hooked.callHook,
    callHookParallel: hooked.callHookParallel,
    callHookSync: hooked.callHookSync,
  };
}
