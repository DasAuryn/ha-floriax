"""Small dependency-light repository validation used locally and in CI."""
from __future__ import annotations

import ast
import json
from pathlib import Path
import subprocess

import yaml

root = Path(__file__).parents[1]
component = root / "custom_components" / "floriax"
required = (
    component / "__init__.py",
    component / "manifest.json",
    component / "config_flow.py",
    component / "coordinator.py",
    component / "websocket.py",
    component / "panel.py",
    component / "sensor.py",
    component / "binary_sensor.py",
    component / "button.py",
    component / "frontend" / "floriax-panel.js",
    root / "hacs.json",
    root / "README.md",
    root / "openapi" / "floriax-openapi.json",
)
for path in required:
    assert path.exists(), f"Missing required file: {path.relative_to(root)}"

for path in component.rglob("*.py"):
    ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

json_paths = list(component.rglob("*.json")) + [
    root / "hacs.json",
    root / "openapi" / "floriax-openapi.json",
]
for path in json_paths:
    json.loads(path.read_text(encoding="utf-8"))

namespace: dict = {}
exec((component / "api_spec.py").read_text(encoding="utf-8"), namespace)
assert len(namespace["OPERATIONS"]) == 77
assert len(yaml.safe_load((component / "services.yaml").read_text(encoding="utf-8"))) == 78

manifest = json.loads((component / "manifest.json").read_text(encoding="utf-8"))
assert manifest["domain"] == "floriax"
assert manifest["version"] == "2.0.0"

subprocess.run(
    ["node", "--check", str(component / "frontend" / "floriax-panel.js")],
    check=True,
)

print("OK: dashboard assets, 77 API operations, Python, JSON, YAML and JavaScript syntax valid")
