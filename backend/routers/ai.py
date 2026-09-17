from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form, Response  # VOICE_NOCACHE_R97B
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional, List, Dict
import time, json, uuid, asyncio, os
from dependencies import (
    supabase, rate_limit, log_audit, GROQ_KEY, MODEL, VISION_MODEL, MODEL2, GROQ_URL, PROMPT, 
    _get_client_ip, validate_image_bytes, enhance_image, logger, 
    check_scan_rate, get_settings, record_ai_usage
)
import base64
import httpx
import re
from fastapi.responses import StreamingResponse

# AI_DEAD_DATE_R96: removed stale module-level date vars (computed at startup, never updated).
# Each endpoint recomputes datetime.now() inside its own function body. Safe to remove these.

# ── Shared Groq plumbing ─────────────────────────────────────────────────────
# Transient server-side failures: worth retrying the SAME model.
_TRANSIENT = {500, 502, 503, 504}
# A retired, renamed or misspelled ID lands here. Retrying is pointless, but the
# NEXT candidate may work - this is what saves us if a stale model ID is left
# configured on Render, or when Groq decommissions one on schedule.
_BAD_MODEL = {400, 404}

_ATTEMPTS_PER_MODEL = 2
_BACKOFF_SECONDS = 2.0
_VISION_TIMEOUT = 40
_TEXT_TIMEOUT = 20


def _groq_headers():
    return {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}


# ── VISION_RETRY_R107 ────────────────────────────────────────────────────────
# Scans failed with "503 over capacity" because a single vision call had no
# retry and no fallback, and its raw error body was shown to the farmer.
#
# R105 tried to fix this with a chain of Llama 4 vision models. That was wrong:
# per console.groq.com/docs, llama-4-maverick is DEPRECATED (shutdown 09/03/2026,
# already past), llama-4-scout is not in the Production table, and Groq lists
# exactly ONE model under Vision - qwen/qwen3.6-27b. Leading with dead IDs made
# every scan waste two calls before reaching the only model that works.
#
# Since there is no second vision model to fall back TO, resilience has to come
# from retrying the SAME model rather than switching. A capacity 503 is
# transient; waiting a moment and asking again is the only real remedy.
#
# Only verified-live IDs belong in this list.
_VISION_DEFAULT = "qwen/qwen3.8-27b"  # Groq's active multimodal vision model

# SCAN_REASONING_R109: Qwen 3.8 27B and GPT-OSS are reasoning-capable models on Groq.
_REASONING_CAPABLE = ("qwen", "openai/gpt-oss")
_VISION_MAX_TOKENS = 2000

# Groq caps BASE64-encoded images at 4 MB.
_GROQ_B64_LIMIT = 4 * 1024 * 1024


_VISION_CANDIDATES = [
    "qwen/qwen3.8-27b",
]

def _build_vision_models():
    """Ordered, de-duplicated list of vision model IDs to try."""
    chain = []
    if VISION_MODEL and VISION_MODEL not in chain:
        chain.append(VISION_MODEL)
    for c in _VISION_CANDIDATES:
        if c not in chain:
            chain.append(c)
    return chain


VISION_MODELS = _build_vision_models()


# ── TEXT_FALLBACK_R109 ───────────────────────────────────────────────────────
_TEXT_CANDIDATES = [
    "openai/gpt-oss-20b",
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]



def _build_text_models():
    """Ordered, de-duplicated list of text model IDs to try."""
    chain = []
    if MODEL and MODEL not in chain:
        chain.append(MODEL)
    fallback = os.environ.get("GROQ_MODEL_FALLBACK", "")
    if fallback and fallback not in chain:
        chain.append(fallback)
    for c in _TEXT_CANDIDATES:
        if c not in chain:
            chain.append(c)
    return chain


TEXT_MODELS = _build_text_models()


