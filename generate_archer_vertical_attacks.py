"""
Generate vertical attack sprite sheets for the archer unit.

This script creates archer_attack_up.png and archer_attack_down.png by
rotating the bow/arms assembly from the horizontal attack animation.
"""

from PIL import Image
import os

# Configuration
FRAME_WIDTH = 100
FRAME_HEIGHT = 100
NUM_FRAMES = 12
# Only use frames 0-8, skip frames 9-11 where the arrow causes a jump
OUTPUT_FRAMES = 9

# Input/output paths
INPUT_PATH = 'frontend/public/assets/units/archer_attack.png'
OUTPUT_UP_PATH = 'frontend/public/assets/units/archer_attack_up.png'
OUTPUT_DOWN_PATH = 'frontend/public/assets/units/archer_attack_down.png'


def load_sprite_sheet(path):
    """Load sprite sheet and return list of frames."""
    img = Image.open(path).convert('RGBA')
    frames = []
    for i in range(NUM_FRAMES):
        x = i * FRAME_WIDTH
        frame = img.crop((x, 0, x + FRAME_WIDTH, FRAME_HEIGHT))
        frames.append(frame)
    return frames


def get_frame_bounds(frame):
    """Get the bounding box of non-transparent pixels in a frame."""
    bbox = frame.getbbox()
    if bbox is None:
        return (0, 0, FRAME_WIDTH, FRAME_HEIGHT)
    return bbox


