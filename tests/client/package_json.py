import json

from tests.client.constants import PROJECT_ROOT
from tests.client.utils import as_uri


def get_initialization_options():
    """Returns initialization options from package.json"""
    package_json_path = PROJECT_ROOT / "package.json"
    package_json = json.loads(package_json_path.read_text())

    server_info = package_json["serverInfo"]
    server_id = server_info["module"]

    properties = package_json["contributes"]["configuration"]["properties"]
    setting = {}
    for prop in properties:
        name = prop[len(server_id) + 1 :]
        value = properties[prop]["default"]
        setting[name] = value

    setting["workspace"] = as_uri(str(PROJECT_ROOT))
    setting["interpreter"] = []

    return {"settings": [setting]}
