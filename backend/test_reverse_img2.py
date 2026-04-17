"""
Test approfondi: Yandex reverse image + PimEyes (gratuit limité) + Google via SerpAPI-like
"""
import httpx, asyncio, re, json, sys

TEST_URL = sys.argv[1] if len(sys.argv) > 1 else "https://pbs.twimg.com/profile_images/1683899100922511378/5lY42eHs_400x400.jpg"

async def test_yandex_deep(img_url: str):
    async with httpx.AsyncClient(verify=False, timeout=15, follow_redirects=True) as c:
        r = await c.get(
            "https://yandex.com/images/search",
            params={"rpt": "imageview", "url": img_url},
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        body = r.text
        print(f"[Yandex] HTTP {r.status_code}")

        # Extraire le JSON d'état de la page (window.__REDUX_STATE__ ou data-state)
        m_redux = re.search(r'window\.__redux_state__\s*=\s*({.+?});</script>', body, re.S)
        m_data  = re.search(r'"serpData"\s*:\s*({.+?})\s*,\s*"serpParams"', body, re.S)

        # Chercher les sites avec sources
        sources = re.findall(r'"url"\s*:\s*"(https?://[^"]{10,120})"', body)
        titles  = re.findall(r'"title"\s*:\s*"([^"]{5,100})"', body)
        domains = list({re.sub(r'https?://([^/]+).*', r'\1', u) for u in sources[:30]})

        print(f"  Sources URL uniques: {len(sources)}")
        print(f"  Domaines trouvés: {domains[:10]}")
        print(f"  Titres: {titles[:5]}")

        # Chercher lien de résultat "voir toutes les images similaires"
        similar = re.search(r'(https://yandex\.com/images/search\?[^"\']{20,200})', body)
        if similar:
            print(f"  Lien similaires: {similar.group(1)[:150]}")

async def test_google_lens_api(img_url: str):
    """Google Lens via l'API non-officielle"""
    async with httpx.AsyncClient(verify=False, timeout=15, follow_redirects=True) as c:
        # Méthode 1: Google Images search by image URL
        r1 = await c.get(
            "https://www.google.com/searchbyimage",
            params={"image_url": img_url, "safe": "off"},
            headers={
                "User-Agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6) Chrome/112",
                "Accept": "text/html",
            }
        )
        body1 = r1.text
        print(f"\n[Google Images] HTTP {r1.status_code} | URL: {str(r1.url)[:120]}")
        # Extraire les résultats visuels
        titles  = re.findall(r'<h3[^>]*>([^<]{5,80})</h3>', body1)[:5]
        matches = re.findall(r'"ou":"(https?://[^"]+)"', body1)[:5]
        print(f"  Titres: {titles}")
        print(f"  Image URLs: {matches}")
        # Chercher "Pages contenant des images correspondantes"
        pages = re.findall(r'"1000":\["([^"]+)"', body1)[:5]
        print(f"  Pages matching: {pages}")

async def test_tineye_api(img_url: str):
    """TinEye via leur API publique (pas de JS requis pour l'API JSON)"""
    async with httpx.AsyncClient(verify=False, timeout=15) as c:
        r = await c.get(
            "https://api.tineye.com/rest/search/",
            params={"url": img_url, "limit": 5, "offset": 0},
            headers={"User-Agent": "Mozilla/5.0"}
        )
        print(f"\n[TinEye API] HTTP {r.status_code} | {r.text[:300]}")

async def main():
    print(f"Reverse image search: {TEST_URL}\n")
    await test_yandex_deep(TEST_URL)
    await test_google_lens_api(TEST_URL)
    await test_tineye_api(TEST_URL)

asyncio.run(main())
