"""
Generate vertical attack sprites for the lancer.
The lance should point up or down while the rider/horse stay in place.
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


def is_lance_pixel(r, g, b, a):
    """Detect if pixel is part of the lance (gray/silver metal)."""
    if a < 10:
        return False

    # Lance is gray/silver - low saturation, medium-high brightness
    brightness = (r + g + b) / 3
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    saturation = (max_c - min_c) / max_c if max_c > 0 else 0

    # Gray metal colors: brightness 100-220, low saturation
    # Also include the darker gray parts
    is_gray_metal = brightness > 80 and brightness < 230 and saturation < 0.25

    # Also catch the light blue/white tip shine
    is_shine = brightness > 200 and saturation < 0.3

    return is_gray_metal or is_shine


def separate_lance_and_body(frame):
    """Separate lance pixels from body/horse pixels."""
    width, height = frame.size
    data = frame.load()

    body = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    lance = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    body_data = body.load()
    lance_data = lance.load()

    # Find the rightmost extent of non-lance pixels to determine lance start
    # The lance extends from the rider to the right

    for y in range(height):
        for x in range(width):
            r, g, b, a = data[x, y]
            if a < 10:
                continue

            # Lance pixels go to lance layer, others to body
            if is_lance_pixel(r, g, b, a) and x > 40:  # Lance is on right side
                lance_data[x, y] = (r, g, b, a)
            else:
                body_data[x, y] = (r, g, b, a)

    return body, lance


def get_lance_pivot(frame):
    """Find the pivot point where lance connects to rider (left edge of lance)."""
    width, height = frame.size
    data = frame.load()

    # Find leftmost lance pixel
    for x in range(width):
        for y in range(height):
            r, g, b, a = data[x, y]
            if a > 10 and is_lance_pixel(r, g, b, a) and x > 40:
                # Found leftmost lance pixel, pivot is slightly left of this
                return (x - 2, y)

    # Fallback to center
    return (50, 50)


def rotate_lance(lance, pivot, angle):
    """Rotate the lance around the pivot point."""
    width, height = lance.size
    lance_data = lance.load()

    result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    result_data = result.load()

    angle_rad = math.radians(angle)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    for y in range(height):
        for x in range(width):
            r, g, b, a = lance_data[x, y]
            if a < 10:
                continue

            # Rotate around pivot
            dx = x - pivot[0]
            dy = y - pivot[1]

            new_x = int(pivot[0] + dx * cos_a - dy * sin_a)
            new_y = int(pivot[1] + dx * sin_a + dy * cos_a)

            if 0 <= new_x < width and 0 <= new_y < height:
                existing = result_data[new_x, new_y]
                if existing[3] < a:
                    result_data[new_x, new_y] = (r, g, b, a)

    return result


def create_vertical_frame(frame, direction):
    """Create vertical attack frame with lance pointing up or down."""
    body, lance = separate_lance_and_body(frame)

    # Find pivot point
    pivot = get_lance_pivot(frame)

    # Rotate lance: -90 for up, +90 for down
    if direction == 'up':
        angle = -75  # Slightly less than 90 to look natural
    else:  # down
        angle = 75

    rotated_lance = rotate_lance(lance, pivot, angle)

    # Composite: body + rotated lance
    result = Image.new('RGBA', (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
    result.paste(body, (0, 0), body)
    result.paste(rotated_lance, (0, 0), rotated_lance)

    return result


def save_sprite_sheet(frames, output_path):
    """Save frames as horizontal sprite sheet."""
    total_width = FRAME_WIDTH * len(frames)
    sheet = Image.new('RGBA', (total_width, FRAME_HEIGHT), (0, 0, 0, 0))

    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * FRAME_WIDTH, 0))

    sheet.save(output_path)
    print(f"Saved: {output_path}")


def main():
    print("Generating lancer vertical attack sprites...")

    input_path = 'frontend/public/assets/units/lancer_attack.png'
    num_frames = 6

    frames = load_frames(input_path, num_frames)
    print(f"Loaded {num_frames} frames")

    # Generate up and down versions
    up_frames = []
    down_frames = []

    for frame in frames:
        up_frames.append(create_vertical_frame(frame, 'up'))
        down_frames.append(create_vertical_frame(frame, 'down'))

    save_sprite_sheet(up_frames, 'frontend/public/assets/units/lancer_attack_up.png')
    save_sprite_sheet(down_frames, 'frontend/public/assets/units/lancer_attack_down.png')

    print("Done!")


if __name__ == '__main__':
    main()
