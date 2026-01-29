/**
 * UnitIcon Component
 * ------------------
 * Displays a unit's icon using the first frame of its idle spritesheet.
 * Uses CSS background-image positioning for efficient rendering.
 */

import React from 'react';
import { getUnitIconInfo } from '../../game/data/UnitDisplay';

interface UnitIconProps {
  unitType: string;
  size?: number;        // Display size in pixels (default 24)
  showBorder?: boolean; // Show border around icon
}

/**
 * Renders the first frame of a unit's idle animation as an icon
 */
export const UnitIcon: React.FC<UnitIconProps> = ({
  unitType,
  size = 24,
  showBorder = false,
}) => {
  const iconInfo = getUnitIconInfo(unitType);
  const { frameSize, spritePath } = iconInfo;

  // Calculate scale factor from native frame size to display size
  const scale = size / frameSize;

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${spritePath})`,
        backgroundPosition: '0 0', // First frame
        backgroundSize: `auto ${size}px`, // Scale spritesheet height to display size
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        border: showBorder ? '1px solid #444' : 'none',
        borderRadius: 2,
        flexShrink: 0,
      }}
      title={iconInfo.name}
    />
  );
};

export default UnitIcon;