async def _text_completion(payload_base: dict, source: str, timeout: int = _TEXT_TIMEOUT):
    """Non-streaming Groq text call, walking TEXT_MODELS.

    Transient 5xx retries the same model with backoff. Quota (429) and a dead
    ID (400/404) advance to the next model, because neither improves by asking
    the same model again. Returns (response_json, model_used) and records usage
    against the model that actually served the request.
    """
    headers = _groq_headers()
    last_status = None

    for model in TEXT_MODELS:
        payload = dict(payload_base)
        payload["model"] = model
        if any(tag in model.lower() for tag in _REASONING_CAPABLE):
            payload["reasoning_effort"] = "none"

        for attempt in range(_ATTEMPTS_PER_MODEL):
            if attempt:
                await asyncio.sleep(_BACKOFF_SECONDS)
            try:
                async with httpx.AsyncClient(timeout=timeout) as c:
                    r = await c.post(GROQ_URL, json=payload, headers=headers)
            except Exception as e:
                logger.warning(f"{source} {model} attempt {attempt + 1} transport error: {e}")
                last_status = 502
                continue

            if r.status_code == 200:
                rj = r.json()
                try:
                    raw_msg = rj["choices"][0]["message"]["content"]
                    if raw_msg and "<think>" in raw_msg:
                        import re
                        clean_msg = re.sub(r"<think>.*?</think>", "", raw_msg, flags=re.DOTALL).strip()
                        rj["choices"][0]["message"]["content"] = clean_msg if clean_msg else raw_msg
                except Exception:
                    pass
                record_ai_usage(model, (rj.get("usage") or {}).get("total_tokens"), source)
                if model != TEXT_MODELS[0]:
                    logger.warning(f"{source} served by fallback model {model}")
                return rj, model

            last_status = r.status_code
            logger.error(f"{source} {model} upstream {r.status_code}: {r.text[:300]}")

            if r.status_code in _TRANSIENT:
                continue
            if r.status_code in _BAD_MODEL:
                logger.error(f"{source}: model {model} rejected ({r.status_code}); trying next candidate")
                break
            if r.status_code == 429:
                logger.warning(f"{source}: {model} rate limited; trying next candidate")
                break
            break

    if last_status == 429:
        raise HTTPException(429, "The AI is handling too many requests right now. Please wait a minute and try again.")
    if last_status in (401, 403):
        raise HTTPException(503, "AI API Key is invalid or suspended. Please update GROQ_API_KEY.")
    raise HTTPException(503, "AI service is busy. Please try again in a minute.")


