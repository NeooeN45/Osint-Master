import re

f = r'C:\Users\camil\pipx\venvs\ignorant\Lib\site-packages\ignorant\core.py'
c = open(f, encoding='utf-8').read()

# Le fichier est corrompu par PowerShell — les \n sont litteraux
# Reconstruire la fonction check_update proprement
c = re.sub(
    r'def check_update\(\):.*?(?=\ndef )',
    '''def check_update():
    """Check and update ignorant if not the last version"""
    try:
        check_version = httpx.get("https://pypi.org/pypi/ignorant/json", verify=False)
    except Exception:
        return
    if check_version.json()["info"]["version"] != __version__:
        if os.name != 'nt':
            p = Popen(["pip3", "install", "--upgrade", "ignorant"], stdout=PIPE, stderr=PIPE)
        else:
            p = Popen(["pip", "install", "--upgrade", "ignorant"], stdout=PIPE, stderr=PIPE)
        (output, err) = p.communicate()
        p_status = p.wait()
        print("Ignorant has just been updated, you can restart it.")
        exit()

''',
    c, flags=re.DOTALL
)

# Fix AsyncClient
c = re.sub(
    r'client = httpx\.AsyncClient\(timeout=timeout[^)]*\)',
    'client = httpx.AsyncClient(timeout=timeout, verify=False)',
    c
)

open(f, 'w', encoding='utf-8').write(c)
print("Rewritten OK")
for l in c.split('\n'):
    if 'verify' in l or 'check_update' in l or 'AsyncClient' in l:
        print(" >", l.rstrip())
