from PIL import Image, ImageDraw, ImageFilter
import random
import os

def create_noise_texture(filename, size, color1, color2, scale=10):
    img = Image.new('RGB', (size, size), color1)
    pixels = img.load()
    for x in range(size):
        for y in range(size):
            factor = random.random()
            r = int(color1[0] * (1-factor) + color2[0] * factor)
            g = int(color1[1] * (1-factor) + color2[1] * factor)
            b = int(color1[2] * (1-factor) + color2[2] * factor)
            pixels[x,y] = (r,g,b)
    img = img.filter(ImageFilter.GaussianBlur(radius=1))
    img.save(filename)

os.makedirs('public/assets/textures', exist_ok=True)

# Dirt: Multi-tone brown
create_noise_texture('public/assets/textures/dirt.png', 512, (60, 40, 20), (40, 30, 10))

# Bark: Darker, grittier
create_noise_texture('public/assets/textures/bark.png', 512, (30, 20, 10), (50, 40, 30))

# Metal: Dark grey with highlights
create_noise_texture('public/assets/textures/metal.png', 512, (20, 20, 25), (60, 60, 70))

# Concrete: Medium grey
create_noise_texture('public/assets/textures/concrete.png', 512, (80, 80, 80), (120, 120, 120))

print("Textures generated.")
