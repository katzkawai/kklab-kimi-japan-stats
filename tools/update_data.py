#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Fetch the latest Japan indicators directly from the World Bank API
and regenerate data/indicators.json (no intermediate CSVs needed).

Usage:
    uv run tools/update_data.py
"""
import json
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_data import INDICATORS, OUT  # noqa: E402

START_YEAR = 1990
API_URL = (
    "https://api.worldbank.org/v2/country/JPN/indicator/{code}"
    "?format=json&date={start}:{end}&per_page=20000"
)


def fetch_indicator(code: str, end_year: int) -> dict[int, float]:
    url = API_URL.format(code=code, start=START_YEAR, end=end_year)
    req = urllib.request.Request(url, headers={"User-Agent": "japan-stats-dashboard"})

    payload = None
    last_err = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                payload = json.loads(res.read().decode("utf-8"))
            break
        except Exception as e:  # タイムアウトや一時的な 5xx をリトライ
            last_err = e
            print(f"  {code}: attempt {attempt} failed ({e})", file=sys.stderr)
            time.sleep(2 * attempt)
    if payload is None:
        raise RuntimeError(f"failed to fetch {code}: {last_err}")

    if not isinstance(payload, list) or len(payload) < 2 or payload[1] is None:
        raise RuntimeError(f"unexpected API response for {code}")

    data = {}
    for row in payload[1]:
        if row["value"] is not None:
            data[int(row["date"])] = float(row["value"])
    return data


def main() -> None:
    end_year = date.today().year
    indicators = []
    all_years = set()

    for code, name, unit, fmt in INDICATORS:
        data = fetch_indicator(code, end_year)
        if not data:
            sys.exit(f"no data returned for {code}")
        years = sorted(data)
        all_years.update(years)
        latest = years[-1]
        print(f"{code:20s} {years[0]}-{latest} ({len(years)}件)  最新値: {data[latest]:,.2f}")
        indicators.append({
            "code": code,
            "name": name,
            "unit": unit,
            "format": fmt,
            "data": {str(y): data[y] for y in years},
        })

    payload = {
        "country": "日本",
        "source": "World Bank, World Development Indicators",
        "sourceUrl": "https://data.worldbank.org/country/japan",
        "generated": date.today().isoformat(),
        "range": [min(all_years), max(all_years)],
        "indicators": indicators,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nwrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
