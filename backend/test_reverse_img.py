"""
Test reverse image search: TinEye + Yandex + Google
On utilise une vraie URL de photo de profil Instagram publique
"""
import httpx, asyncio, re, sys

# Photo de profil test (publique)
TEST_URL = sys.argv[1] if len(sys.argv) > 1 else "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png"

async def test_tineye(img_url: str):
    async with httpx.AsyncClient(verify=False, timeout=15, follow_redirects=True) as c:
        r = await c.get(
            "https://tineye.com/search",
            params={"url": img_url},
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124"}
        )
        body = r.text
        print(f"\n[TinEye] HTTP {r.status_code} | URL: {str(r.url)[:100]}")
        # Chercher le nb de résultats
        m = re.search(r"(\d[\d,]*)\s+results?\s+found", body, re.I)
        m2 = re.search(r'"numMatches"\s*:\s*(\d+)', body)
        m3 = re.search(r'class="results-header"[^>]*>([^<]+)', body)
        print(f"  results_found={m.group(0) if m else None}")
        print(f"  numMatches JSON={m2.group(1) if m2 else None}")
        print(f"  results header={m3.group(1).strip() if m3 else None}")
        print(f"  body[2000:2400]: {body[2000:2400]}")

async def test_yandex(img_url: str):
    async with httpx.AsyncClient(verify=False, timeout=15, follow_redirects=True) as c:
        r = await c.get(
            "https://yandex.com/images/search",
            params={"rpt": "imageview", "url": img_url},
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124"}
        )
        body = r.text
        print(f"\n[Yandex] HTTP {r.status_code} | URL: {str(r.url)[:100]}")
        # Chercher les résultats similaires
        m = re.search(r'"count"\s*:\s*(\d+)', body)
        sites = re.findall(r'"siteUrl"\s*:\s*"([^"]+)"', body)
        titles = re.findall(r'"title"\s*:\s*"([^"]{5,80})"', body)
        print(f"  count={m.group(1) if m else None}")
        print(f"  siteUrls[:5]={sites[:5]}")
        print(f"  titles[:3]={titles[:3]}")

async def test_google(img_url: str):
    async with httpx.AsyncClient(verify=False, timeout=15, follow_redirects=True) as c:
        # Google Lens via l'URL directe
        r = await c.get(
            "https://lens.google.com/uploadbyurl",
            params={"url": img_url},
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124"}
        )
        print(f"\n[Google Lens] HTTP {r.status_code} | URL finale: {str(r.url)[:120]}")
        body = r.text
        # Chercher les résultats
        urls = re.findall(r'https?://[^\s"\'<>]{20,100}', body)[:5]
        print(f"  URL dans body[:5]={urls}")

async def main():
    print(f"Testing reverse image search for: {TEST_URL}")
    await test_tineye(TEST_URL)
    await test_yandex(TEST_URL)
    await test_google(TEST_URL)

asyncio.run(main())
