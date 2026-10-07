/**
 * InkVault Layout & Alignment Constraints System
 * 
 * Centralized, declarative rules for responsive viewport bounding,
 * floating dock slots, popover collision avoidance, and layout metrics.
 * Eliminates all hardcoded pixel coordinates and arbitrary magic numbers.
 */

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

// 1. Viewport & Safe Area Rules
export const VIEWPORT_CONSTRAINTS = {
  SAFE_INSET_PX: 16,
  EDGE_MARGIN_PX: 12,
  HEADER_HEIGHT_PX: 48,
  FLOATING_OFFSET_PX: 8,
  MOBILE_BREAKPOINT_PX: 640,
  TABLET_BREAKPOINT_PX: 768,
  DESKTOP_BREAKPOINT_PX: 1024,
} as const;

// 2. Sidebar Geometry Rules
export const SIDEBAR_CONSTRAINTS = {
  MIN_WIDTH: 200,
  MAX_WIDTH: 650,
  DEFAULT_WIDTH: 280,
  MAX_VIEWPORT_RATIO: 0.55,
  CONTENT_PADDING: 44,
} as const;

/**
 * Calculates a constrained sidebar width respecting minimum usability bounds,
 * maximum screen ratio, and current viewport width.
 */
export function clampSidebarWidth(
  requestedWidth: number,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
): number {
  const effectiveMax = Math.min(
    SIDEBAR_CONSTRAINTS.MAX_WIDTH,
    Math.max(SIDEBAR_CONSTRAINTS.MIN_WIDTH, Math.floor(viewportWidth * SIDEBAR_CONSTRAINTS.MAX_VIEWPORT_RATIO))
  );
  return Math.max(SIDEBAR_CONSTRAINTS.MIN_WIDTH, Math.min(effectiveMax, requestedWidth));
}

// 3. Popover & Floating Anchor Placement System
export type PopoverPlacement =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end'
  | 'auto';

export interface PopoverPositionResult {
  x: number;
  y: number;
  actualPlacement: 'top' | 'bottom';
  horizontalAlign: 'start' | 'center' | 'end';
  maxHeight: number;
}

/**
 * Pure constraint solver for popovers, menus, and floating toolbars.
 * Calculates optimal X and Y coordinates with:
 * - Viewport edge collision detection
 * - Automatic vertical flipping when approaching screen ceiling or floor
 * - Dynamic width clamping within safe margins
 */
export function calculateClampedPopoverPosition(
  anchorRect: Rect,
  contentDims: Dimensions,
  requestedPlacement: PopoverPlacement = 'auto',
  options: {
    offset?: number;
    viewportPadding?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  } = {}
): PopoverPositionResult {
  const vpWidth = options.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const vpHeight = options.viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
  const padding = options.viewportPadding ?? VIEWPORT_CONSTRAINTS.SAFE_INSET_PX;
  const offset = options.offset ?? VIEWPORT_CONSTRAINTS.FLOATING_OFFSET_PX;

  const contentW = contentDims.width || 200;
  const contentH = contentDims.height || 180;

  // Determine vertical placement
  const spaceAbove = anchorRect.top - padding;
  const spaceBelow = vpHeight - anchorRect.bottom - padding;

  let actualPlacement: 'top' | 'bottom';
  if (requestedPlacement.startsWith('top')) {
    actualPlacement = spaceAbove >= contentH || spaceAbove >= spaceBelow ? 'top' : 'bottom';
  } else if (requestedPlacement.startsWith('bottom')) {
    actualPlacement = spaceBelow >= contentH || spaceBelow >= spaceAbove ? 'bottom' : 'top';
  } else {
    // Auto placement: choose whichever side has more room
    actualPlacement = spaceAbove > spaceBelow ? 'top' : 'bottom';
  }

  // Calculate Y position
  let y: number;
  let maxHeight: number;
  if (actualPlacement === 'top') {
    y = anchorRect.top - offset - contentH;
    maxHeight = Math.max(100, spaceAbove - offset);
    if (y < padding) {
      y = padding;
    }
  } else {
    y = anchorRect.bottom + offset;
    maxHeight = Math.max(100, spaceBelow - offset);
    if (y + contentH > vpHeight - padding) {
      y = Math.max(padding, vpHeight - padding - contentH);
    }
  }

  // Determine horizontal alignment
  let horizontalAlign: 'start' | 'center' | 'end' = 'start';
  if (requestedPlacement.includes('end')) {
    horizontalAlign = 'end';
  } else if (requestedPlacement.includes('center')) {
    horizontalAlign = 'center';
  }

  // Calculate X position
  let x: number;
  if (horizontalAlign === 'center') {
    x = anchorRect.left + anchorRect.width / 2 - contentW / 2;
  } else if (horizontalAlign === 'end') {
    x = anchorRect.right - contentW;
  } else {
    x = anchorRect.left;
  }

  // Clamp X strictly within safe viewport margins
  const minX = padding;
  const maxX = Math.max(padding, vpWidth - padding - contentW);
  x = Math.max(minX, Math.min(maxX, x));

  return {
    x: Math.round(x),
    y: Math.round(y),
    actualPlacement,
    horizontalAlign,
    maxHeight: Math.round(maxHeight),
  };
}

// 4. 3D Deck Constraints for PaperStack
export const STACK_CONSTRAINTS = {
  PERSPECTIVE_PX: 1400,
  CARD_MAX_WIDTH_PX: 360,
  CARD_HEIGHT_PX: 430,
  SHADOW_WIDTH_PX: 360,
  SHADOW_HEIGHT_PX: 65,
  DEPTH_STEP_Y: 14,
  DEPTH_STEP_X: 6,
  DEPTH_STEP_Z: 36,
  BASE_ROTATE_X: 12,
  BASE_ROTATE_Y: -16,
  SCALE_STEP: 0.035,
  OPACITY_STEP: 0.14,
  MAX_DEPTH: 4,
} as const;

/**
 * Calculates rule-based transform for 3D card deck layers
 */
export function calculateStackLayerTransform(depth: number) {
  const d = Math.max(0, Math.min(STACK_CONSTRAINTS.MAX_DEPTH, depth));
  return {
    translateY: d * STACK_CONSTRAINTS.DEPTH_STEP_Y,
    translateX: d * STACK_CONSTRAINTS.DEPTH_STEP_X,
    translateZ: -d * STACK_CONSTRAINTS.DEPTH_STEP_Z,
    rotateZ: d === 0 ? 0 : (d % 2 === 1 ? -1.8 * d : 1.5 * d),
    rotateX: STACK_CONSTRAINTS.BASE_ROTATE_X + d * 1.2,
    rotateY: STACK_CONSTRAINTS.BASE_ROTATE_Y - d * 1.5,
    scale: 1 - d * STACK_CONSTRAINTS.SCALE_STEP,
    opacity: Math.max(0.4, 1 - d * STACK_CONSTRAINTS.OPACITY_STEP),
  };
}
