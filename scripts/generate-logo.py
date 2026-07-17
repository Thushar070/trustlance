import os
from PIL import Image, ImageDraw

def draw_shield_logo(size):
    # Create a transparent RGBA image
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # SVG space: 100x120. Scale factor to map to the square size centered
    # To keep aspect ratio and center, let's pad the height.
    # Height is 120, width is 100.
    # Let's map it into 100x120 coordinates, but scaled by scale = size / 120.0
    scale = size / 120.0
    
    # To center horizontally, calculate offset_x: (size - 100 * scale) / 2
    offset_x = (size - 100 * scale) / 2
    offset_y = 0.0 # Height fits exactly
    
    def pt(x, y):
        return (x * scale + offset_x, y * scale + offset_y)
        
    shield_pts = [
        pt(50, 5),
        pt(90, 22),
        pt(90, 55),
        pt(50, 115),
        pt(10, 55),
        pt(10, 22)
    ]
    
    # Draw shield background (fill with very subtle indigo ~5% opacity)
    draw.polygon(shield_pts, fill=(99, 102, 241, 13))
    
    # Draw shield border (stroke with indigo)
    border_width = max(1, int(8 * scale))
    for i in range(len(shield_pts)):
        p1 = shield_pts[i]
        p2 = shield_pts[(i + 1) % len(shield_pts)]
        draw.line([p1, p2], fill=(99, 102, 241, 255), width=border_width, joint="round")
        
    # Draw connection lines (diamond: 50,35 -> 70,55 -> 50,75 -> 30,55)
    diamond_pts = [pt(50, 35), pt(70, 55), pt(50, 75), pt(30, 55)]
    line_width = max(1, int(6 * scale))
    for i in range(len(diamond_pts)):
        p1 = diamond_pts[i]
        p2 = diamond_pts[(i + 1) % len(diamond_pts)]
        draw.line([p1, p2], fill=(99, 102, 241, 255), width=line_width, joint="round")
        
    # Draw circular outer node dots
    node_r = max(1, int(5 * scale))
    for p in diamond_pts:
        draw.ellipse([p[0] - node_r, p[1] - node_r, p[0] + node_r, p[1] + node_r], fill=(255, 255, 255, 255))
        
    # Draw central keyhole/node circle
    center_p = pt(50, 55)
    center_r = max(2, int(10 * scale))
    draw.ellipse([center_p[0] - center_r, center_p[1] - center_r, center_p[0] + center_r, center_p[1] + center_r], fill=(99, 102, 241, 255))
    
    # Draw central keyhole line: 50,55 to 50,68
    keyhole_p1 = pt(50, 55)
    keyhole_p2 = pt(50, 68)
    keyhole_width = max(1, int(4 * scale))
    draw.line([keyhole_p1, keyhole_p2], fill=(255, 255, 255, 255), width=keyhole_width, joint="round")
    
    return img

if __name__ == "__main__":
    os.makedirs("public", exist_ok=True)
    # Generate PWA and logo assets
    draw_shield_logo(64).save("public/logo-mark.png")
    draw_shield_logo(192).save("public/pwa-icon-192.png")
    draw_shield_logo(512).save("public/pwa-icon-512.png")
    print("Logo and PWA icons generated successfully!")
