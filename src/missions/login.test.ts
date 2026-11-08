import { createElement, render, type FunctionComponent } from 'preact';
import { describe, expect, it } from 'vitest';
import { art } from '../art';
import { login, LOGIN_PASSWORD } from './login';

describe('The Front Door', () => {
  it('uses the registered login picture for the door step', () => {
    const step = login.steps.find((entry) => entry.id === 'door');
    expect(step?.art).toBe('login-screen');
    expect(Object.hasOwn(art, step?.art ?? '')).toBe(true);
  });

  it('uses a short word and digits with an uppercase alternative', () => {
    expect(login.steps).toHaveLength(1);
    const config = login.steps[0]!.config;
    expect(config.kind).toBe('answer');
    if (config.kind !== 'answer') throw new Error('The login needs an answer step');
    expect(config.answer).toMatch(/^[a-z]+[0-9]+$/);
    expect(config.answer.length).toBeGreaterThanOrEqual(6);
    expect(config.answer.length).toBeLessThanOrEqual(10);
    expect(config.answer).toBe(LOGIN_PASSWORD);
    expect(config.accept).toContain(config.answer.toUpperCase());
    expect(login.steps[0]!.hints[2].text).toBe(`Type ${config.answer} and press Enter`);
  });

  it('shows the exact answer on the registered login picture', () => {
    const config = login.steps[0]!.config;
    if (config.kind !== 'answer') throw new Error('The login needs an answer step');
    const Screen = art['login-screen'] as FunctionComponent<{ size?: number }>;
    const container = document.createElement('div');
    try {
      render(createElement(Screen, { size: 320 }), container);
      const visibleText = [...container.querySelectorAll('text')].map((node) => node.textContent);
      expect(visibleText).toContain(config.answer);
      expect(visibleText).toContain('AGENT HQ');
    } finally {
      render(null, container);
    }
  });
});
