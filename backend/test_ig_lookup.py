"""
Test: Instagram /users/lookup/ — voit ce que la réponse retourne réellement
Usage: python test_ig_lookup.py +33769723999
"""
import httpx, hmac, hashlib, urllib.parse, json, sys, asyncio

USERS_LOOKUP_URL = "https://i.instagram.com/api/v1/users/lookup/"
SIG_KEY_VERSION = "4"
IG_SIG_KEY = "e6358aeede676184b9fe702b30f4fd35e71744605e39d2181a34cede076b3c33"

def gen_sig(data: str) -> str:
    sig = hmac.new(IG_SIG_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
    return f"ig_sig_key_version={SIG_KEY_VERSION}&signed_body={sig}.{urllib.parse.quote_plus(data)}"

async def lookup(phone: str):
    data = json.dumps({
        "login_attempt_count": "0",
        "directly_sign_in": "true",
        "source": "default",
        "q": phone,
        "ig_sig_key_version": SIG_KEY_VERSION,
    })
    headers = {
        "Accept-Language": "en-US",
        "User-Agent": "Instagram 101.0.0.15.120",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept-Encoding": "gzip, deflate",
        "X-FB-HTTP-Engine": "Liger",
        "Connection": "close",
    }
    async with httpx.AsyncClient(verify=False, timeout=15) as client:
        r = await client.post(USERS_LOOKUP_URL, headers=headers, data=gen_sig(data))
        print(f"HTTP {r.status_code}")
        try:
            resp = r.json()
            print(json.dumps(resp, indent=2, ensure_ascii=False))

            # Extraire les champs utiles si présents
            if "user" in resp:
                u = resp["user"]
                print("\n=== CHAMPS UTILES ===")
                for key in ["username", "full_name", "profile_pic_url", "obfuscated_email", "obfuscated_phone", "pk", "is_private", "is_verified"]:
                    if key in u:
                        print(f"  {key}: {u[key]}")
            elif "multiple_users_list" in resp:
                print(f"\n=== PLUSIEURS COMPTES LIÉS ===")
                for u in resp["multiple_users_list"]:
                    print(f"  username: {u.get('username')} | email: {u.get('obfuscated_email')} | phone: {u.get('obfuscated_phone')}")
        except Exception as e:
            print("Pas de JSON:", r.text[:500])
            print("Erreur:", e)

phone = sys.argv[1] if len(sys.argv) > 1 else "+33769723999"
print(f"Lookup: {phone}")
asyncio.run(lookup(phone))
