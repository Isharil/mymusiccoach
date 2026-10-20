// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { handleBackButton, useBackHandler } from './useBackHandler';

describe('useBackHandler', () => {
  it('ferme la fenêtre ouverte la plus récente, seulement si elle est ouverte', () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    const first = renderHook(() => useBackHandler(closeFirst));
    const second = renderHook(({ open }) => useBackHandler(closeSecond, open), { initialProps: { open: false } });

    // La seconde fenêtre n'est pas ouverte : la première se ferme
    expect(handleBackButton()).toBe(true);
    expect(closeFirst).toHaveBeenCalledTimes(1);

    second.rerender({ open: true });
    handleBackButton();
    expect(closeSecond).toHaveBeenCalledTimes(1);
    expect(closeFirst).toHaveBeenCalledTimes(1);

    second.unmount();
    first.unmount();
    expect(handleBackButton()).toBe(false);
  });

  it('utilise la dernière version de la fonction de fermeture', () => {
    const before = vi.fn();
    const after = vi.fn();
    const { rerender, unmount } = renderHook(({ onBack }) => useBackHandler(onBack), { initialProps: { onBack: before } });
    rerender({ onBack: after });
    handleBackButton();
    expect(after).toHaveBeenCalledTimes(1);
    expect(before).not.toHaveBeenCalled();
    unmount();
  });
});
