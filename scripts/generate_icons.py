import math
import os
import glob
from PIL import Image, ImageDraw

def create_app_icon(size=1024, is_foreground=False):
    # If is_foreground for adaptive icon, transparent background with centered icon within 66% safe zone
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if is_foreground else (8, 14, 30, 255))
    draw = ImageDraw.Draw(img)

    center_x = size / 2.0
    center_y = size / 2.0

    if not is_foreground:
        # Background gradient circle
        for r in range(int(size * 0.48), 0, -2):
            factor = r / (size * 0.48)
            cr = int(8 + (10 - 8) * (1 - factor))
            cg = int(14 + (40 - 14) * (1 - factor))
            cb = int(30 + (70 - 30) * (1 - factor))
            draw.ellipse(
                [center_x - r, center_y - r, center_x + r, center_y + r],
                fill=(cr, cg, cb, 255)
            )

    # Base scale for elements
    scale = size / 1024.0
    # If adaptive foreground, scale down slightly to fit standard 66% safe area
    element_scale = scale * (0.65 if is_foreground else 0.85)

    # Outer neon ring gradient (Teal to Emerald to Violet)
    ring_radius = 280 * element_scale
    ring_thickness = int(28 * element_scale)

    num_segments = 120
    for i in range(num_segments):
        start_angle = (i / num_segments) * 360
        end_angle = ((i + 1.5) / num_segments) * 360
        t = i / num_segments
        if t < 0.5:
            ratio = t / 0.5
            r = int(0 * (1 - ratio) + 16 * ratio)
            g = int(242 * (1 - ratio) + 185 * ratio)
            b = int(254 * (1 - ratio) + 129 * ratio)
        else:
            ratio = (t - 0.5) / 0.5
            r = int(16 * (1 - ratio) + 139 * ratio)
            g = int(185 * (1 - ratio) + 92 * ratio)
            b = int(129 * (1 - ratio) + 246 * ratio)

        bbox = [
            center_x - ring_radius,
            center_y - ring_radius,
            center_x + ring_radius,
            center_y + ring_radius
        ]
        draw.arc(bbox, start=start_angle, end=end_angle, fill=(r, g, b, 255), width=ring_thickness)

    # Draw Headphones Arch
    headphone_radius = 180 * element_scale
    hp_thickness = int(22 * element_scale)
    hp_bbox = [
        center_x - headphone_radius,
        center_y - headphone_radius - 20 * element_scale,
        center_x + headphone_radius,
        center_y + headphone_radius - 20 * element_scale
    ]
    draw.arc(hp_bbox, start=190, end=350, fill=(255, 255, 255, 240), width=hp_thickness)

    # Ear cups (left and right rounded capsules)
    cup_w = 40 * element_scale
    cup_h = 90 * element_scale
    cup_y = center_y - 20 * element_scale

    # Left cup
    left_cup_x = center_x - headphone_radius
    draw.rounded_rectangle(
        [left_cup_x - cup_w/2, cup_y - cup_h/2, left_cup_x + cup_w/2, cup_y + cup_h/2],
        radius=int(16 * element_scale),
        fill=(0, 242, 254, 255)
    )

    # Right cup
    right_cup_x = center_x + headphone_radius
    draw.rounded_rectangle(
        [right_cup_x - cup_w/2, cup_y - cup_h/2, right_cup_x + cup_w/2, cup_y + cup_h/2],
        radius=int(16 * element_scale),
        fill=(16, 185, 129, 255)
    )

    # Center Audio Waveform Bars (Dynamic Equalizer Visualizer)
    bar_heights = [45, 90, 140, 200, 150, 100, 50]
    bar_w = 18 * element_scale
    spacing = 32 * element_scale
    total_w = len(bar_heights) * spacing - (spacing - bar_w)
    start_bar_x = center_x - total_w / 2.0 + bar_w / 2.0

    for i, bh in enumerate(bar_heights):
        actual_h = bh * element_scale
        bx = start_bar_x + i * spacing
        by_top = center_y + 10 * element_scale - actual_h / 2.0
        by_bot = center_y + 10 * element_scale + actual_h / 2.0

        t = i / float(len(bar_heights) - 1)
        br = int(0 * (1 - t) + 16 * t)
        bg = int(242 * (1 - t) + 185 * t)
        bb = int(254 * (1 - t) + 129 * t)

        draw.rounded_rectangle(
            [bx - bar_w/2, by_top, bx + bar_w/2, by_bot],
            radius=int(bar_w/2),
            fill=(br, bg, bb, 255)
        )

    return img

def main():
    os.makedirs("assets", exist_ok=True)
    
    # 1. Main Icon
    icon_1024 = create_app_icon(1024, is_foreground=False)
    icon_1024.save("assets/icon.png", "PNG")
    print("Saved assets/icon.png")

    # 2. Adaptive Foreground Icon
    adaptive_1024 = create_app_icon(1024, is_foreground=True)
    adaptive_1024.save("assets/adaptive-icon.png", "PNG")
    print("Saved assets/adaptive-icon.png")

    # 3. Favicon
    favicon = icon_1024.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save("assets/favicon.png", "PNG")
    print("Saved assets/favicon.png")

    # 4. Android Mipmap Drawables
    mipmap_configs = [
        ("mipmap-mdpi", 48, 108),
        ("mipmap-hdpi", 72, 162),
        ("mipmap-xhdpi", 96, 216),
        ("mipmap-xxhdpi", 144, 324),
        ("mipmap-xxxhdpi", 192, 432),
    ]

    res_dir = "android/app/src/main/res"
    if os.path.exists(res_dir):
        for folder, launcher_size, fg_size in mipmap_configs:
            target_folder = os.path.join(res_dir, folder)
            os.makedirs(target_folder, exist_ok=True)

            # Clean up old webp files to prevent Duplicate Resources conflict
            for webp_file in glob.glob(os.path.join(target_folder, "*.webp")):
                os.remove(webp_file)
                print(f"Removed legacy webp: {webp_file}")

            # ic_launcher.png
            launcher_img = icon_1024.resize((launcher_size, launcher_size), Image.Resampling.LANCZOS)
            launcher_img.save(os.path.join(target_folder, "ic_launcher.png"), "PNG")
            launcher_img.save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG")

            # ic_launcher_foreground.png
            fg_img = adaptive_1024.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
            fg_img.save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG")
            print(f"Saved mipmaps in {folder}")

if __name__ == "__main__":
    main()
