// This file is meant to be a shared file between all detector types
// that expresses the general layout of the area that will contain
// the specific module (mul) layout.

// TODO: Some 'magic numbers' here. Should base all of these off the original extent
// Don't think it is worth it to base them off the physical detector shape, just use the
// extent as the base and adjust from there.

/**
 * Common Module dimensions and layout constants
 */
export const VIEWBOX_LAYOUT: {
  DETECTOR_EXTENT: { WIDTH: 400; HEIGHT: 400 };
  // These will be based on the extent boundaries which may not correspond to the physical module boundaries
  // The physical boundaries are based on the specific module type but the must be within the extent boundaries
  COLORBAR: {
    X_OFFSET: 10;
    Y: 26.8; // Based on text size to some extent
    WIDTH: 40;
    readonly HEIGHT_OFFSET: number;
    readonly X: number;
    readonly HEIGHT: number;
  };
  VIEWBOX: {
    START_X: -10;
    START_Y: -10;
    WIDTH_EXTRA: 120;
    HEIGHT_EXTRA: 60;
    readonly WIDTH: number;
    readonly HEIGHT: number;
  };
} = {
  DETECTOR_EXTENT: {
    WIDTH: 400,
    HEIGHT: 400,
  },
  COLORBAR: {
    X_OFFSET: 10,
    Y: 26.8, // Ensure space for colorbar text
    WIDTH: 40,
    get HEIGHT_OFFSET() {
      return this.Y * 2; // Space at the top and bottom for colorbar text
    },
    get X() {
      return VIEWBOX_LAYOUT.DETECTOR_EXTENT.WIDTH + this.X_OFFSET;
    },
    get HEIGHT() {
      return VIEWBOX_LAYOUT.DETECTOR_EXTENT.HEIGHT - this.HEIGHT_OFFSET;
    },
  },
  VIEWBOX: {
    START_X: -10,
    START_Y: -10,
    WIDTH_EXTRA: 120, // extra width to allow for colorbar
    HEIGHT_EXTRA: 60, // extra height to allow for channel text
    get WIDTH() {
      return this.WIDTH_EXTRA + VIEWBOX_LAYOUT.DETECTOR_EXTENT.WIDTH;
    },
    get HEIGHT() {
      return this.HEIGHT_EXTRA + VIEWBOX_LAYOUT.DETECTOR_EXTENT.HEIGHT;
    },
  },
} as const;

export const DETECTOR_VIEWBOX_EXTENT = {
  get width() {
    return VIEWBOX_LAYOUT.DETECTOR_EXTENT.WIDTH;
  },
  get height() {
    return VIEWBOX_LAYOUT.DETECTOR_EXTENT.HEIGHT;
  },
};