def analyze_frame_colors(frame):
    """Analyze pixel colors in a frame to understand the composition."""
    pixels = list(frame.getdata())
    color_counts = {}
    for px in pixels:
        if px[3] > 10:  # Non-transparent
            # Quantize to reduce noise
            key = (px[0] // 32, px[1] // 32, px[2] // 32)
            color_counts[key] = color_counts.get(key, 0) + 1
    return color_counts


def extract_bow_arms_mask(frame, center_x, center_y):
    """
    Create a mask identifying bow/arms pixels vs body pixels.

    The bow/arms are generally to the right of center (aiming right)
    and include the arm skin tones and bow wood colors.
    """
    width, height = frame.size
    mask = Image.new('L', (width, height), 0)
    frame_data = frame.load()
    mask_data = mask.load()

    # Find the bounds of the character
    bbox = frame.getbbox()
    if bbox is None:
        return mask

    left, top, right, bottom = bbox
    char_center_x = (left + right) // 2
    char_center_y = (top + bottom) // 2

    # For each non-transparent pixel, determine if it's likely bow/arms
    # Bow/arms are generally:
    # - To the right of character center (horizontal bow draw)
    # - Skin tones (arm) or brown tones (bow)
    # - The arrow and string

    for y in range(height):
        for x in range(width):
            r, g, b, a = frame_data[x, y]
            if a < 10:  # Transparent
                continue

            # Calculate distance from character center
            dx = x - char_center_x
            dy = y - char_center_y

            # Pixels to the right of center are more likely bow/arms
            # Also include pixels above and below for the bow arc
            is_bow_region = dx > -2  # Slightly to the right of center or beyond

            # Color analysis for bow/arm detection
            # Skin tones: higher R, moderate G, lower B
            is_skin_tone = r > g > b and r > 100 and r - b > 30

            # Bow wood: brown tones
            is_wood_tone = r > g > b and r > 60 and g > 40 and r < 180

            # Arrow/string: light tan/white
            is_string = r > 180 and g > 160 and b > 100

            # Combine criteria
            if is_bow_region and (is_skin_tone or is_wood_tone or is_string):
                mask_data[x, y] = 255
            elif dx > char_center_x * 0.3:  # Far right pixels are definitely bow/arms
                mask_data[x, y] = 255

    return mask


def create_vertical_frame(frame, direction='down'):
    """
    Create a vertical attack frame by rotating the bow/arms.

    direction: 'up' or 'down'
    """
    width, height = frame.size

    # Find character bounds
    bbox = frame.getbbox()
    if bbox is None:
        return frame.copy()

    left, top, right, bottom = bbox
    char_center_x = (left + right) // 2
    char_center_y = (top + bottom) // 2

    # For archer, we'll rotate the entire character sprite for cleaner results
    # The archer is small enough that full rotation looks better than partial

    # Create output image
    result = Image.new('RGBA', (width, height), (0, 0, 0, 0))

    # Extract the character pixels
    char_region = frame.crop(bbox)

    # Rotate the character region
    # For 'down': rotate 90 degrees clockwise (bow points down)
    # For 'up': rotate 90 degrees counter-clockwise (bow points up)
    angle = -90 if direction == 'down' else 90

    # Rotate around center with expansion to avoid clipping
    rotated = char_region.rotate(angle, expand=True, resample=Image.BICUBIC)

    # Calculate paste position to center the rotated sprite
    rot_width, rot_height = rotated.size
    paste_x = (width - rot_width) // 2
    paste_y = (height - rot_height) // 2

    # Paste rotated character
    result.paste(rotated, (paste_x, paste_y), rotated)

    return result


def create_smart_vertical_frame(frame, direction='down'):
    """
    More sophisticated approach: try to rotate only the bow/arms.

    This attempts to keep the body orientation while rotating the weapon.
    """
    width, height = frame.size

    bbox = frame.getbbox()
    if bbox is None:
        return frame.copy()

    left, top, right, bottom = bbox
    char_center_x = (left + right) // 2
    char_center_y = (top + bottom) // 2

    # Create output starting from original frame
    result = frame.copy()
    result_data = result.load()
    frame_data = frame.load()

    # For the archer, identify front-facing pixels (body) vs side pixels (bow/arms)
    # The body is generally centered, bow extends to the right

    # First pass: clear pixels that will be rotated
    pixels_to_rotate = []

    for y in range(height):
        for x in range(width):
            r, g, b, a = frame_data[x, y]
            if a < 10:
                continue

            dx = x - char_center_x

            # Pixels significantly to the right are bow/arms
            if dx > 3:
                pixels_to_rotate.append((x, y, r, g, b, a))
                result_data[x, y] = (0, 0, 0, 0)

    # Rotate these pixels around the character center
    angle_rad = 1.5708 if direction == 'down' else -1.5708  # 90 degrees in radians
    import math
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    for ox, oy, r, g, b, a in pixels_to_rotate:
        # Translate to origin (character center)
        dx = ox - char_center_x
        dy = oy - char_center_y

        # Rotate
        nx = dx * cos_a - dy * sin_a
        ny = dx * sin_a + dy * cos_a

        # Translate back
        new_x = int(char_center_x + nx)
        new_y = int(char_center_y + ny)

        # Bounds check and place pixel
        if 0 <= new_x < width and 0 <= new_y < height:
            result_data[new_x, new_y] = (r, g, b, a)

    return result


def create_hybrid_vertical_frame(frame, direction='down', frame_index=0, anchor_pos=None, frame0_center=None):
    """
    Rotate sprite and compensate for any movement in the original animation
    to keep the character anchored in the same position.
    """
    import math

    width, height = frame.size

    bbox = frame.getbbox()
    if bbox is None:
        return frame.copy()

    left, top, right, bottom = bbox

    # Calculate the center of the character in THIS frame
    this_center_x = (left + right) / 2
    this_center_y = (top + bottom) / 2

    # Extract character
    char_region = frame.crop(bbox)

    # Consistent rotation throughout
    base_angle = 70

    # Apply direction
    if direction == 'down':
        angle = -base_angle
    else:
        angle = base_angle

    # Rotate with bicubic resampling
    rotated = char_region.rotate(angle, expand=True, resample=Image.BICUBIC)

    # Create result canvas
    result = Image.new('RGBA', (width, height), (0, 0, 0, 0))

    rot_width, rot_height = rotated.size

    # Calculate how much this frame's center differs from frame 0
    # This compensates for any movement in the original animation
    if frame0_center is not None:
        offset_x = this_center_x - frame0_center[0]
        offset_y = this_center_y - frame0_center[1]
    else:
        offset_x = 0
        offset_y = 0

    # Target position is the anchor, minus the offset to cancel out movement
    if anchor_pos is not None:
        target_x, target_y = anchor_pos
    else:
        target_x = width // 2
        target_y = height // 2

    # When rotated, the offset direction changes
    # For 70 degree rotation, we need to rotate the offset vector too
    angle_rad = math.radians(angle)
    rotated_offset_x = offset_x * math.cos(angle_rad) - offset_y * math.sin(angle_rad)
    rotated_offset_y = offset_x * math.sin(angle_rad) + offset_y * math.cos(angle_rad)

    # Position sprite, subtracting the rotated offset to keep character stationary
    paste_x = int(target_x - rot_width / 2 - rotated_offset_x)
    paste_y = int(target_y - rot_height / 2 - rotated_offset_y)

    result.paste(rotated, (paste_x, paste_y), rotated)

    return result


def save_sprite_sheet(frames, output_path, max_frames=None):
    """Save list of frames as a horizontal sprite sheet."""
    if max_frames is not None:
        frames = frames[:max_frames]

    total_width = FRAME_WIDTH * len(frames)
    sheet = Image.new('RGBA', (total_width, FRAME_HEIGHT), (0, 0, 0, 0))

    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * FRAME_WIDTH, 0))

    sheet.save(output_path)
    print(f"Saved: {output_path} ({len(frames)} frames)")


