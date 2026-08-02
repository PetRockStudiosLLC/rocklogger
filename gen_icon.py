import sys
sys.path.insert(0, "E:/TripoSplat")
import krea2

img = krea2.generate(
    prompt="A polished geode cross-section, crystalline mineral interior with amber and golden crystal formations radiating from the center, small golden sparkles throughout, centered on dark stone rounded-square tile, warm browns and stone grays, dark charcoal background, warm soft lighting, stylized illustrated field guide art, outdoorsy feel, no text no letters",
    negative_prompt="text watermark logo letters words blurry low quality cartoon photorealistic white background cluttered",
    seed=42,
    steps=12,
    cfg=1.0,
    width=1024,
    height=1024,
)
img.save("C:/Users/Scotty/rocklogger/assets/imgs/rocklogger-icon-1024.png", "PNG")
print("Saved: rocklogger-icon-1024.png")
