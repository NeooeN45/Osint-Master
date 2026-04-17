"""Test final reverse image search avec une photo de profil Instagram"""
import asyncio, sys
from PicImageSearch import Yandex, GoogleLens, Bing

# Photo de profil Instagram publique (Cristiano Ronaldo — connue / indexée partout)
IMG = sys.argv[1] if len(sys.argv) > 1 else \
    "https://pbs.twimg.com/profile_images/1683899100922511378/5lY42eHs_400x400.jpg"

SOCIAL = {
    "instagram.com": "Instagram",
    "twitter.com": "Twitter/X",
    "x.com": "Twitter/X",
    "facebook.com": "Facebook",
    "linkedin.com": "LinkedIn",
    "tiktok.com": "TikTok",
    "pinterest.com": "Pinterest",
    "reddit.com": "Reddit",
    "sotwe.com": "Twitter mirror",
}

async def run():
    print(f"Image: {IMG[:80]}\n")

    # ── Yandex ──
    y = Yandex(verify_ssl=False)
    ry = await y.search(url=IMG)
    items_y = ry.raw or []
    print(f"[Yandex] {len(items_y)} résultats")

    social_y, other_y = [], []
    for item in items_y:
        url    = getattr(item, "url", "") or ""
        title  = getattr(item, "title", "") or ""
        domain = getattr(item, "source", "") or ""
        sim    = getattr(item, "similarity", 0) or 0
        platform = next((v for k, v in SOCIAL.items() if k in domain or k in url), None)
        if platform:
            social_y.append((platform, url, title, sim))
        else:
            other_y.append((domain, title[:60], url[:70]))

    print(f"  Profils sociaux ({len(social_y)}):")
    for p, u, t, s in social_y[:8]:
        print(f"    [{p}] {u[:80]}")
        if t: print(f"         titre: {t[:60]}")

    print(f"  Autres pages ({len(other_y)}):")
    for d, t, u in other_y[:5]:
        print(f"    [{d}] {t}")

    # Extraire usernames Instagram depuis URLs
    import re
    ig_users = list({m.group(1) for item in items_y
                     for m in [re.search(r'instagram\.com/([A-Za-z0-9._]+)/?',
                                         getattr(item, "url", "") or "")]
                     if m and m.group(1) not in ("p", "explore", "reel", "tv")})
    tw_users = list({m.group(1) for item in items_y
                     for m in [re.search(r'(?:twitter|x)\.com/([A-Za-z0-9_]+)/?',
                                         getattr(item, "url", "") or "")]
                     if m and m.group(1) not in ("search", "home", "i", "intent")})
    if ig_users: print(f"\n  Instagram usernames trouvés: {ig_users[:5]}")
    if tw_users: print(f"  Twitter usernames trouvés:   {tw_users[:5]}")

    # ── Google Lens ──
    print()
    try:
        g = GoogleLens(verify_ssl=False)
        rg = await g.search(url=IMG)
        items_g = rg.raw or []
        print(f"[Google Lens] {len(items_g)} résultats")
        for item in items_g[:5]:
            t = getattr(item, "title", "") or ""
            u = getattr(item, "url", "") or ""
            print(f"  {t[:60]} | {u[:70]}")
    except Exception as e:
        print(f"[Google Lens] Erreur: {e}")

    # ── Bing ──
    print()
    try:
        b = Bing(verify_ssl=False)
        rb = await b.search(url=IMG)
        items_b = rb.raw or []
        print(f"[Bing] {len(items_b)} résultats")
        for item in items_b[:5]:
            t = getattr(item, "title", "") or ""
            u = getattr(item, "url", "") or ""
            print(f"  {t[:60]} | {u[:70]}")
    except Exception as e:
        print(f"[Bing] Erreur: {e}")

asyncio.run(run())
