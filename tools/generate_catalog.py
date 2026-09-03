from pathlib import Path
import json, re
spec=json.loads((Path(__file__).parents[1]/"openapi"/"floriax-openapi.json").read_text())
methods={"get","post","put","patch","delete"}
print(sum(1 for item in spec["paths"].values() for method in item if method in methods), "operations")
