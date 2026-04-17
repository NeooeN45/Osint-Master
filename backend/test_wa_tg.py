"""
Test WhatsApp + Telegram phone detection
"""
import httpx, asyncio, re, sys

async def check_whatsapp(phone_e164: str):
    clean = phone_e164.replace("+", "").replace(" ", "")
    async with httpx.AsyncClient(verify=False, timeout=12, follow_redirects=True) as c:
        r = await c.get(
            "https://api.whatsapp.com/send/?phone=" + clean + "&app_absent=0",
            headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"}
        )
        body = r.text
        # Marqueurs
        has_invalid = any(x in body for x in ["InvalidPhoneNumber", "INVALID_PHONE", "phone number is invalid"])
        has_valid   = any(x in body for x in ["StartChat", "open_chat", '"wa"', "chatUrl"])
        # Chercher champs JSON embarqués
        m_phone = re.search(r'"phone"\s*:\s*"([^"]+)"', body)
        m_app   = re.search(r'"appAbsent"\s*:\s*(\w+)', body)
        m_type  = re.search(r'"type"\s*:\s*"([^"]+)"', body)
        print(f"\n=== WhatsApp {phone_e164} ===")
        print(f"  HTTP {r.status_code} | body len: {len(body)}")
        print(f"  invalid_signal={has_invalid} | valid_signal={has_valid}")
        if m_phone: print(f"  phone field: {m_phone.group(1)}")
        if m_app:   print(f"  appAbsent: {m_app.group(1)}")
        if m_type:  print(f"  type: {m_type.group(1)}")
        # Contexte autour du numéro dans le body
        idx = body.find(clean)
        if idx > 0:
            print(f"  context: ...{body[max(0,idx-60):idx+100]}...")

async def check_telegram(phone_e164: str):
    async with httpx.AsyncClient(verify=False, timeout=12) as c:
        # Méthode 1: fragment.com API (résolution de pseudos/numéros Telegram)
        r1 = await c.get(
            "https://fragment.com/number/" + phone_e164.replace("+", "%2B"),
            headers={"User-Agent": "Mozilla/5.0"}
        )
        print(f"\n=== Telegram {phone_e164} ===")
        print(f"  fragment.com: HTTP {r1.status_code} | {r1.text[:300]}")

        # Méthode 2: API publique de prévisualisation Telegram
        r2 = await c.get(
            "https://t.me/" + phone_e164.replace("+", "").replace(" ", ""),
            headers={"User-Agent": "Mozilla/5.0"}
        )
        body2 = r2.text
        has_tg = any(x in body2 for x in ["tg://", "tg-profile", "telegram_app"])
        print(f"  t.me: HTTP {r2.status_code} | tg_signal={has_tg} | {body2[:200]}")

phone = sys.argv[1] if len(sys.argv) > 1 else "+33769723999"
invalid = "+33600000001"

async def main():
    await check_whatsapp(phone)
    await check_whatsapp(invalid)
    await check_telegram(phone)

asyncio.run(main())
