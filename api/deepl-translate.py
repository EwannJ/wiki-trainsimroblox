import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")
DEEPL_URL = "https://api-free.deepl.com/v2/translate"
MAX_TEXTS = 50
MAX_CHARS = 100_000

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not DEEPL_API_KEY:
            return self.respond(500, {"error": "DEEPL_API_KEY n'est pas configurée dans les variables d'environnement Vercel."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 1_000_000:
                return self.respond(400, {"error": "Corps de requête invalide."})
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            texts = payload.get("texts")
            target = str(payload.get("target_lang", "")).upper()
            if not isinstance(texts, list) or not texts or len(texts) > MAX_TEXTS or not all(isinstance(x, str) for x in texts):
                return self.respond(400, {"error": "Il faut fournir de 1 à 50 textes."})
            if sum(len(x) for x in texts) > MAX_CHARS:
                return self.respond(413, {"error": "Textes trop volumineux."})
            if target == "FR":
                return self.respond(200, {"translations": texts})
            if not target or len(target) > 16 or not target.replace("-", "").isalnum():
                return self.respond(400, {"error": "Langue cible invalide."})
            data = [("text", value) for value in texts]
            data.extend([("target_lang", target), ("source_lang", "FR")])
            request = urllib.request.Request(DEEPL_URL, data=urllib.parse.urlencode(data).encode("utf-8"), method="POST")
            request.add_header("Authorization", f"DeepL-Auth-Key {DEEPL_API_KEY}")
            with urllib.request.urlopen(request, timeout=25) as response:
                result = json.loads(response.read().decode("utf-8"))
            return self.respond(200, {"translations": [item["text"] for item in result.get("translations", [])]})
        except urllib.error.HTTPError as exc:
            detail = ""
            try:
                detail = exc.read().decode("utf-8")[:200]
            except Exception:
                pass
            return self.respond(502, {"error": f"Échec de traduction DeepL ({exc.code}).", "detail": detail})
        except Exception:
            return self.respond(502, {"error": "Impossible de contacter DeepL ou réponse invalide."})

    def respond(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)
