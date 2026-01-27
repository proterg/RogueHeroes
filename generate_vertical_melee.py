"""
Generate vertical attack sprites:
- Body stays EXACTLY the same as original (no rotation)
- Only the slash effect is rotated to point up or down
"""

from PIL import Image
import math

FRAME_WIDTH = 100
FRAME_HEIGHT = 100


def load_frames(path, num_frames):
    """Load sprite sheet into list of frames."""
    img = Image.open(path).convert('RGBA')
    frames = []
    for i in range(num_frames):
        x = i * FRAME_WIDTH
        frame = img.crop((x, 0, x + FRAME_WIDTH, FRAME_HEIGHT))
        frames.append(frame)
    return frames


def is_swing_effect(r, g, b, a):
    """Detect if pixel is part of the sword swing effect (white/light arc)."""
    if a < 10:
        return False
    # Swing effect is typically white/light gray
    brightness = (r + g + b) / 3
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    saturation = (max_c - min_c) / max_c if max_c > 0 else 0

    return brightness > 180 and saturation < 0.3


def separate_swing_and_body(frame):
    """Separate swing effect pixels from body pixels."""
    width, height = frame.size
    data = frame.load()

    body = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    swing = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    body_data = body.load()
    swing_data = swing.load()

    for y in range(height):
        for x in range(width):
            r, g, b, a = data[x, y]
            if a < 10:
                continue
            if is_swing_effect(r, g, b, a):
                swing_data[x, y] = (r, g, b, a)
            else:
                body_data[x, y] = (r, g, b, a)

    return body, swing


def get_body_center(body):
    """Get center of body for pivot point."""
    bbox = body.getbbox()
    if bbox is None:
        return (FRAME_WIDTH // 2, FRAME_HEIGHT // 2)
    left, top, right, bottom = bbox
    return ((left + right) // 2, (top + bottom) // 2)


def rotate_swing_only(swing, pivot, angle):
    """Rotate just the swing effect around the body's center."""
    width, height = swing.size
    swing_data = swing.load()

    result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    result_data = result.load()

    angle_rad = math.radians(angle)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    for y in range(height):
        for x in range(width):
            r, g, b, a = swing_data[x, y]
            if a < 10:
                continue

            # Rotate around pivot
            dx = x - pivot[0]
            dy = y - pivot[1]

            new_x = int(pivot[0] + dx * cos_a - dy * sin_a)
            new_y = int(pivot[1] + dx * sin_a + dy * cos_a)

            if 0 <= new_x < width and 0 <= new_y < height:
                # Blend with existing pixel if any
                existing = result_data[new_x, new_y]
                if existing[3] < a:
                    result_data[new_x, new_y] = (r, g, b, a)

    return result


def create_vertical_frame(frame, direction, swing_angle):
    """
    Create vertical attack frame.
    - Body stays exactly the same
    - Only swing effect is rotated
    """
    body, swing = separate_swing_and_body(frame)

    # Get pivot point (center of body)
    pivot = get_body_center(body)

    # Apply direction to swing angle
    if direction == 'down':
        angle = -swing_angle  # Clockwise
    else:  # up
        angle = swing_angle   # Counter-clockwise

    # Rotate only the swing effect
    rotated_swing = rotate_swing_only(swing, pivot, angle)

    # Composite: body (unchanged) + rotated swing
    result = Image.new('RGBA', (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
    result.paste(body, (0, 0), body)
    result.paste(rotated_swing, (0, 0), rotated_swing)

    return result


def save_sprite_sheet(frames, output_path):
    """Save frames as horizontal sprite sheet."""
    total_width = FRAME_WIDTH * len(frames)
    sheet = Image.new('RGBA', (total_width, FRAME_HEIGHT), (0, 0, 0, 0))

    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * FRAME_WIDTH, 0))

    sheet.save(output_path)
    print(f"  Saved: {output_path}")


def process_unit(input_path, output_prefix, num_frames, swing_angle=70):
    """Process unit to create vertical attacks."""
    print(f"\nProcessing: {input_path}")

    frames = load_frames(input_path, num_frames)
    print(f"  Loaded {num_frames} frames")

    down_frames = []
    up_frames = []

    for frame in frames:
        down_frames.append(create_vertical_frame(frame, 'down', swing_angle))
        up_frames.append(create_vertical_frame(frame, 'up', swing_angle))

    save_sprite_sheet(down_frames, f"{output_prefix}_attack_down.png")
    save_sprite_sheet(up_frames, f"{output_prefix}_attack_up.png")


def main():
    print("Generating vertical attack sprites...")
    print("Body: NO rotation (stays original)")
    print("Swing effect: 70 degree rotation")

    # Knight: 7 frames
    process_unit(
        'frontend/public/assets/units/knight_attack.png',
        'frontend/public/assets/units/knight',
        7,
        swing_angle=70
    )

    # Axeman: 9 frames
    process_unit(
        'frontend/public/assets/units/axeman_attack.png',
        'frontend/public/assets/units/axeman',
        9,
        swing_angle=70
    )

    print("\nDone!")


if __name__ == '__main__':
    main()
