from fastapi import APIRouter, Request, HTTPException
import httpx, asyncio, re, os, logging, random, time
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup
from typing import Optional
from fastapi.responses import JSONResponse
import cachetools
from dependencies import supabase, rate_limit, api_cache_weather, api_cache_fert, DATAGOV_KEY, send_onesignal_price_alert

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


@router.get("/api/weather")
async def weather(req: Request, lat: float=18.5204, lon: float=73.8567):
    # RATE_LIMIT_GAP_R152: this endpoint had no rate limiting at all, unlike
    # almost every other public route in this file.
    rate_limit(req, max_req=30, window=60)
    cache_key = f"{round(lat, 2)}_{round(lon, 2)}"
    if cache_key in api_cache_weather:
        return api_cache_weather[cache_key]

    url = ("https://api.open-meteo.com/v1/forecast?latitude=" + str(lat) + "&longitude=" + str(lon)
           + "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,apparent_temperature,uv_index,precipitation,is_day,cloud_cover"
           + "&hourly=precipitation_probability,temperature_2m,relative_humidity_2m"
           + "&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,uv_index_max,wind_speed_10m_max,sunrise,sunset"
           + "&timezone=auto&forecast_days=15")
    async with httpx.AsyncClient(timeout=10) as c:
        try:
            r = await c.get(url)
            if r.status_code == 200:
                data = r.json()
                api_cache_weather[cache_key] = data
                return data
        except Exception as e:
            logger.error(f"Open-Meteo failed: {e}")

    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get("https://wttr.in/" + str(lat) + "," + str(lon) + "?format=j1")
            if r.status_code == 200:
                wdata = r.json()
                cc = wdata["current_condition"][0]
                fallback_data = {
                    "current": {
                        "temperature_2m": float(cc["temp_C"]),
                        "relative_humidity_2m": float(cc["humidity"]),
                        "wind_speed_10m": float(cc["windspeedKmph"]),
                        "weathercode": 3,
                        "apparent_temperature": float(cc["FeelsLikeC"]),
                        "precipitation": float(cc["precipMM"]),
                        "is_day": 1
                    },
                    "daily": {
                        "time": [w["date"] for w in wdata["weather"]],
                        "temperature_2m_max": [float(w["maxtempC"]) for w in wdata["weather"]],
                        "temperature_2m_min": [float(w["mintempC"]) for w in wdata["weather"]],
                        "weathercode": [3]*len(wdata["weather"]),
                        "precipitation_sum": [0.0]*len(wdata["weather"])
                    }
                }
                api_cache_weather[cache_key] = fallback_data
                return fallback_data
    except Exception as e:
        logger.error(f"Weather fallback failed: {e}")

    raise HTTPException(502, "Weather API unavailable.")


