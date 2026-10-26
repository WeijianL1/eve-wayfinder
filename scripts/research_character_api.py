"""Build a public-spec inventory without reading credentials or character data."""

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


BASE = "https://esi.evetech.net"


def fetch(path, compatibility_date=None):
    headers = {"User-Agent": "eve-master-research/0.1", "Accept": "application/json"}
    if compatibility_date:
        headers["X-Compatibility-Date"] = compatibility_date
    with urlopen(Request(BASE + path, headers=headers), timeout=45) as response:
        return response.read()


def resolve(spec, schema):
    while "$ref" in schema:
        value = spec
        for key in schema["$ref"][2:].split("/"):
            value = value[key.replace("~1", "/").replace("~0", "~")]
        schema = value
    return schema


def inventory(spec):
    rows = []
    for path, methods in sorted(spec["paths"].items()):
        if not path.startswith("/characters/{character_id}"):
            continue
        op = methods.get("get")
        if not op:
            continue
        schema = resolve(spec, op.get("responses", {}).get("200", {}).get(
            "content", {}).get("application/json", {}).get("schema", {}))
        if schema.get("type") == "array":
            schema = resolve(spec, schema.get("items", {}))
        rows.append({
            "path": path,
            "summary": op.get("summary"),
            "description": op.get("description"),
            "authorization_alternatives": op.get("security", spec.get("security", [])),
            "client_cache_ttl_seconds": op.get("x-client-cache-ttl", op.get("x-cache-age")),
            "server_cache_ttl_seconds": op.get("x-server-cache-ttl"),
            "server_cache_mode": op.get("x-server-cache-mode"),
            "top_level_fields_or_array_item_fields": sorted(schema.get("properties", {})),
            "schema_type": schema.get("type"),
        })
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", type=Path, help="Use a saved OpenAPI file offline")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parents[1] / "docs/research")
    args = parser.parse_args()
    if args.spec:
        raw = args.spec.read_bytes()
    else:
        dates = json.loads(fetch("/meta/compatibility-dates"))["compatibility_dates"]
        raw = fetch("/meta/openapi.json", max(dates))
    spec = json.loads(raw)
    rows = inventory(spec)
    assert rows, "No character GET routes found; inspect specification format"
    document = {
        "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": BASE + "/meta/openapi.json",
        "compatibility_date": spec["info"]["version"],
        "spec_sha256": hashlib.sha256(raw).hexdigest(),
        "method": "GET-only inventory of character-scoped routes; public specification, no private API calls",
        "routes": rows,
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "character-api-inventory.json").write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n")
    lines = ["# ESI 角色只读端点清单", "",
             f"兼容版本：{document['compatibility_date']}。公开规格自动生成，未请求角色数据。", "",
             "刷新：`python3 scripts/research_character_api.py`。JSON 同名清单包含字段、授权替代条件及描述。",
             "缓存列是客户端 TTL，不是端到端实时性保证；null 表示规格未给出。", "",
             "| GET path | 能力 | 授权 scopes（替代授权见 JSON） | 客户端缓存秒 |",
             "| --- | --- | --- | --- |"]
    for row in rows:
        scopes = sorted({scope for alternative in row["authorization_alternatives"]
                         for values in alternative.values() for scope in values})
        summary = (row["summary"] or "").replace("|", "\\|").replace("\n", " ")
        lines.append(f"| `{row['path']}` | {summary} | {', '.join(scopes) or 'public'} | {row['client_cache_ttl_seconds']} |")
    (args.output_dir / "character-api-inventory.md").write_text("\n".join(lines) + "\n")
    print(f"Saved {len(rows)} character GET routes, compatibility {document['compatibility_date']}")


if __name__ == "__main__":
    main()
