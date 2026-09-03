import ast, json, yaml
from pathlib import Path
root=Path(__file__).parents[1]
cc=root/'custom_components'/'floriax'
for p in cc.rglob('*.py'): ast.parse(p.read_text())
for p in list(cc.rglob('*.json'))+[root/'hacs.json', root/'openapi'/'floriax-openapi.json']: json.loads(p.read_text())
ns={}; exec((cc/'api_spec.py').read_text(),ns)
assert len(ns['OPERATIONS']) == 77
assert len(yaml.safe_load((cc/'services.yaml').read_text())) == 78
print('OK: 77 FloriaX operations, Python/JSON syntax valid')
