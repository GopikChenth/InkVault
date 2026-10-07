import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingConstraints } from '../../hooks/useFloatingConstraints';
import { PopoverPlacement } from '../../utils/layoutConstraints';

export interface FloatingAnchorProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement?: PopoverPlacement;
  offset?: number;
  viewportPadding?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Modular Popover component that aligns to an anchor element using rule-based
 * viewport constraints. Renders via Portal to avoid overflow clipping and
 * stacking context collisions.
 */
export default function FloatingAnchor({
  isOpen,
  onClose,
  anchorRef,
  placement = 'auto',
  offset = 8,
  viewportPadding = 12,
  className = '',
  children,
}: FloatingAnchorProps) {
  const floatingRef = useRef<HTMLDivElement>(null);

  const { style, actualPlacement } = useFloatingConstraints(anchorRef, floatingRef, {
    placement,
    offset,
    viewportPadding,
    enabled: isOpen,
  });

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        floatingRef.current &&
        !floatingRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || typeof document === 'undefined') return null;

  const content = (
    <div
      ref={floatingRef}
      style={style}
      data-placement={actualPlacement}
      className={`z-50 select-none overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ease-caelestia-decel ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
}
