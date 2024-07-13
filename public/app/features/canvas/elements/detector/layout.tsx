// This file is meant to be a shared file between all detector types
// that expresses the general layout of the area that will contain
// the specific detector layout.

// TODO: Some 'magic numbers' here. Should base all of these off the original EXTENTS
// Don't think it is worth it to base them off the physical detector shape, just use the
// extents as the base and adjust from there.

/**
 * Common Detector dimensions and layout constants
 */
export const DETECTOR_LAYOUT: {
  EXTENTS: { X: 400; Y: 400 };
  // These will be based on the extent boundaries which may not correspond to the physical detector boundaries
  // The phyiscal boundaries are based on the specific detector type but the must be within the extent boundaries
  COLORBAR: {
    X_OFFSET: 10;
    Y: 26.8; // Based on text size to some extent
    WIDTH: 40;
    readonly HEIGHT_OFFSET: number;
    readonly X: number;
    readonly HEIGHT: number;
  };
  VIEWBOX: {
    WIDTH_EXTRA: 120;
    HEIGHT_EXTRA: 60;
    readonly WIDTH: number;
    readonly HEIGHT: number;
  };
} = {
  EXTENTS: {
    X: 400,
    Y: 400,
  },
  COLORBAR: {
    X_OFFSET: 10,
    Y: 26.8, // Ensure space for colorbar text
    WIDTH: 40,
    get HEIGHT_OFFSET() {
      return this.Y * 2; // Space at the top and bottom for colorbar text
    },
    get X() {
      return DETECTOR_LAYOUT.EXTENTS.X + this.X_OFFSET;
    },
    get HEIGHT() {
      return DETECTOR_LAYOUT.EXTENTS.Y - this.HEIGHT_OFFSET;
    },
  },
  VIEWBOX: {
    WIDTH_EXTRA: 120, // extra width to allow for colorbar
    HEIGHT_EXTRA: 60, // extra height to allow for channel text
    get WIDTH() {
      return this.WIDTH_EXTRA + DETECTOR_LAYOUT.EXTENTS.X;
    },
    get HEIGHT() {
      return this.HEIGHT_EXTRA + DETECTOR_LAYOUT.EXTENTS.Y;
    },
  },
} as const;

export const DETECTOR_EXTENTS = {
  get x() {
    return DETECTOR_LAYOUT.EXTENTS.X;
  },
  get y() {
    return DETECTOR_LAYOUT.EXTENTS.Y;
  },
};
