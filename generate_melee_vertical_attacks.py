"""
Generate vertical attack sprite sheets for melee units (knight, axeman).

This script creates _attack_up.png and _attack_down.png variants by
rotating the sprites to make weapons point vertically.
"""

from PIL import Image
import os

FRAME_WIDTH = 100
FRAME_HEIGHT = 100

# Unit configurations: (input_path, output_prefix, num_frames)
UNITS = [
    ('frontend/public/assets/units/knight_attack.png', 'frontend/public/assets/units/knight', 7),
    ('frontend/public/assets/units/axeman_attack.png', 'frontend/public/assets/units/axeman', 9),
]


def load_sprite_sheet(path, num_frames):
    """Load sprite sheet and return list of frames."""
    img = Image.open(path).convert('RGBA')
    frames = []
    for i in range(num_frames):
        x = i * FRAME_WIDTH
        frame = img.crop((x, 0, x + FRAME_WIDTH, FRAME_HEIGHT))
        frames.append(frame)
    return frames


def create_vertical_frame(frame, direction='down', frame_index=0, anchor_pos=None, frame0_center=None):
    """
    Rotate sprite to create vertical attack variant.
    Uses consistent anchor point to prevent character jumping.
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

    # Consistent rotation - 70 degrees for melee swings
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

    # Calculate offset from frame 0 to keep character stationary
    if frame0_center is not None:
        offset_x = this_center_x - frame0_center[0]
        offset_y = this_center_y - frame0_center[1]
    else:
        offset_x = 0
        offset_y = 0

    # Target position
    if anchor_pos is not None:
        target_x, target_y = anchor_pos
    else:
        target_x = width // 2
        target_y = height // 2

    # Rotate the offset vector
    angle_rad = math.radians(angle)
    rotated_offset_x = offset_x * math.cos(angle_rad) - offset_y * math.sin(angle_rad)
    rotated_offset_y = offset_x * math.sin(angle_rad) + offset_y * math.cos(angle_rad)

    # Position sprite
    paste_x = int(target_x - rot_width / 2 - rotated_offset_x)
    paste_y = int(target_y - rot_height / 2 - rotated_offset_y)

    result.paste(rotated, (paste_x, paste_y), rotated)

    return result


def save_sprite_sheet(frames, output_path):
    """Save list of frames as a horizontal sprite sheet."""
    total_width = FRAME_WIDTH * len(frames)
    sheet = Image.new('RGBA', (total_width, FRAME_HEIGHT), (0, 0, 0, 0))

    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * FRAME_WIDTH, 0))

    sheet.save(output_path)
    print(f"Saved: {output_path} ({len(frames)} frames)")


def process_unit(input_path, output_prefix, num_frames):
    """Process a single unit's attack animation."""
    print(f"\nProcessing: {input_path}")

    if not os.path.exists(input_path):
        print(f"  Error: Input file not found")
        return

    frames = load_sprite_sheet(input_path, num_frames)
    print(f"  Loaded {len(frames)} frames")

    # Calculate anchor from frame 0
    first_bbox = frames[0].getbbox()
    if first_bbox:
        frame0_center_x = (first_bbox[0] + first_bbox[2]) / 2
        frame0_center_y = (first_bbox[1] + first_bbox[3]) / 2
        frame0_center = (frame0_center_x, frame0_center_y)
        anchor_pos = (int(frame0_center_x), int(frame0_center_y))
    else:
        frame0_center = (FRAME_WIDTH / 2, FRAME_HEIGHT / 2)
        anchor_pos = (FRAME_WIDTH // 2, FRAME_HEIGHT // 2)

    # Generate vertical frames
    down_frames = []
    up_frames = []

    for i, frame in enumerate(frames):
        down_frame = create_vertical_frame(frame, 'down', i, anchor_pos, frame0_center)
        up_frame = create_vertical_frame(frame, 'up', i, anchor_pos, frame0_center)
        down_frames.append(down_frame)
        up_frames.append(up_frame)

    # Save
    save_sprite_sheet(down_frames, f"{output_prefix}_attack_down.png")
    save_sprite_sheet(up_frames, f"{output_prefix}_attack_up.png")


def main():
    print("Generating vertical attack sprites for melee units...")

    for input_path, output_prefix, num_frames in UNITS:
        process_unit(input_path, output_prefix, num_frames)

    print("\nDone!")


if __name__ == '__main__':
    main()
