"""Isolated audited HAUL algorithm. No market.py, loader, network, or credentials."""
import sys,json,hashlib,logging
from pathlib import Path
from types import SimpleNamespace
source=Path('artifacts/upstream/haul/backend/src/arbitrage.py').read_text()
# Pin exact bytes reviewed. Set below from the immutable upstream file, not dynamically.
expected='66978dbe4a6eedf4f708d45915f3a7825dd39dff9c299c3fb6d80c4382027cd3'
assert hashlib.sha256(source.encode()).hexdigest()==expected,'Upstream source differs from audited bytes'
assert source.count('from market import Order')==1
scope={'Order':SimpleNamespace}
exec(compile(source.replace('from market import Order',''),'audited-haul-arbitrage.py','exec'),scope)
logging.disable(logging.CRITICAL)
payload=json.load(sys.stdin);result=[]
for case in payload['cases']:
    orders=[SimpleNamespace(**o) for o in case['orders']]
    scope['TAX_RATE']=.08;scope['MAX_CAPITAL']=100_000_000
    native=scope['arbitrage'](orders,payload['capacity'])
    scope['TAX_RATE']=payload['tax'];scope['MAX_CAPITAL']=payload['budget']
    normalized=scope['arbitrage'](orders,payload['capacity'])
    def best(trades):
        return max((t.gross_profit for t in trades),default=0)
    result.append({'nativeBestPairProfit':best(native),'normalizedBestPairProfit':best(normalized),'pairAlternatives':len(normalized)})
json.dump(result,sys.stdout)
