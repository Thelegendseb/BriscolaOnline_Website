/**
 * Device detection utility
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface DeviceConfig {
  type: DeviceType;
  width: number;
  height: number;
  isTouchDevice: boolean;
}

/**
 * Detect device type based on viewport and user agent
 */
export function detectDevice(): DeviceType {
  // Only run on client side
  if (typeof window === 'undefined') {
    return 'desktop'; // Default to desktop for SSR
  }

  const width = window.innerWidth;
  const isTouchDevice = () => {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            ((navigator as any).msMaxTouchPoints > 0));
  };

  // Device classification
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Get full device configuration
 */
export function getDeviceConfig(): DeviceConfig {
  if (typeof window === 'undefined') {
    return {
      type: 'desktop',
      width: 1920,
      height: 1080,
      isTouchDevice: false,
    };
  }

  return {
    type: detectDevice(),
    width: window.innerWidth,
    height: window.innerHeight,
    isTouchDevice: ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0) ||
                   ((navigator as any).msMaxTouchPoints > 0),
  };
}
