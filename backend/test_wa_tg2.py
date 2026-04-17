"""
Test méthodes alternatives WA + Telegram sans login
Même principe qu'ignorant : formulaires d'inscription qui révèlent si le numéro est "pris"
"""
import httpx, asyncio, re, json

async def check_whatsapp_register(phone_e164: str):
    """Utilise l'endpoint d'enregistrement WA (même méthode que ignorant pour Snapchat)"""
    clean = phone_e164.replace("+", "").replace(" ", "")
    cc = "33"
    number = clean[2:]  # sans le 33

    async with httpx.AsyncClient(verify=False, timeout=12) as c:
        # Méthode 1: endpoint registration WA (non-officiel)
        r = await c.post(
            "https://v.whatsapp.net/v2/exist",
            json={"cc": cc, "in": number, "lg": "fr", "lc": "FR"},
            headers={
                "User-Agent": "WhatsApp/2.24.6.77 A",
                "Content-Type": "application/json",
            }
        )
        print(f"\n[WA register] {phone_e164} => HTTP {r.status_code} | {r.text[:300]}")

        # Méthode 2: check via l'API de code SMS (différents statuts)
        r2 = await c.post(
            "https://v.whatsapp.net/v2/code",
            params={"cc": cc, "in": number, "lg": "fr", "lc": "FR", "method": "sms"},
            headers={"User-Agent": "WhatsApp/2.24.6.77 A"}
        )
        print(f"[WA code] HTTP {r2.status_code} | {r2.text[:300]}")

        # Méthode 3: URL courte wa.me avec render=false
        r3 = await c.get(
            f"https://wa.me/{clean}",
            headers={
                "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
                "Accept": "text/html"
            },
            follow_redirects=True
        )
        print(f"[WA fbot] HTTP {r3.status_code} | body[0:400]: {r3.text[:400]}")


async def check_telegram_register(phone_e164: str):
    """Utilise l'API MTProto de Telegram via le endpoint de check d'inscription"""
    # Méthode sans lib: l'API web de préinscription Telegram
    async with httpx.AsyncClient(verify=False, timeout=12, follow_redirects=True) as c:
        # Bellingcat telegram phone checker endpoint (public)
        r1 = await c.get(
            "https://t.me/+33769723999",
            headers={"User-Agent": "TelegramBot (like TwitterBot)"}
        )
        print(f"\n[TG tme-bot] HTTP {r1.status_code} | {r1.text[:300]}")

        # Méthode: API fragment.com (marketplace officiel Telegram pour numéros)
        r2 = await c.get(
            "https://fragment.com/?query=+33769723999",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        print(f"[TG fragment query] HTTP {r2.status_code} | {r2.text[500:800]}")

        # Méthode: Telegram Web vérification
        r3 = await c.post(
            "https://my.telegram.org/auth/send_password",
            data={"phone": phone_e164},
            headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"[TG my.telegram] HTTP {r3.status_code} | {r3.text[:300]}")


asyncio.run(check_whatsapp_register("+33769723999"))
asyncio.run(check_telegram_register("+33769723999"))
