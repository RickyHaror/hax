import { render } from 'preact';
import { act } from 'preact/test-utils';
import { vi } from 'vitest';
import type { DecoderConfig, WebSourceConfig, Step } from '../../../engine/types';
import { m2Toys } from '../../../missions/m2-toys';
import { m3Zoo } from '../../../missions/m3-zoo';
import { StoreContext, createStore } from '../../store';
import { fakeDeps } from '../../test/helpers';
import { StepWidget } from '../Widget';

export const webConfig = m2Toys.steps[0]!.config as WebSourceConfig;
export const decoderConfig = m3Zoo.steps[0]!.config as DecoderConfig;
export async function mountTool(config: WebSourceConfig | DecoderConfig) {
  const deps = fakeDeps();
  const store = createStore(deps);
  const complete = vi.fn();
  const root = document.createElement('div');
  root.dataset.testTools = 'true'; document.body.append(root);
  const step: Step = { ...m2Toys.steps[0]!, config };
  async function reveal(showMe: boolean) {
    await act(() => { render(<StoreContext.Provider value={store}>
      <StepWidget step={step} config={config} showMe={showMe} onComplete={complete} />
    </StoreContext.Provider>, root); });
  }
  await reveal(false);
  return { root, deps, store, complete, reveal };
}
export async function removeTools() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-test-tools]')) {
    await act(() => { render(null, root); }); root.remove();
  }
}
