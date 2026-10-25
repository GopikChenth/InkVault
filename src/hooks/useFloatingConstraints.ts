import { useState, useLayoutEffect, useEffect, RefObject, useCallback, useRef } from 'react';
import {
  calculateClampedPopoverPosition,
  PopoverPlacement,
  PopoverPositionResult,
  Rect,
} from '../utils/layoutConstraints';

interface UseFloatingConstraintsOptions {
  placement?: PopoverPlacement;
  offset?: number;
  viewportPadding?: number;
  enabled?: boolean;
}

/**
 * Hook providing dynamic, constraint-based positioning for floating menus,
 * popovers, and toolbars. Automatically bounds and flips within viewport.
 */
export function useFloatingConstraints(
  anchorRef: RefObject<HTMLElement | null> | { currentRect: Rect | null },
  floatingRef: RefObject<HTMLElement | null>,
  options: UseFloatingConstraintsOptions = {}
) {
  const {
    placement = 'auto',
    offset = 8,
    viewportPadding = 12,
    enabled = true,
  } = options;

  const anchorRefInternal = useRef(anchorRef);
  anchorRefInternal.current = anchorRef;

  const floatingRefInternal = useRef(floatingRef);
  floatingRefInternal.current = floatingRef;

  const computePosition = useCallback((floatingEl: HTMLElement | null = null): PopoverPositionResult => {
    if (!enabled || typeof window === 'undefined') {
      return {
        x: 0,
        y: 0,
        actualPlacement: 'bottom',
        horizontalAlign: 'start',
        maxHeight: 400,
      };
    }

    let anchorRect: Rect | null = null;
    const currentAnchor = anchorRefInternal.current;
    if ('currentRect' in currentAnchor && currentAnchor.currentRect) {
      anchorRect = currentAnchor.currentRect;
    } else if ('current' in currentAnchor && currentAnchor.current) {
      const r = currentAnchor.current.getBoundingClientRect();
      anchorRect = {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
      };
    }

    if (!anchorRect) {
      return {
        x: 0,
        y: 0,
        actualPlacement: 'bottom',
        horizontalAlign: 'start',
        maxHeight: 400,
      };
    }

    const contentDims = floatingEl
      ? { width: floatingEl.offsetWidth, height: floatingEl.offsetHeight }
      : { width: 220, height: 200 };

    return calculateClampedPopoverPosition(anchorRect, contentDims, placement, {
      offset,
      viewportPadding,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  }, [enabled, placement, offset, viewportPadding]);

  // Compute position synchronously on initial mount so element is never placed at (0, 0)
  const [result, setResult] = useState<PopoverPositionResult>(() => computePosition(null));

  const updatePosition = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;
    const floatingEl = floatingRefInternal.current?.current;
    const pos = computePosition(floatingEl);
    setResult((prev) => {
      if (
        prev.x === pos.x &&
        prev.y === pos.y &&
        prev.actualPlacement === pos.actualPlacement &&
        prev.horizontalAlign === pos.horizontalAlign &&
        prev.maxHeight === pos.maxHeight
      ) {
        return prev;
      }
      return pos;
    });
  }, [enabled, computePosition]);

  useLayoutEffect(() => {
    if (!enabled) return;
    updatePosition();
  }, [enabled, placement, offset, viewportPadding, updatePosition]);

  useEffect(() => {
    if (!enabled) return;

    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [enabled, updatePosition]);

  const isPositioned = result.x !== 0 || result.y !== 0;

  return {
    ...result,
    isPositioned,
    style: {
      position: 'fixed' as const,
      left: `${result.x}px`,
      top: `${result.y}px`,
      maxHeight: `${result.maxHeight}px`,
      visibility: isPositioned ? ('visible' as const) : ('hidden' as const),
    },
    updatePosition,
  };
}
