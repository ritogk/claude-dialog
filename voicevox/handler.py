import json
import base64
import requests

VOICEVOX_URL = "http://localhost:50021"


def lambda_handler(event, context):
    path = event.get("rawPath", "") or event.get("path", "")
    method = (
        event.get("requestContext", {}).get("http", {}).get("method", "GET")
    )

    # Strip CloudFront prefix: /voicevox/speakers -> /speakers
    api_path = path.replace("/voicevox", "", 1)

    # GET /speakers
    if method == "GET" and api_path == "/speakers":
        resp = requests.get(f"{VOICEVOX_URL}/speakers")
        return {
            "statusCode": resp.status_code,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": resp.text,
        }

    # POST /audio_query – passthrough to VOICEVOX engine
    if method == "POST" and api_path == "/audio_query":
        qs = event.get("queryStringParameters") or {}
        text = qs.get("text", "")
        speaker = qs.get("speaker", "0")

        aq_resp = requests.post(
            f"{VOICEVOX_URL}/audio_query",
            params={"text": text, "speaker": speaker},
        )
        return {
            "statusCode": aq_resp.status_code,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": aq_resp.text,
        }

    # POST /synthesis – passthrough to VOICEVOX engine
    if method == "POST" and api_path == "/synthesis":
        qs = event.get("queryStringParameters") or {}
        speaker = qs.get("speaker", "0")
        audio_query = _parse_body(event)

        synth_resp = requests.post(
            f"{VOICEVOX_URL}/synthesis",
            params={"speaker": speaker},
            json=audio_query,
        )

        if synth_resp.status_code != 200:
            return {
                "statusCode": synth_resp.status_code,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "synthesis failed"}),
            }

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "audio/wav",
                "Access-Control-Allow-Origin": "*",
            },
            "body": base64.b64encode(synth_resp.content).decode("utf-8"),
            "isBase64Encoded": True,
        }

    # GET /health or /version
    if method == "GET" and api_path in ("/health", "/version"):
        resp = requests.get(f"{VOICEVOX_URL}/version")
        return {
            "statusCode": resp.status_code,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": resp.text,
        }

    # OPTIONS (CORS preflight)
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "",
        }

    return {
        "statusCode": 404,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"error": "Not found"}),
    }


def _parse_body(event):
    body = event.get("body", "")
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")
    return json.loads(body) if body else {}
