import asyncio, json, sys
from PicImageSearch import Yandex, GoogleLens, Bing

IMG = sys.argv[1]

async def run():
    results = []
    engines = []
    try:
        y = Yandex(verify_ssl=False)
        r = await y.search(url=IMG)
        for item in (r.raw or [])[:15]:
            results.append({
                "engine": "yandex",
                "title": getattr(item, "title", ""),
                "url": getattr(item, "url", ""),
                "source": getattr(item, "source", ""),
                "similarity": getattr(item, "similarity", 0),
                "content": getattr(item, "content", ""),
            })
        engines.append("yandex")
    except Exception as e:
        pass

    try:
        g = GoogleLens(verify_ssl=False)
        r = await g.search(url=IMG)
        for item in (r.raw or [])[:10]:
            results.append({
                "engine": "google_lens",
                "title": getattr(item, "title", ""),
                "url": getattr(item, "url", ""),
                "source": getattr(item, "source", ""),
                "similarity": 0,
                "content": getattr(item, "description", "") or getattr(item, "content", ""),
            })
        engines.append("google_lens")
    except Exception as e:
        pass

    try:
        b = Bing(verify_ssl=False)
        r = await b.search(url=IMG)
        for item in (r.raw or [])[:10]:
            results.append({
                "engine": "bing",
                "title": getattr(item, "title", ""),
                "url": getattr(item, "url", ""),
                "source": getattr(item, "source", ""),
                "similarity": 0,
                "content": getattr(item, "description", "") or getattr(item, "content", ""),
            })
        engines.append("bing")
    except Exception as e:
        pass

    print(json.dumps({"engines": engines, "results": results}))

asyncio.run(run())