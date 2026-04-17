"""
Confirme la différence de réponse Telegram entre numéro existant et inexistant
"""
import httpx, asyncio, json

async def check_tg(phone: str):
    async with httpx.AsyncClient(verify=False, timeout=12) as c:
        r = await c.post(
            "https://my.telegram.org/auth/send_password",
            data={"phone": phone},
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124",
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://my.telegram.org/auth",
                "Origin": "https://my.telegram.org",
            }
        )
        try:
            j = r.json()
            has_hash = "random_hash" in j
            is_error = "error" in j
            print(f"TG {phone:20s} => HTTP {r.status_code} | has_random_hash={has_hash} | {j}")
        except Exception:
            print(f"TG {phone:20s} => HTTP {r.status_code} | raw: {r.text[:200]}")

async def check_wa(phone: str):
    """WhatsApp via l'API d'enregistrement avec le bon platform token"""
    cc = phone.replace("+", "")[:2]
    number = phone.replace("+", "")[2:]
    async with httpx.AsyncClient(verify=False, timeout=12) as c:
        # Token platform requis par WhatsApp — utiliser celui de WhatsApp Android
        r = await c.post(
            "https://v.whatsapp.net/v2/exist",
            json={
                "cc": cc,
                "in": number,
                "lg": "fr",
                "lc": "FR",
                "platform": "android",
                "mcc": "208",   # MCC France
                "mnc": "01",
                "sim_mcc": "208",
                "sim_mnc": "01",
            },
            headers={
                "User-Agent": "WhatsApp/2.24.6.77 A",
                "Content-Type": "application/json",
                "WA-Authkey": "",
            }
        )
        print(f"WA {phone:20s} => HTTP {r.status_code} | {r.text[:200]}")

async def main():
    print("=== TELEGRAM ===")
    await check_tg("+33769723999")   # numéro réel
    await check_tg("+33600000001")   # numéro inventé
    await check_tg("+33000000000")   # numéro invalide
    print("\n=== WHATSAPP ===")
    await check_wa("+33769723999")
    await check_wa("+33600000001")

asyncio.run(main())