async def _stream_text(payload_base: dict, source: str, request: Optional[Request] = None):
    """Async generator of content chunks from Groq, walking TEXT_MODELS.

    Nothing is yielded until a model returns 200, so a fallback can never splice
    two half-answers into one reply. Raises HTTPException if every candidate
    fails before any content is produced; the caller turns that into an SSE
    error event, since response headers are already on the wire by then.
    """
    headers = _groq_headers()
    last_status = None

    for model in TEXT_MODELS:
        payload = dict(payload_base)
        payload["model"] = model
        if any(tag in model.lower() for tag in _REASONING_CAPABLE):
            payload["reasoning_effort"] = "none"
        payload["stream"] = True
        payload["stream_options"] = {"include_usage": True}

        try:
            async with httpx.AsyncClient(timeout=30) as c:
                async with c.stream("POST", GROQ_URL, headers=headers, json=payload) as r:
                    if r.status_code != 200:
                        body = await r.aread()
                        last_status = r.status_code
                        logger.error(f"{source} stream {model} upstream {r.status_code}: {body[:300]}")
                        if r.status_code in _TRANSIENT or r.status_code in _BAD_MODEL or r.status_code == 429:
                            continue
                        break

                    if model != TEXT_MODELS[0]:
                        logger.warning(f"{source} stream served by fallback model {model}")

                    in_think_block = False
                    think_buffer = ""
                    async for line in r.aiter_lines():
                        if request and await request.is_disconnected():
                            logger.info(f"{source} client disconnected, aborting AI stream.")
                            return
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                        except Exception:
                            continue
                        usage = chunk.get("usage")
                        if usage:
                            record_ai_usage(model, usage.get("total_tokens"), source)
                        choices = chunk.get("choices") or []
                        if choices:
                            content = choices[0].get("delta", {}).get("content", "")
                            if content:
                                think_buffer += content
                                while think_buffer:
                                    if not in_think_block:
                                        idx = think_buffer.find("<think>")
                                        if idx != -1:
                                            if idx > 0:
                                                yield think_buffer[:idx]
                                            in_think_block = True
                                            think_buffer = think_buffer[idx + 7:]
                                        else:
                                            # Check for partial `<think>` at the end
                                            partial_idx = think_buffer.rfind("<")
                                            if partial_idx != -1 and "<think>".startswith(think_buffer[partial_idx:]):
                                                if partial_idx > 0:
                                                    yield think_buffer[:partial_idx]
                                                think_buffer = think_buffer[partial_idx:]
                                                break
                                            else:
                                                yield think_buffer
                                                think_buffer = ""
                                    else:
                                        idx = think_buffer.find("</think>")
                                        if idx != -1:
                                            in_think_block = False
                                            think_buffer = think_buffer[idx + 8:]
                                        else:
                                            partial_idx = think_buffer.rfind("<")
                                            if partial_idx != -1 and "</think>".startswith(think_buffer[partial_idx:]):
                                                think_buffer = think_buffer[partial_idx:]
                                                break
                                            else:
                                                think_buffer = ""
                    if think_buffer and not in_think_block:
                        yield think_buffer
                    return
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"{source} stream {model} transport error: {e}")
            last_status = 502
            continue

    if last_status == 429:
        raise HTTPException(429, "The AI is handling too many requests right now. Please wait a minute and try again.")
    if last_status in (401, 403):
        raise HTTPException(503, "AI API Key is invalid or suspended. Please update GROQ_API_KEY.")
    raise HTTPException(503, "AI service is busy. Please try again in a minute.")


async def _vision_completion(prompt: str, mime: str, b64: str, headers: dict):
    """Call the vision model, retrying transient failures with backoff.

    Returns (response_json, model_used). Raises HTTPException only after every
    candidate and retry is exhausted, and never leaks the provider's raw body.
    """
    last_status = None
    last_detail = ""
    had_rate_limit = False

    for model in VISION_MODELS:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ]}],
            "temperature": 0.05,
            "max_tokens": _VISION_MAX_TOKENS,
        }
        # SCAN_REASONING_R109: only Qwen accepts this; see _REASONING_CAPABLE.
        if any(tag in model.lower() for tag in _REASONING_CAPABLE):
            payload["reasoning_effort"] = "none"

        for attempt in range(_ATTEMPTS_PER_MODEL):
            if attempt:
                await asyncio.sleep(_BACKOFF_SECONDS)
            try:
                async with httpx.AsyncClient(timeout=_VISION_TIMEOUT) as c:
                    r = await c.post(GROQ_URL, json=payload, headers=headers)
            except Exception as e:
                logger.warning(f"Vision {model} attempt {attempt + 1} transport error: {e}")
                last_status, last_detail = 502, str(e)
                continue

            if r.status_code == 200:
                if attempt or model != VISION_MODELS[0]:
                    logger.warning(f"Vision recovered on {model} (attempt {attempt + 1})")
                return r.json(), model

            last_status, last_detail = r.status_code, r.text[:300]

            if r.status_code == 429:
                had_rate_limit = True
                logger.warning(f"Vision {model} rate limited (attempt {attempt + 1}): {r.text[:200]}")
                if attempt + 1 < _ATTEMPTS_PER_MODEL:
                    # Wait briefly for token bucket replenishment and retry
                    await asyncio.sleep(3.5)
                    continue
                break

            if r.status_code in _TRANSIENT:
                logger.warning(f"Vision {model} transient {r.status_code}; retrying")
                continue
            if r.status_code in _BAD_MODEL:
                # Do not burn the remaining attempts on an ID that cannot work.
                logger.error(f"Vision model {model} rejected ({r.status_code}); trying next candidate")
                break
            break

    logger.error(f"Vision failed after all attempts. Last status {last_status}: {last_detail}")
    if had_rate_limit or last_status == 429:
        raise HTTPException(
            429,
            "The AI vision scanner is experiencing high scan volume. Please wait a few seconds and try again."
        )
    if last_status in (401, 403):
        raise HTTPException(503, "AI API Key is invalid or suspended. Please update GROQ_API_KEY.")
    raise HTTPException(
        503,
        "Image analysis is temporarily unavailable because the AI service is busy. "
        "Please try again in a minute.",
    )


