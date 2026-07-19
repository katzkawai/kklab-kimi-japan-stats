#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Merge World Bank WDI CSV exports (Japan) into data/indicators.json for the dashboard.

Input CSVs are produced via the world_bank_open_data data source
(columns: indicator,country,date,unit,value).
"""
import csv
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "indicators.json"

INDICATORS = [
    ("NY.GDP.MKTP.CD",    "GDP（名目・米ドル）",          "兆米ドル", "trillionUSD"),
    ("NY.GDP.MKTP.KD.ZG", "実質GDP成長率",                "%",       "percent"),
    ("NY.GDP.PCAP.CD",    "一人当たりGDP（名目・米ドル）", "米ドル",   "usd"),
    ("FP.CPI.TOTL.ZG",    "消費者物価上昇率（インフレ率）", "%",       "percent"),
    ("SL.UEM.TOTL.ZS",    "失業率（ILO推計）",            "%",       "percent"),
    ("SP.POP.TOTL",       "総人口",                       "百万人",   "millionPeople"),
    ("SP.POP.GROW",       "人口増加率",                   "%",       "percent"),
    ("PA.NUS.FCRF",       "為替レート（円/米ドル・年平均）", "円/ドル", "yen"),
    ("BN.CAB.XOKA.GD.ZS", "経常収支（対GDP比）",          "%",       "percent"),
    ("NE.EXP.GNFS.ZS",    "輸出（対GDP比）",              "%",       "percent"),
    ("NE.IMP.GNFS.ZS",    "輸入（対GDP比）",              "%",       "percent"),
]


def main(csv_paths):
    series = {}
    for path in csv_paths:
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                code = row["indicator"].strip()
                if row["value"].strip() == "":
                    continue
                series.setdefault(code, {})[int(row["date"])] = float(row["value"])

    indicators = []
    for code, name, unit, fmt in INDICATORS:
        data = series.get(code)
        if not data:
            sys.exit(f"missing indicator: {code}")
        indicators.append({
            "code": code,
            "name": name,
            "unit": unit,
            "format": fmt,
            "data": {str(y): data[y] for y in sorted(data)},
        })

    years = sorted({y for ind in indicators for y in map(int, ind["data"])})
    payload = {
        "country": "日本",
        "source": "World Bank, World Development Indicators",
        "sourceUrl": "https://data.worldbank.org/country/japan",
        "generated": date.today().isoformat(),
        "range": [years[0], years[-1]],
        "indicators": indicators,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes), years {years[0]}-{years[-1]}")


if __name__ == "__main__":
    main(sys.argv[1:])
