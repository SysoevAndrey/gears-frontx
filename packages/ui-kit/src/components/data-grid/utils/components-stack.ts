import type { ComponentType } from 'react';
import { createElement } from 'react';

export interface ComponentsStackService {
  registerComponent: (component: ComponentType) => void;
  getStackedComponent: <TProps = unknown>() => ComponentType<TProps>;
}

/**
 * A stack of components that render the same element, merged into one when it is rendered. A
 * component registered later wraps the ones before it, with the fallback at the bottom, so each
 * can add behaviour or styling to the element without replacing it.
 */
export function createComponentsStack(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the stack passes props through untouched, and the fallback decides which ones the element takes
  fallbackComponent: ComponentType<any>,
): ComponentsStackService {
  const stack: ComponentType[] = [];
  let stackedComponent: ComponentType | undefined;

  return {
    registerComponent,
    getStackedComponent,
  };

  function getStackedComponent<TProps = unknown>(): ComponentType<TProps> {
    // The list is newest first and folded from its end, so the oldest wraps the fallback and the
    // newest ends up outermost.
    stackedComponent ??= stack.reduceRight((Inner, Wrapper) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see the fallback above
      return (props: any) => createElement(Wrapper, props, createElement(Inner, props));
    }, fallbackComponent);

    return stackedComponent as ComponentType<TProps>;
  }

  function registerComponent(component: ComponentType) {
    stack.unshift(component);
    // The merged component is cached; a new entry makes it stale.
    stackedComponent = undefined;
  }
}