# WEATHER_RT_R95 — fetch real-time weather for voice bot context
async def _get_weather_context(lat: float = 18.5204, lon: float = 73.8567) -> str:
    """Fetch current weather from Open-Meteo (free, no API key) and return a brief string."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weathercode"
            f"&timezone=Asia%2FKolkata&forecast_days=1"
        )
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10)
        data = resp.json().get("current", {})
        temp = data.get("temperature_2m", "?")
        humidity = data.get("relative_humidity_2m", "?")
        rain = data.get("precipitation", 0)
        wind = data.get("wind_speed_10m", "?")
        code = data.get("weathercode", 0)
        desc = "rainy" if code >= 61 else "cloudy" if code >= 3 else "clear/sunny"
        return (
            f"Current weather (Pune area): {temp}°C, humidity {humidity}%, "
            f"wind {wind} km/h, precipitation {rain}mm, condition: {desc}."
        )
    except Exception as e:
        return f"(Weather data unavailable: {e})"

router = APIRouter()

@router.post("/api/scan")
async def scan(request: Request, file: UploadFile = File(...), lang: str = Form("en")):
    # Rate limit check
    check_scan_rate(request)

    if not GROQ_KEY:
        raise HTTPException(503, "AI service not configured. Set GROQ_API_KEY on server.")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")
    
    # Limit file size to 10MB using bounded chunks to avoid memory exhaustion
    CHUNK_SIZE = 1024 * 1024  # 1MB
    MAX_SIZE = 10 * 1024 * 1024
    chunks = []
    total_size = 0

    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_SIZE:
            raise HTTPException(413, "File too large. Maximum 10MB allowed.")
        chunks.append(chunk)

    raw = b"".join(chunks)

    if len(raw) < 100:
        raise HTTPException(400, "File too small to be a valid image.")

    # Validate actual image content (magic bytes) asynchronously in thread
    is_valid_image = await asyncio.to_thread(validate_image_bytes, raw)
    if not is_valid_image:
        raise HTTPException(400, "Invalid image file. Please upload a JPG, PNG, WebP, or GIF image.")

    # ── Enhance image for better AI accuracy in worker thread ──
    enhanced_raw, mime = await asyncio.to_thread(enhance_image, raw)

    b64  = base64.b64encode(enhanced_raw).decode()

    # SCAN_REASONING_R109: enhance_image() passes the ORIGINAL bytes through when
    # Pillow is unavailable or fails, so a large photo can still reach this point
    # at full size. Refuse it here with something actionable rather than letting
    # Groq reject the request with an opaque upstream error.
    if len(b64) > _GROQ_B64_LIMIT:
        logger.error(
            f"Scan image too large after processing: raw={len(raw)}B enhanced={len(enhanced_raw)}B "
            f"base64={len(b64)}B limit={_GROQ_B64_LIMIT}B (is Pillow installed?)"
        )
        raise HTTPException(
            413,
            "This photo is too large for the AI to process. Please upload an image under 3 MB, "
            "or retake it at a lower resolution.",
        )
    
    current_prompt = PROMPT
    if lang and lang != "en":
        lang_map = {'en':'English', 'hi':'Hindi','mr':'Marathi','te':'Telugu','ta':'Tamil','bn':'Bengali','gu':'Gujarati','kn':'Kannada','ml':'Malayalam','pa':'Punjabi'}
        full_lang = lang_map.get(lang.lower(), "English")
        current_prompt += f"\n\nMANDATORY LANGUAGE RULE: ALL text values in the JSON (crop, disease, symptoms, spread, treatment array items, prevention, accuracy_note) MUST be written in {full_lang.upper()} language using {full_lang} script. JSON keys stay in English. Example: if Hindi, write 'symptoms': 'पत्तियों पर भूरे धब्बे दिखाई दे रहे हैं' NOT in English. THIS IS NON-NEGOTIABLE."

    headers = _groq_headers()

    # VISION_RETRY_R107: retries with backoff instead of dying on one 503.
    rj, used_model = await _vision_completion(current_prompt, mime, b64, headers)

    # SCAN_REASONING_R109: surface truncation as its own failure. Before this,
    # a reply cut off by the token ceiling and a genuinely malformed reply both
    # produced the same "unexpected response" with nothing in the logs to tell
    # them apart.
    _finish = ""
    try:
        _finish = (rj.get("choices") or [{}])[0].get("finish_reason") or ""
    except Exception:
        pass

    try:
        raw_text = rj["choices"][0]["message"]["content"]
        # Strip reasoning model <think> tokens before parsing JSON
        text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
        text = text.replace("```json", "").replace("```", "").strip()
        if not text.startswith("{"):
            _s, _e = text.find("{"), text.rfind("}")
            if _s != -1 and _e >= _s:
                text = text[_s:_e+1]
        result = json.loads(text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        logger.error(f"AI response parse error on {used_model} (finish_reason={_finish!r}): {e}")
        if _finish == "length":
            raise HTTPException(
                502,
                "The AI ran out of room before finishing its analysis. Please try again.",
            )
        raise HTTPException(502, "AI returned an unexpected response. Please try again.")
    record_ai_usage(used_model, (rj.get("usage") or {}).get("total_tokens"), "scan")
    if not result.get("is_plant",True):
        raise HTTPException(422, result.get("error","No plant detected."))

    # ── Feature 2: Consensus / Cross-Check ──
    # When confidence < 80, we use a fast reasoning text model (e.g. openai/gpt-oss-20b)
    # to evaluate the visual diagnosis against Indian agricultural pathology rules.
    # This costs only ~100 text tokens, avoiding visual token rate limits and 400 multimodal errors.
    models_used = [used_model]
    try:
        raw_conf = str(result.get("confidence", 0))
        conf_digits = re.sub(r"[^\d]", "", raw_conf)
        confidence = int(conf_digits) if conf_digits else 0
        confidence = max(0, min(100, confidence))
    except Exception:
        confidence = 0
    result["confidence"] = confidence

    if confidence < 80 and MODEL:
        try:
            eval_prompt = (
                f"You are an expert agricultural pathologist in India.\n"
                f"Evaluate this crop pathology observation:\n"
                f"Crop: {result.get('crop')}\n"
                f"Identified Disease: {result.get('disease')}\n"
                f"Symptoms: {result.get('symptoms')}\n\n"
                f"Respond ONLY with raw JSON: {{\"agrees\": true, \"refined_treatment\": [\"Step 1 with brand & dose\", \"Step 2\"]}}"
            )
            payload_reason = {
                "model": MODEL,
                "messages": [{"role": "user", "content": eval_prompt}],
                "temperature": 0.05,
                "max_tokens": 400
            }
            if any(tag in MODEL.lower() for tag in _REASONING_CAPABLE):
                payload_reason["reasoning_effort"] = "none"
            async with httpx.AsyncClient(timeout=15) as c2:
                r2 = await c2.post(GROQ_URL, json=payload_reason, headers=headers)
            if r2.status_code == 200:
                rj2 = r2.json()
                record_ai_usage(MODEL, (rj2.get("usage") or {}).get("total_tokens"), "scan_consensus")
                text2 = rj2["choices"][0]["message"]["content"].strip()
                text2 = re.sub(r"<think>.*?</think>", "", text2, flags=re.DOTALL).strip()
                text2 = text2.replace("```json","").replace("```","").strip()
                if not text2.startswith("{"):
                    _s2, _e2 = text2.find("{"), text2.rfind("}")
                    if _s2 != -1 and _e2 > _s2:
                        text2 = text2[_s2:_e2+1]
                eval_res = json.loads(text2)
                models_used.append(MODEL)
                if eval_res.get("agrees") is True:
                    result["confidence"] = min(95, confidence + 10)
                if eval_res.get("refined_treatment") and len(eval_res["refined_treatment"]) >= 2:
                    result["treatment"] = eval_res["refined_treatment"]
        except Exception as e2:
            logger.warning(f"Text consensus evaluation skipped: {e2}")

    # ── Log scan to Supabase for analytics (non-blocking) ──
    if supabase:
        try:
            ip = _get_client_ip(request)
            supabase.table("scan_logs").insert({
                "ts": int(time.time()),
                "crop": result.get("crop","Unknown"),
                "disease": result.get("disease","Unknown"),
                "severity": result.get("severity","Unknown"),
                "confidence": result.get("confidence",0),
                "ambiguous": result.get("ambiguous",False),
                "lang": lang,
                "ip": ip[:45]
            }).execute()
        except Exception as _e:
            pass

    return {
        "crop": result.get("crop","Unknown"),
        "disease": result.get("disease","Unknown"),
        "pathogen": result.get("pathogen","Unknown"),
        "severity": result.get("severity","Unknown"),
        "confidence": result.get("confidence",0),
        "ambiguous": result.get("ambiguous", False),
        "alt_crop": result.get("alt_crop", None),
        "alt_disease": result.get("alt_disease", None),
        "symptoms": result.get("symptoms",""),
        "spread": result.get("spread",""),
        "treatment": result.get("treatment",[]),
        "prevention": result.get("prevention",""),
        "accuracy_note": result.get("accuracy_note",""),
        "possible_crops": result.get("possible_crops", [result.get("crop","Unknown")]),
        "possible_diseases": result.get("possible_diseases", [result.get("disease","Unknown")]),
        "models_used": models_used,
        "top5": [],
        "enhanced": True
    }


# ── Feature 5: AI Crop Doctor Chat ──
class CropDoctorRequest(BaseModel):
    question: str
    crop: str = ""
    disease: str = ""
    severity: str = ""
    stream: bool = False

@router.post("/api/crop-doctor")
async def crop_doctor(req: CropDoctorRequest, request: Request):
    rate_limit(request, max_req=10, window=60)
    if not GROQ_KEY:
        raise HTTPException(503, "AI not configured")
    prompt = f"""You are an expert Indian agricultural scientist. A farmer scanned their {req.crop} plant and the AI detected: {req.disease} (Severity: {req.severity}).