def main():
    # Check input file exists
    if not os.path.exists(INPUT_PATH):
        print(f"Error: Input file not found: {INPUT_PATH}")
        return

    print(f"Loading sprite sheet: {INPUT_PATH}")
    frames = load_sprite_sheet(INPUT_PATH)
    print(f"Loaded {len(frames)} frames")

    # Analyze first frame to understand composition
    print("\nAnalyzing frame colors...")
    colors = analyze_frame_colors(frames[0])
    print(f"Found {len(colors)} distinct color groups")

    # Generate vertical attack frames using hybrid approach
    print("\nGenerating vertical attack frames...")

    down_frames = []
    up_frames = []

    # Calculate anchor point and frame 0 center for motion compensation
    first_bbox = frames[0].getbbox()
    if first_bbox:
        frame0_center_x = (first_bbox[0] + first_bbox[2]) / 2
        frame0_center_y = (first_bbox[1] + first_bbox[3]) / 2
        frame0_center = (frame0_center_x, frame0_center_y)
        anchor_pos = (int(frame0_center_x), int(frame0_center_y))
        print(f"  Frame 0 center: {frame0_center}")
        print(f"  Anchor position: {anchor_pos}")
    else:
        frame0_center = (FRAME_WIDTH / 2, FRAME_HEIGHT / 2)
        anchor_pos = (FRAME_WIDTH // 2, FRAME_HEIGHT // 2)

    # Analyze movement in original animation
    print("\n  Analyzing frame positions:")
    for i, frame in enumerate(frames):
        bbox = frame.getbbox()
        if bbox:
            cx = (bbox[0] + bbox[2]) / 2
            cy = (bbox[1] + bbox[3]) / 2
            dx = cx - frame0_center[0]
            dy = cy - frame0_center[1]
            print(f"    Frame {i}: center=({cx:.1f}, {cy:.1f}), offset=({dx:.1f}, {dy:.1f})")

    print()
    for i, frame in enumerate(frames):
        print(f"  Processing frame {i+1}/{len(frames)}...")
        down_frame = create_hybrid_vertical_frame(frame, 'down', i, anchor_pos, frame0_center)
        up_frame = create_hybrid_vertical_frame(frame, 'up', i, anchor_pos, frame0_center)
        down_frames.append(down_frame)
        up_frames.append(up_frame)

    # Save output sprite sheets (only first OUTPUT_FRAMES to remove jump)
    print(f"\nSaving sprite sheets (first {OUTPUT_FRAMES} frames only)...")
    save_sprite_sheet(down_frames, OUTPUT_DOWN_PATH, OUTPUT_FRAMES)
    save_sprite_sheet(up_frames, OUTPUT_UP_PATH, OUTPUT_FRAMES)

    print("\nDone! Generated:")
    print(f"  - {OUTPUT_DOWN_PATH}")
    print(f"  - {OUTPUT_UP_PATH}")
    print("\nNote: You may need to adjust the rotation angle in create_hybrid_vertical_frame()")
    print("if the results don't look right. Try angles between 60-90 degrees.")


if __name__ == '__main__':
    main()
