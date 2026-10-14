import type { Hooked } from '../../../utils/hooked';

export interface TreeHooks {
  init: () => void;
  reset: () => void;
  destroy: () => void;
}

export type TreeHooked<Hooks extends TreeHooks = TreeHooks> = Pick<
  Hooked<Hooks>,
  'hook' | 'callHook' | 'callHookParallel' | 'callHookSync'
>;