The farmer asks: \"{req.question}\"
Give a concise, practical answer in 2-3 sentences. Use simple language. Mention specific product names/doses if relevant."""
    
    # TEXT_FALLBACK_R109: no "model" key here - _text_completion/_stream_text set
    # it per candidate as they walk TEXT_MODELS.
    payload = {"messages": [{"role": "user", "content": prompt}], "max_tokens": 400, "temperature": 0.3}
    
    if req.stream:
        async def generate():
            full_answer = ""
            try:
                async for content in _stream_text(payload, "crop_doctor"):
                    full_answer += content
                    yield f"data: {json.dumps({'text': content})}\n\n"
            except HTTPException as he:
                yield f"data: {json.dumps({'error': he.detail})}\n\n"
                return
            except Exception as e:
                logger.error(f"crop-doctor stream failed: {e}")
                yield f"data: {json.dumps({'error': 'Connection interrupted. Please try again.'})}\n\n"
            
            # Log to chat_logs table after stream finishes
            if supabase and full_answer:
                try:
                    supabase.table("chat_logs").insert({
                        "question": req.question, "crop": req.crop, "disease": req.disease, "answer": full_answer, "created_at": datetime.now(timezone.utc).isoformat()
                    }).execute()
                except Exception:
                    pass
                
        return StreamingResponse(generate(), media_type="text/event-stream")

    # Fallback to non-streaming
    rj, _used = await _text_completion(payload, "crop_doctor", timeout=15)
    answer = rj["choices"][0]["message"]["content"].strip()
    
    if supabase:
        try:
            supabase.table("chat_logs").insert({
                "question": req.question, "crop": req.crop, "disease": req.disease, "answer": answer, "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception:
            pass
    
    return {"answer": answer}

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    lang: Optional[str] = "en-IN"
    client_context: Optional[str] = None
    stream: bool = False

@router.post("/api/chat")
async def chat_endpoint(req: ChatRequest, request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"  # VOICE_NOCACHE_HDR_R97B: prevent CDN caching AI chat responses
    # AI_DATE_FIX_R95 — real-time date/time for system prompt
    _now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    _today_str = _now_ist.strftime("%A, %d %B %Y")
    _time_str = _now_ist.strftime("%I:%M %p IST")
    
    rate_limit(request, max_req=15, window=60)
    if not GROQ_KEY:
        raise HTTPException(503, "AI service not configured.")
        
    settings = get_settings()
    ai_settings = settings.get("ai_settings") if settings.get("ai_settings") else {"persona": "friendly", "max_tokens": 300, "context": "", "strict_topic": True, "memory": True}
    
    # VOICE_CLIENT_CTX_SYSPROMPT_R98: use browser-supplied live weather if available; otherwise fall back to backend fetch
    _weather_ctx = ""
    if not req.client_context or "weather" not in req.client_context.lower():
        try:
            _weather_ctx = await _get_weather_context()
        except Exception:
            pass

    if req.client_context:
        # Browser sent accurate date/time + maybe weather - sanitize and cap length
        import re
        safe_client_ctx = str(req.client_context)[:500]
        safe_client_ctx = re.sub(r"[\r\n]+", " ", safe_client_ctx)
        safe_client_ctx = re.sub(r"(?i)(system prompt|ignore previous|override rules|api_key)", "", safe_client_ctx).strip()
        _real_time_ctx = safe_client_ctx + (" " + _weather_ctx if _weather_ctx else "")
    else:
        # Fallback: backend date/time + weather
        _real_time_ctx = f"Today's date: {_today_str}. Current time: {_time_str}. {_weather_ctx}"

    persona = ai_settings.get("persona", "friendly")
    # VOICE_DATE_FORCE_R97B + VOICE_CLIENT_CTX_R98: emphatic real-time facts block
    system_prompt = (
        f"[REAL-TIME FACTS — always use these exactly, never use training-data guesses] "
        f"{_real_time_ctx} "
        f"CRITICAL RULE: If the user asks what today's date, day, month, or year is, you MUST reply using ONLY the date stated above. "
        f"CRITICAL RULE: If the user asks about the weather, you MUST clearly state the exact temperature in degrees Celsius, the humidity, and the sky condition. Do NOT just say it is cloudy or clear. "
        f"If weather data is unavailable, say so clearly and advise the user to check a weather app. "
        f"You are AgroIntel, a {persona} and knowledgeable voice assistant inside the AgroIntel app for Indian farmers. "
        "Help with EVERYTHING the app offers and anything a farmer may ask: crop and plant-disease advice, weather and forecasts, "
        "mandi (market) prices, fuel prices, government schemes and subsidies, fertilizer and soil guidance, the equipment/seed marketplace, "
        "KVK contacts, agriculture news, and general practical questions useful to rural and farming families. "
        "Always give a clear, correct, useful answer. Reply in the SAME language the user used (English, Hindi, or Marathi). "
        "Keep spoken answers concise (2-4 short sentences) unless more detail is requested. "
        "Use the earlier conversation as context and remember what was already discussed. "
        "If you truly do not know something, say so briefly instead of refusing. "
    )
    
    # Inject dynamic settings
    mandi = settings.get("mandi_prices", [])
    if mandi: system_prompt += f" Today's Mandi Prices: {json.dumps(mandi)}. "
    fuel = settings.get("fuel_prices", [])
    if fuel: system_prompt += f" Today's Fuel Prices: {json.dumps(fuel)}. "

    if ai_settings.get("strict_topic"):
        system_prompt += " STRICT INSTRUCTION: Refuse to answer any non-farming/agriculture queries politely. "
        
    lang_map = {
        'en-in': 'English', 'hi-in': 'Hindi', 'mr-in': 'Marathi',
        'gu-in': 'Gujarati', 'ta-in': 'Tamil', 'te-in': 'Telugu',
        'bn-in': 'Bengali', 'pa-in': 'Punjabi', 'kn-in': 'Kannada',
        'ml-in': 'Malayalam'
    }
    if req.lang:
        full_lang = lang_map.get(req.lang.lower(), "English")
        if full_lang != "English":
            system_prompt += f" MANDATORY LANGUAGE RULE: You MUST speak strictly in {full_lang.upper()} using the {full_lang} script. Do not reply in English."
        else:
            system_prompt += f" MANDATORY LANGUAGE RULE: You MUST speak strictly in ENGLISH. Do NOT reply in Hindi, Marathi, or any other language."

    if ai_settings.get("context"):
        system_prompt += f" Today's context from the admin: {ai_settings['context']}."
        
    messages = [{"role": "system", "content": system_prompt}]
    
    MAX_HISTORY = 20  # CHAT_HISTORY_CAP_R94 — prevent runaway token usage
    if ai_settings.get("memory", True):
        # Take only the last MAX_HISTORY messages to cap token usage
        capped = req.messages[-MAX_HISTORY:]
        messages.extend([{"role": m.role, "content": m.content} for m in capped])
    else:
        # Stateless mode, just take the last user message
        last_msg = next((m for m in reversed(req.messages) if m.role == 'user'), None)
        if last_msg:
            messages.append({"role": "user", "content": last_msg.content})
    
    # TEXT_FALLBACK_R109: no "model" key - the helpers set it per candidate.
    payload = {
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": int(ai_settings.get("max_tokens", 300))
    }
    
    if req.stream:
        async def generate():
            full_answer = ""
            try:
                async for content in _stream_text(payload, "chat", request):
                    full_answer += content
                    yield f"data: {json.dumps({'text': content})}\n\n"
            except HTTPException as he:
                yield f"data: {json.dumps({'error': he.detail})}\n\n"
                return
            except Exception as e:
                logger.error(f"chat stream failed: {e}")
                yield f"data: {json.dumps({'error': 'Connection interrupted. Please try again.'})}\n\n"
            
            if supabase and full_answer:
                try:
                    question = next((m.content for m in reversed(req.messages) if m.role == 'user'), "Unknown User Query")
                    if "User says: " in question: question = question.split("User says: ")[-1]
                    supabase.table("chat_logs").insert({
                        "question": question, "crop": "Voice Assistant", "disease": "N/A", "answer": full_answer, "created_at": datetime.now(timezone.utc).isoformat()
                    }).execute()
                except Exception:
                    pass
                
        return StreamingResponse(generate(), media_type="text/event-stream")
        
    try:
        rj, _used = await _text_completion(payload, "chat", timeout=15)
        answer = rj["choices"][0]["message"]["content"].strip()
        
        # Extract question from messages
        question = next((m.content for m in reversed(req.messages) if m.role == 'user'), "Unknown User Query")
        # Clean the system prompt wrapper if present
        if "User says: " in question:
            question = question.split("User says: ")[-1]
            
        if supabase:
            try:
                supabase.table("chat_logs").insert({
                    "question": question, 
                    "crop": "Voice Assistant", 
                    "disease": "N/A", 
                    "answer": answer, 
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
            except Exception as e:
                logger.error(f"Failed to log voice chat: {e}")

        return {"response": answer}
    except HTTPException:
        # Do not swallow a deliberate 503/429 into a generic 500.
        raise
    except Exception as e:
        logger.error(f"Chat API failed: {e}")
        raise HTTPException(500, "Internal Server Error")
