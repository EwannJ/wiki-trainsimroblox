import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")
DEEPL_URL = "https://api-free.deepl.com/v2/languages?type=target"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not DEEPL_API_KEY:
            return self.respond(500, {"error": "DEEPL_API_KEY n'est pas configurée dans les variables d'environnement Vercel."})
        req = urllib.request.Request(DEEPL_URL)
        req.add_header("Authorization", f"DeepL-Auth-Key {DEEPL_API_KEY}")
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                languages = json.loads(response.read().decode("utf-8"))
            # Le français est la langue originale du site et n'est pas retourné comme langue cible.
            languages = [x for x in languages if x.get("language", "").upper() != "FR"]
            return self.respond(200, {"languages": languages})
        except urllib.error.HTTPError as exc:
            return self.respond(502, {"error": f"DeepL a répondu avec le statut {exc.code}."})
        except Exception:
            return self.respond(502, {"error": "Impossible de contacter DeepL."})

    def respond(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "public, max-age=3600")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)
