import sys
sys.path.insert(0, "E:/TripoSplat")
import krea2

img = krea2.generate(
    prompt="A horizontal field guide cover spread, a glowing geode cross-section with golden amber crystal sparkles on the left, various rock specimens arranged on a dark stone surface, warm golden mineral highlights, dark stone palette with charcoal background, polished stylized illustration, field guide quality, outdoorsy tactile feel, the title RockLogger in elegant warm golden serif letters at center, subtitle small below reading Document the rocks you find",
    negative_prompt="cartoon, photorealistic, white background, blurry, low quality, cluttered, ugly text, distorted text, pixelated",
    seed=42,
    steps=12,
    cfg=1.0,
    width=1260,
    height=1000,
)
img.save("C:/Users/Scotty/rocklogger/assets/imgs/itch-header-2x.png", "PNG")
print("Saved: itch-header-2x.png")