@router.get("/api/fertilizers")
async def fertilizers(req: Request):
    # RATE_LIMIT_GAP_R152: this endpoint had no rate limiting at all.
    rate_limit(req, max_req=30, window=60)
    if "data" in api_cache_fert:
        return api_cache_fert["data"]
    rates = [
        {"name": "Urea (Neem Coated 46% N)", "price": 266.50, "unit": "45kg", "formula": "46-0-0", "type": "Major NPK"},
        {"name": "DAP (Di-Ammonium Phosphate)", "price": 1350.00, "unit": "50kg", "formula": "18-46-0", "type": "Major NPK"},
        {"name": "MOP (Muriate of Potash 60% K2O)", "price": 1700.00, "unit": "50kg", "formula": "0-0-60", "type": "Major NPK"},
        {"name": "NPK (10:26:26 Complex)", "price": 1470.00, "unit": "50kg", "formula": "10-26-26", "type": "Complex"},
        {"name": "NPK (12:32:16 Complex)", "price": 1470.00, "unit": "50kg", "formula": "12-32-16", "type": "Complex"},
        {"name": "NPK (20:20:0:13 Ammonium Phos. Sulphate)", "price": 1250.00, "unit": "50kg", "formula": "20-20-0-13S", "type": "Complex"},
        {"name": "SSP (Single Super Phosphate Granular)", "price": 500.00, "unit": "50kg", "formula": "0-16-0 + 11% S", "type": "Major NPK"},
        {"name": "SSP (Single Super Phosphate Powder)", "price": 480.00, "unit": "50kg", "formula": "0-16-0 + 11% S", "type": "Major NPK"},
        {"name": "Zinc Sulphate Monohydrate (33% Zn)", "price": 680.00, "unit": "10kg", "formula": "33% Zn + 15% S", "type": "Micronutrients"},
        {"name": "Zinc Sulphate Heptahydrate (21% Zn)", "price": 520.00, "unit": "25kg", "formula": "21% Zn + 10% S", "type": "Micronutrients"},
        {"name": "Ferrous Sulphate (19% Fe)", "price": 450.00, "unit": "25kg", "formula": "19% Fe + 10.5% S", "type": "Micronutrients"},
        {"name": "Agricultural Gypsum (Soil Conditioner)", "price": 280.00, "unit": "50kg", "formula": "CaSO4 · 2H2O", "type": "Micronutrients"},
        {"name": "Boron (Disodium Octaborate 20%)", "price": 380.00, "unit": "1kg", "formula": "20% B", "type": "Micronutrients"},
        {"name": "Magnesium Sulphate (9.6% Mg)", "price": 420.00, "unit": "25kg", "formula": "9.6% Mg + 12% S", "type": "Micronutrients"}
    ]
    data = {"rates": rates, "source": "reference", "note": "Official Dept. of Fertilizers Statutory NBS MRP (2026)."}
    api_cache_fert["data"] = data
    return data


_fuel_cache = cachetools.TTLCache(maxsize=100, ttl=3600)

@router.get("/api/fuel")
async def get_fuel_prices(req: Request, city: str = "Pune"):
    rate_limit(req, max_req=30, window=60)
    return await fetch_fuel_data(city)

