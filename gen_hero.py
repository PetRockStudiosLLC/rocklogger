import sys
sys.path.insert(0, "E:/TripoSplat")
import krea2

img = krea2.generate(
    prompt="A wide landscape banner showing a field geologist's workspace, a stunning polished geode cross-section with glowing golden amber crystals and sparkles as the hero element, various rock and mineral specimens scattered across a dark stone surface, warm golden mineral highlights, deep charcoal and dark stone background with subtle rock texture, warm soft natural lighting from above, stylized illustrated field guide art style, tactile outdoorsy feel, polished but not photorealistic, horizontal wide composition, beautiful rich colors, dramatic depth",
    negative_prompt="text watermark logo letters words blurry low quality cartoon photorealistic white background cluttered people animals",
    seed=42,
    steps=12,
    cfg=1.0,
    width=1920,
    height=1080,
)
img.save("C:/Users/Scotty/rocklogger/assets/imgs/hero-banner-2x.png", "PNG")
print("Saved: hero-banner-2x.png")
