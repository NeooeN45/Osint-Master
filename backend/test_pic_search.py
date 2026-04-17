"""
Test PicImageSearch: Yandex + Google + Bing reverse image
"""
import asyncio, sys
from PicImageSearch import Yandex, GoogleLens, Bing

TEST_URL = sys.argv[1] if len(sys.argv) > 1 else "https://pbs.twimg.com/profile_images/1683899100922511378/5lY42eHs_400x400.jpg"

async def main():
    print(f"=== Reverse image: {TEST_URL} ===\n")

    # Yandex
    try:
        y = Yandex(verify_ssl=False)
        res = await y.search(url=TEST_URL)
        print(f"[Yandex] status={res.status_code}")
        for r in (res.raw or [])[:5]:
            print(f"  - {getattr(r,'title','')} | {getattr(r,'url','')} | {getattr(r,'source','')}")
        if not res.raw:
            print("  Aucun résultat")
    except Exception as e:
        print(f"[Yandex] Erreur: {e}")

    # Google Lens
    try:
        g = GoogleLens(verify_ssl=False)
        res = await g.search(url=TEST_URL)
        print(f"\n[GoogleLens] status={res.status_code}")
        for r in (res.raw or [])[:5]:
            print(f"  - {getattr(r,'title','')} | {getattr(r,'url','')} | {getattr(r,'thumbnail','')[:60]}")
        if hasattr(res, 'best_guess') and res.best_guess:
            print(f"  best_guess: {res.best_guess}")
    except Exception as e:
        print(f"[GoogleLens] Erreur: {e}")

    # Bing
    try:
        b = Bing(verify_ssl=False)
        res = await b.search(url=TEST_URL)
        print(f"\n[Bing] status={res.status_code}")
        for r in (res.raw or [])[:5]:
            print(f"  - {getattr(r,'title','')} | {getattr(r,'url','')}")
    except Exception as e:
        print(f"[Bing] Erreur: {e}")

asyncio.run(main())
