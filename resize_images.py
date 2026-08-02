from PIL import Image
import os

base = "C:/Users/Scotty/rocklogger"
imgs = f"{base}/assets/imgs"

# --- APP ICON: 1024x1024 → 192x192 and 512x512 ---
icon = Image.open(f"{imgs}/rocklogger-icon-1024.png").convert("RGBA")

# Maskable safe zone: keep important art within center 80%
# We don't need to crop — the 1024 gen already centers the art
# Just resize to target sizes with LANCZOS
icon_192 = icon.resize((192, 192), Image.LANCZOS)
icon_512 = icon.resize((512, 512), Image.LANCZOS)

os.makedirs(f"{base}/public/icons", exist_ok=True)
icon_192.save(f"{base}/public/icons/icon-192.png", "PNG")
icon_512.save(f"{base}/public/icons/icon-512.png", "PNG")
print(f"icon-192.png: {os.path.getsize(f'{base}/public/icons/icon-192.png')} bytes")
print(f"icon-512.png: {os.path.getsize(f'{base}/public/icons/icon-512.png')} bytes")

# --- ITCH HEADER: 1264x1008 → 630x500 ---
itch = Image.open(f"{imgs}/itch-header-2x.png").convert("RGB")
# Crop off padding first (was padded from 1260x1000 to 1264x1008)
itch_cropped = itch.crop((0, 0, 1260, 1000))
itch_final = itch_cropped.resize((630, 500), Image.LANCZOS)

os.makedirs(f"{base}/public/branding", exist_ok=True)
itch_final.save(f"{base}/public/branding/itch-header.png", "PNG")
print(f"itch-header.png: {os.path.getsize(f'{base}/public/branding/itch-header.png')} bytes")

# --- HERO BANNER: 1920x1088 → 1920x1080 ---
hero = Image.open(f"{imgs}/hero-banner-2x.png").convert("RGB")
hero_cropped = hero.crop((0, 0, 1920, 1080))

hero_final = hero_cropped.resize((1280, 720), Image.LANCZOS)
hero_final.save(f"{base}/public/branding/hero-banner.png", "PNG")
print(f"hero-banner.png: {os.path.getsize(f'{base}/public/branding/hero-banner.png')} bytes")
# Also save a 1920x1080 version
hero_full = hero_cropped  # already 1920x1080
hero_full.save(f"{base}/public/branding/hero-banner-1080p.png", "PNG")
print(f"hero-banner-1080p.png: {os.path.getsize(f'{base}/public/branding/hero-banner-1080p.png')} bytes")

print("DONE - all images resized and placed.")