async def fetch_fuel_data(city: str = "Pune"):
    if len(city) > 50:
        raise HTTPException(400, "City name too long")
    city_key = city.lower().strip()

    if supabase:
        try:
            sr = supabase.table("settings").select("fuel_prices").eq("id", 1).execute()
            if sr.data and sr.data[0].get("fuel_prices"):
                fp = sr.data[0]["fuel_prices"]
                if fp.get("petrol") and fp.get("diesel"):
                    return {
                        "petrol": float(fp["petrol"]),
                        "diesel": float(fp["diesel"]),
                        "city": fp.get("city", city),
                        "source": "admin",
                        "updated": fp.get("updated", "Set by admin")
                    }
        except Exception:
            pass

    if city_key in _fuel_cache:
        return _fuel_cache[city_key]

    cleaned_city = re.sub(r'[^a-zA-Z0-9\s-]', '', city).strip()
    city_slug = re.sub(r'[\s-]+', '-', cleaned_city.lower())
    if not city_slug:
        city_slug = "pune"
    CITY_ALIASES = {
        "pimpri": "pune",
        "chinchwad": "pune",
        "pimpri-chinchwad": "pune",
        "ravet": "pune",
        "hadapsar": "pune",
        "baramati": "pune",
        "haveli": "pune",
        "bengaluru": "bangalore",
        "navi-mumbai": "mumbai",
        "thane": "mumbai",
        "gurugram": "delhi",
        "noida": "delhi",
    }
    query_slug = CITY_ALIASES.get(city_slug, city_slug)

    # Primary live source: GoodReturns (fast, accurate, unblocked)
    goodreturns_urls = [
        (f"https://www.goodreturns.in/petrol-price-in-{query_slug}.html", "petrol"),
        (f"https://www.goodreturns.in/diesel-price-in-{query_slug}.html", "diesel"),
    ]
    prices = {}
    
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"}) as c:
            for url, fuel_type in goodreturns_urls:
                try:
                    r = await c.get(url)
                    if r.status_code == 200:
                        m = re.search(r'id=["\']fp-price["\'][^>]*>.*?(\d{2,3}\.\d{2})', r.text, re.DOTALL | re.IGNORECASE)
                        if not m:
                            m = re.search(r'var fuelPrice\s*=\s*parseFloat\(["\'](\d{2,3}\.\d{2})["\']', r.text)
                        if not m:
                            m = re.search(r'Rs\.?\s*(\d{2,3}\.\d{2})/Ltr', r.text, re.IGNORECASE)
                        if m:
                            price = float(m.group(1))
                            if 70 < price < 160:
                                prices[fuel_type] = price
                except Exception as e:
                    logger.warning(f"GoodReturns fuel {fuel_type} failed for {city}: {e}")
    except Exception as e:
        logger.warning(f"GoodReturns client error: {e}")

    # Secondary fallback: NDTV
    if "petrol" not in prices or "diesel" not in prices:
        ndtv_urls = [
            ("https://www.ndtv.com/fuel-prices/petrol-price-in-" + city_slug + "-city", "petrol"),
            ("https://www.ndtv.com/fuel-prices/diesel-price-in-" + city_slug + "-city", "diesel"),
        ]
        for url, fuel_type in ndtv_urls:
            if fuel_type in prices:
                continue
            try:
                async with httpx.AsyncClient(timeout=8, follow_redirects=True,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"}) as c:
                    r = await c.get(url)
                if r.status_code == 200:
                    block_match = re.search(r'class="prcContnr"[^>]*>(.*?)</div', r.text, re.DOTALL | re.IGNORECASE)
                    if block_match:
                        num_match = re.search(r'(\d{2,3}\.\d{2})', block_match.group(1))
                        if num_match:
                            price = float(num_match.group(1))
                            if 70 < price < 160:
                                prices[fuel_type] = price
                    else:
                        matches = re.findall(r'(?:Rs\.?|\u20b9)\s*(\d{2,3}\.\d{2})', r.text)
                        valid = [float(m) for m in matches if 70 < float(m) < 160]
                        if valid:
                            prices[fuel_type] = valid[0]
            except Exception as e:
                logger.warning(f"NDTV fuel {fuel_type} failed: {e}")

    if "petrol" in prices and "diesel" in prices:
        result = {
            "petrol": prices["petrol"],
            "diesel": prices["diesel"],
            "city": city,
            "source": "live",
            "updated": datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p IST")
        }
        _fuel_cache[city_key] = result
        return result

    city_prices = {
        "pune": {"petrol": 112.04, "diesel": 98.68},
        "mumbai": {"petrol": 111.21, "diesel": 97.83},
        "delhi": {"petrol": 102.12, "diesel": 95.20},
        "bangalore": {"petrol": 110.91, "diesel": 98.80},
        "bengaluru": {"petrol": 110.91, "diesel": 98.80},
        "chennai": {"petrol": 108.17, "diesel": 99.85},
        "kolkata": {"petrol": 113.87, "diesel": 100.12},
        "hyderabad": {"petrol": 116.19, "diesel": 104.22},
        "ahmedabad": {"petrol": 102.10, "diesel": 98.11},
        "nashik": {"petrol": 109.69, "diesel": 98.58},
        "nagpur": {"petrol": 109.39, "diesel": 98.28},
        "aurangabad": {"petrol": 109.89, "diesel": 98.78},
        "lucknow": {"petrol": 104.39, "diesel": 97.08},
        "jaipur": {"petrol": 108.97, "diesel": 96.81},
        "patna": {"petrol": 110.03, "diesel": 97.15},
        "bhopal": {"petrol": 109.15, "diesel": 97.35},
    }
    city_lower = city.lower().strip()
    prices = city_prices.get(city_lower, city_prices["pune"])
    result = {
        "petrol": prices["petrol"],
        "diesel": prices["diesel"],
        "city": city,
        "source": "reference",
        "updated": "June 10, 2026, 06:00 AM IST"
    }
    _fuel_cache[city_key] = result
    return result


import random

async def scrape_agmarknet(state: str):
    """Attempt to directly scrape agmarknet.gov.in."""
    try:
        from bs4 import BeautifulSoup
        async with httpx.AsyncClient(timeout=12.0, verify=True, follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"}) as client:
            r = await client.get("https://agmarknet.gov.in/SearchCmmMkt.aspx")
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                vs = soup.find(id="__VIEWSTATE")
                vsg = soup.find(id="__VIEWSTATEGENERATOR")
                ev = soup.find(id="__EVENTVALIDATION")
                if vs and ev:
                    state_code = "MH" if "maha" in state.lower() else "UP"
                    data = {
                        "__VIEWSTATE": vs['value'],
                        "__VIEWSTATEGENERATOR": vsg['value'] if vsg else "",
                        "__EVENTVALIDATION": ev['value'],
                        "ddlState": state_code,
                        "btnGo": "Go"
                    }
                    r2 = await client.post("https://agmarknet.gov.in/SearchCmmMkt.aspx", data=data)
                    soup2 = BeautifulSoup(r2.text, 'html.parser')
                    table = soup2.find(id="cphBody_GridPriceData")
                    records = []
                    if table:
                        for row in table.find_all("tr")[1:51]:
                            cols = row.find_all("td")
                            if len(cols) >= 10:
                                records.append({
                                    "state": state,
                                    "district": cols[1].text.strip(),
                                    "market": cols[2].text.strip(),
                                    "commodity": cols[3].text.strip(),
                                    "variety": cols[4].text.strip(),
                                    "grade": cols[5].text.strip(),
                                    "arrival_date": cols[6].text.strip(),
                                    "min_price": cols[7].text.strip(),
                                    "max_price": cols[8].text.strip(),
                                    "modal_price": cols[9].text.strip(),
                                })
                        if records:
                            return {"records": records, "source": "live", "note": "Live scraped from agmarknet.gov.in"}
    except Exception as e:
        logger.error(f"Agmarknet scrape failed: {e}")
    return None


def get_fallback_mandi(state: str):
    """
    Returns Maharashtra APMC offline baseline reference prices.
    Used when government live endpoints are temporarily unreachable.
    """
    today_ts = datetime.now(timezone.utc).strftime("%d/%m/%Y 00:00")
    records = [
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Wheat", "variety": "Lok-1 / Sharbati", "grade": "FAQ", "arrival_date": today_ts, "min_price": "2500", "modal_price": "2650", "max_price": "2850"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Rice", "variety": "Indrayani / Kolam", "grade": "Grade A", "arrival_date": today_ts, "min_price": "3600", "modal_price": "4100", "max_price": "4600"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Maize", "variety": "Yellow", "grade": "FAQ", "arrival_date": today_ts, "min_price": "2200", "modal_price": "2410", "max_price": "2600"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Soyabean", "variety": "Yellow", "grade": "FAQ", "arrival_date": today_ts, "min_price": "5200", "modal_price": "5708", "max_price": "6100"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Tur Dal", "variety": "Local / Hybrid", "grade": "FAQ", "arrival_date": today_ts, "min_price": "9500", "modal_price": "10200", "max_price": "11000"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Chana", "variety": "Desi", "grade": "FAQ", "arrival_date": today_ts, "min_price": "5800", "modal_price": "6200", "max_price": "6700"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Onion", "variety": "Red Nashik", "grade": "Grade A", "arrival_date": today_ts, "min_price": "500", "modal_price": "1994", "max_price": "2200"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Potato", "variety": "Jyoti", "grade": "Grade A", "arrival_date": today_ts, "min_price": "1000", "modal_price": "1590", "max_price": "1900"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Tomato", "variety": "Hybrid", "grade": "Grade A", "arrival_date": today_ts, "min_price": "1200", "modal_price": "2852", "max_price": "3100"},
        {"state": state, "district": "Pune", "market": "Pune (Moshi)", "commodity": "Onion", "variety": "Red", "grade": "FAQ", "arrival_date": today_ts, "min_price": "600", "modal_price": "1000", "max_price": "1400"},
        {"state": state, "district": "Pune", "market": "Pune (Pimpri)", "commodity": "Onion", "variety": "Local", "grade": "FAQ", "arrival_date": today_ts, "min_price": "600", "modal_price": "1200", "max_price": "1800"},
        {"state": state, "district": "Pune", "market": "Pune (Moshi)", "commodity": "Tomato", "variety": "Deshi", "grade": "FAQ", "arrival_date": today_ts, "min_price": "2500", "modal_price": "2750", "max_price": "3000"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Soybean", "variety": "Yellow", "grade": "FAQ", "arrival_date": today_ts, "min_price": "5500", "modal_price": "5700", "max_price": "6000"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Cotton", "variety": "Long Staple", "grade": "FAQ", "arrival_date": today_ts, "min_price": "8000", "modal_price": "8500", "max_price": "9000"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Groundnut", "variety": "Bold", "grade": "FAQ", "arrival_date": today_ts, "min_price": "6800", "modal_price": "7517", "max_price": "8200"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Mustard", "variety": "Yellow", "grade": "FAQ", "arrival_date": today_ts, "min_price": "5400", "modal_price": "5900", "max_price": "6300"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Moong Dal", "variety": "Local", "grade": "FAQ", "arrival_date": today_ts, "min_price": "8000", "modal_price": "8800", "max_price": "9500"},
        {"state": state, "district": "Pune", "market": "Pune APMC", "commodity": "Ginger", "variety": "Fresh", "grade": "Grade A", "arrival_date": today_ts, "min_price": "3800", "modal_price": "4500", "max_price": "5500"},
    ]
    return {"records": records, "source": "fallback", "note": "Offline reference baseline (Agmarknet Pune APMC)"}


_mandi_cache = cachetools.TTLCache(maxsize=100, ttl=3600)


async def _one_mandi_request(api_key: str, resource_id: str, url: str) -> tuple:
    """
    Fire one data.gov.in request.
    Returns ("ok", data, resource_id) on success.
    Returns (error_reason, None, None) on failure so callers can surface the real problem.
    """
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=6.0)) as c:
            r = await c.get(url)
        if r.status_code == 200:
            data = r.json()
            if data.get("records"):
                return ("ok", data, resource_id)
            return ("zero_records", None, None)
        elif r.status_code == 403:
            return ("HTTP 403 - API key rejected or IP blocked", None, None)
        elif r.status_code == 401:
            return ("HTTP 401 - unauthorised, check DATAGOV_API_KEY", None, None)
        elif r.status_code == 429:
            return ("HTTP 429 - rate limited", None, None)
        else:
            return (f"HTTP {r.status_code}", None, None)
    except httpx.ConnectTimeout:
        return ("connect timeout (data.gov.in unreachable from Render)", None, None)
    except httpx.ReadTimeout:
        return ("read timeout (data.gov.in too slow)", None, None)
    except httpx.ConnectError as e:
        return (f"connection error ({e})", None, None)
    except Exception as e:
        return (f"{type(e).__name__}: {e}", None, None)


@router.get("/api/mandi")
async def mandi_proxy(req: Request, state: str = "Maharashtra", limit: int = 500):
    rate_limit(req, max_req=30, window=60)
    return await fetch_mandi_data(state, limit)


async def fetch_mandi_data(state: str = "Maharashtra", limit: int = 500):
    """
    Fetch live mandi/APMC prices from data.gov.in.

    All network attempts are PARALLEL (asyncio.gather), so total wait = one request timeout,
    not N x timeout. Collects error reasons for surfacing in the admin task result.
    """
    import urllib.parse
    limit = min(limit, 500)

    cache_key = f"{state}_{limit}"
    if cache_key in _mandi_cache:
        return _mandi_cache[cache_key]

    api_key = DATAGOV_KEY
    if not api_key:
        logger.warning("DATAGOV_KEY missing. Returning fallback mandi data.")
        return get_fallback_mandi(state)
    resource_ids = [
        "9ef84268-d588-465a-a308-a864a43d0070",
        "35985678-0d79-46b4-9ed6-6f13308a1d24",
    ]
    state_variants = list(dict.fromkeys([state, state.upper(), state.lower()]))
    filter_keys = ["State", "state", "State Name", "state.keyword"]

    errors: set = set()

    base = "https://api.data.gov.in/resource/"

    # --- PHASE 1: all filter combos in parallel ---
    tasks = []
    for resource_id in resource_ids:
        for state_val in state_variants:
            for fkey in filter_keys:
                fkey_enc = urllib.parse.quote(fkey, safe="")
                state_enc = urllib.parse.quote(state_val, safe="")
                url = (f"{base}{resource_id}"
                       f"?api-key={api_key}&format=json"
                       f"&filters%5B{fkey_enc}%5D={state_enc}&limit={limit}&offset=0")
                tasks.append(_one_mandi_request(api_key, resource_id, url))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    for res in results:
        if isinstance(res, Exception):
            errors.add(str(res))
        elif res:
            reason, data, resource_id = res
            if reason == "ok":
                logger.info(f"mandi: live data from {resource_id} ({len(data['records'])} records)")
                result = {**data, "source": "live", "resource": resource_id}
                _mandi_cache[cache_key] = result
                return result
            else:
                errors.add(reason)

    # --- PHASE 2: broad unfiltered queries in parallel, filter client-side ---
    broad_tasks = []
    for resource_id in resource_ids:
        url = (f"{base}{resource_id}"
               f"?api-key={api_key}&format=json&limit=500&offset=0")
        broad_tasks.append(_one_mandi_request(api_key, resource_id, url))

    broad_results = await asyncio.gather(*broad_tasks, return_exceptions=True)
    state_lower = state.lower()
    for res in broad_results:
        if isinstance(res, Exception):
            errors.add(str(res))
        elif res:
            reason, data, resource_id = res
            if reason == "ok":
                all_records = data.get("records", [])
                if all_records and isinstance(all_records, list) and len(all_records) > 0:
                    first_row = all_records[0] if isinstance(all_records[0], dict) else {}
                    state_fields = [k for k in first_row.keys() if "state" in k.lower()]
                    filtered = [
                        rec for rec in all_records
                        if any(str(rec.get(sf, "")).lower().strip() == state_lower for sf in state_fields)
                    ] if state_fields else all_records
                else:
                    filtered = []
                use_records = filtered if filtered else all_records
                logger.info(f"mandi: broad query {resource_id} total={len(all_records)} filtered={len(use_records)}")
                result = {**data, "records": use_records, "source": "live", "resource": resource_id}
                _mandi_cache[cache_key] = result
                return result
            else:
                errors.add(reason)

    # --- PHASE 3: scrape agmarknet.gov.in ---
    try:
        scraped = await scrape_agmarknet(state)
        if scraped:
            _mandi_cache[cache_key] = scraped
            return scraped
    except Exception as e:
        errors.add(f"agmarknet: {e}")
        logger.warning(f"mandi: agmarknet scrape failed: {e}")

    # --- PHASE 4: reference fallback with error diagnosis ---
    unique_errors = "; ".join(sorted(errors)) if errors else "unknown error"
    logger.warning(f"mandi: all live sources failed for state={state}. Errors: {unique_errors}")
    result = get_fallback_mandi(state)
    result["live_error"] = unique_errors
    _mandi_cache[cache_key] = result
    return result


def _to_num(v):
    try:
        return float(str(v).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


async def record_mandi_snapshot(result: dict):
    # Persist today's modal prices to mandi_history (one row per commodity+market+day).
    # Best-effort: never raises. Called by the scheduler so the 7-day chart uses REAL data.
    if not supabase:
        return
    try:
        records = result.get("records", []) if isinstance(result, dict) else []
        if not records:
            return
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        seen = set()
        rows = []
        for rec in records:
            commodity = (rec.get("commodity") or "").strip()
            market = (rec.get("market") or "").strip()
            if not commodity:
                continue
            key = (commodity, market)
            if key in seen:
                continue
            seen.add(key)
            modal = _to_num(rec.get("modal_price"))
            if modal is None:
                continue
            rows.append({
                "commodity": commodity,
                "market": market,
                "modal_price": modal,
                "min_price": _to_num(rec.get("min_price")),
                "max_price": _to_num(rec.get("max_price")),
                "snapshot_date": today,
            })
        if rows:
            supabase.table("mandi_history").upsert(
                rows, on_conflict="commodity,market,snapshot_date"
            ).execute()
            logger.info("mandi_history: stored " + str(len(rows)) + " snapshots for " + today)
            for r in rows:
                if r.get("commodity") and r.get("modal_price"):
                    await send_onesignal_price_alert(r["commodity"], r["modal_price"], r.get("market", ""))
    except Exception as e:
        logger.warning("record_mandi_snapshot failed: " + str(e))


@router.get("/api/mandi/history")
async def mandi_history(req: Request, commodity: str, days: int = 7):
    # Real daily modal-price history for one commodity (avg across markets per day).
    rate_limit(req, max_req=60, window=60)
    if not supabase:
        return {"commodity": commodity, "history": []}
    days = max(1, min(days, 30))
    try:
        commodity = commodity.strip()[:100]
        safe_commodity = commodity.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        since = (datetime.now(timezone.utc) - timedelta(days=days * 3)).strftime("%Y-%m-%d")
        r = (supabase.table("mandi_history")
             .select("modal_price, snapshot_date")
             .ilike("commodity", safe_commodity)
             .gte("snapshot_date", since)
             .order("snapshot_date", desc=False)
             .execute())
        rows = r.data or []
        by_day = {}
        for row in rows:
            d = row.get("snapshot_date")
            mp = row.get("modal_price")
            if d is None or mp is None:
                continue
            by_day.setdefault(d, []).append(float(mp))
        series = [
            {"date": d, "price": round(sum(v) / len(v))}
            for d, v in sorted(by_day.items())
        ]
        series = series[-days:]

        return {"commodity": commodity, "history": series}
    except Exception as e:
        logger.warning("mandi_history failed: " + str(e))
        return {"commodity": commodity, "history": []}


# Live News
_news_cache = cachetools.TTLCache(maxsize=10, ttl=300)

_AGRI_KEYWORDS = [
    "farm", "crop", "kisan", "agri", "mandi", "msp", "wheat", "rice", "paddy",
    "soybean", "cotton", "onion", "tomato", "sugarcane", "irrigation", "monsoon",
    "rainfall", "drought", "fertilizer", "urea", "dap", "pesticide", "soil",
    "harvest", "sowing", "kharif", "rabi", "apmc", "procurement", "subsidy",
    "pm-kisan", "fasal", "bima", "krishi", "seed", "organic", "dairy", "milk",
    "cattle", "poultry", "horticulture", "vegetable", "fruit", "pulse", "oilseed",
    "tractor", "rural", "village", "gramin", "nabard", "cooperative", "fpo",
    "weather", "imd", "flood", "cyclone", "pest", "disease", "yield", "export",
    "import", "quota", "ban", "price", "market", "trade", "storage", "godown",
]

def _is_agri_news(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in _AGRI_KEYWORDS)

@router.get("/api/news")
@router.get("/api/updates")
async def get_live_news(req: Request):
    rate_limit(req, max_req=60, window=60)
    data = await fetch_news_data()
    return JSONResponse(
        content=data,
        headers={"Cache-Control": "no-store, max-age=0, must-revalidate"}
    )

async def fetch_news_data():
    # NEWS_DYNAMIC_DATE_R96: replaced hardcoded "June 10" dates with dynamic today's date
    _today_label = datetime.now(timezone.utc).strftime("%B %d, %Y")
    fallback_news = [
        f"\U0001f33e Monsoon Advisory ({_today_label}): Maharashtra govt urges farmers to delay Kharif sowing \u2014 check IMD forecast for your district.",
        "\U0001f4b0 Farm Loan Waiver: Cabinet approves 'Punyashlok Ahilyadevi Holkar Shetkari Karjmukti Yojana 2026' with \u20b936,585 crore outlay.",
        "\U0001f4c8 Crop Trends: 10-15% increase in cotton acreage expected for 2026 Kharif season in Vidarbha and Marathwada.",
        f"\u26a0\ufe0f Damage Assessment ({_today_label}): 10-day timeline ordered for 'panchnamas' in districts hit by unseasonal rains.",
        f"\U0001f327\ufe0f IMD Advisory ({_today_label}): Check IMD forecast at imd.gov.in for your district.",
        "\U0001f4cb eNAM: 1,361+ mandis connected \u2014 sell crops online at best price across India.",
        "\U0001f331 Nano Urea: IFFCO Nano Urea (500ml = 1 bag urea) available at cooperative societies \u20b9225/bottle.",
    ]
    if "news" in _news_cache:
        return _news_cache["news"]
    
    rss_sources = [
        ("https://www.thehindubusinessline.com/economy/agri-business/feeder/default.rss", "The Hindu BusinessLine Agri"),
        ("https://www.thehindu.com/sci-tech/agriculture/feeder/default.rss", "The Hindu Agri"),
        ("https://www.downtoearth.org.in/rss/agriculture", "Down to Earth"),
        ("https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", "PIB Agriculture"),
        ("https://economictimes.indiatimes.com/news/economy/agriculture/rssfeeds/12533529.cms", "Economic Times Agri"),
        ("https://indianexpress.com/section/cities/pune/feed/", "Indian Express Pune"),
    ]
    
    import xml.etree.ElementTree as ET
    from email.utils import parsedate_to_datetime

    async def fetch_single_feed(client, url, source_name):
        try:
            r = await client.get(url)
            if r.status_code == 200 and r.text.strip():
                items = []
                try:
                    root = ET.fromstring(r.content)
                    raw_items = root.findall('.//item')[:20]
                    for item in raw_items:
                        pub_date_el = item.find('pubDate')
                        if pub_date_el is not None and pub_date_el.text:
                            try:
                                pd = parsedate_to_datetime(pub_date_el.text)
                                if (datetime.now(timezone.utc) - pd).total_seconds() > 2 * 86400:
                                    continue
                            except Exception:
                                pass
                        
                        title_el = item.find('title')
                        if title_el is not None and title_el.text:
                            title = title_el.text.strip()
                            if len(title) > 10 and (_is_agri_news(title) or "agri" in source_name.lower()):
                                items.append(f"\U0001f4f0 {title}")
                                
                        if len(items) >= 6:
                            break
                except Exception:
                    # Fallback to BeautifulSoup for forgiving HTML/XML parsing
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(r.content, "html.parser")
                    for item in soup.find_all("item")[:20]:
                        title_el = item.find("title")
                        if title_el and title_el.get_text():
                            title = title_el.get_text().strip()
                            if len(title) > 10 and (_is_agri_news(title) or "agri" in source_name.lower()):
                                items.append(f"\U0001f4f0 {title}")
                        if len(items) >= 6:
                            break

                return (source_name, items)
        except Exception as e:
            logger.warning(f"News RSS {source_name} failed: {e}")
        return (source_name, [])

    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=True, headers={"User-Agent": "AgroIntel/1.0"}) as client:
            tasks = [fetch_single_feed(client, url, name) for url, name in rss_sources]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            all_items = []
            valid_source = "Aggregated"
            
            # Combine items from successful feeds
            for res in results:
                if isinstance(res, tuple) and res[1]:
                    src, items = res
                    if not all_items:
                        valid_source = src # primary source is the first one with items
                    all_items.extend(items)
            
            if len(all_items) >= 3:
                # Deduplicate while preserving order
                seen = set()
                deduped_items = []
                for item in all_items:
                    if item not in seen:
                        seen.add(item)
                        deduped_items.append(item)
                        if len(deduped_items) >= 6:
                            break
                            
                result = {"news": deduped_items, "source": valid_source, "fetched_at": datetime.now(timezone.utc).isoformat()}
                _news_cache["news"] = result
                return result
    except Exception as e:
        logger.error(f"News aggregation failed: {e}")

    fallback_result = {
        "news": fallback_news,
        "source": "fallback",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }
    _news_cache["news"] = fallback_result
    return fallback_result
