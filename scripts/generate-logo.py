import os
from PIL import Image, ImageDraw

def draw_shield_logo(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    scale = size / 120.0
    offset_x = (size - 100 * scale) / 2
    offset_y = 0.0
    
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
    
    # Fill shield background (subtle white opacity)
    draw.polygon(shield_pts, fill=(255, 255, 255, 8))
    
    # Draw shield border in White
    border_width = max(1, int(8 * scale))
    for i in range(len(shield_pts)):
        p1 = shield_pts[i]
        p2 = shield_pts[(i + 1) % len(shield_pts)]
        draw.line([p1, p2], fill=(255, 255, 255, 255), width=border_width, joint="round")
        
    # Draw diamond connections in White
    diamond_pts = [pt(50, 35), pt(70, 55), pt(50, 75), pt(30, 55)]
    line_width = max(1, int(6 * scale))
    for i in range(len(diamond_pts)):
        p1 = diamond_pts[i]
        p2 = diamond_pts[(i + 1) % len(diamond_pts)]
        draw.line([p1, p2], fill=(255, 255, 255, 255), width=line_width, joint="round")
        
    # Draw outer dots (black fill, white border)
    node_r = max(1, int(5 * scale))
    outline_w = max(1, int(1.5 * scale))
    for p in diamond_pts:
        draw.ellipse([p[0] - node_r, p[1] - node_r, p[0] + node_r, p[1] + node_r], fill=(0, 0, 0, 255), outline=(255, 255, 255, 255), width=outline_w)
        
    # Draw central node circle in White
    center_p = pt(50, 55)
    center_r = max(2, int(10 * scale))
    draw.ellipse([center_p[0] - center_r, center_p[1] - center_r, center_p[0] + center_r, center_p[1] + center_r], fill=(255, 255, 255, 255))
    
    # Draw central keyhole in Black
    keyhole_p1 = pt(50, 55)
    keyhole_p2 = pt(50, 68)
    keyhole_width = max(1, int(4 * scale))
    draw.line([keyhole_p1, keyhole_p2], fill=(0, 0, 0, 255), width=keyhole_width, joint="round")
    
    return img

if __name__ == "__main__":
    os.makedirs("public", exist_ok=True)
    draw_shield_logo(64).save("public/logo-mark.png")
    draw_shield_logo(192).save("public/pwa-icon-192.png")
    draw_shield_logo(512).save("public/pwa-icon-512.png")
    print("White/black Logo and PWA icons generated successfully!")
