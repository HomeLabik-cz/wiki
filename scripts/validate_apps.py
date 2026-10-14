#!/usr/bin/env python3
"""
Validation script for applications in data/apps/*.yml.
Checks YAML syntax, required attributes, dynamic category format, and URL structures.
"""

import sys
import re
from pathlib import Path
from urllib.parse import urlparse

try:
    import yaml
except ImportError:
    print("ERROR: Package 'pyyaml' is not installed. Install it using: pip install pyyaml")
    sys.exit(1)


class UniqueKeyLoader(yaml.SafeLoader):
    """YAML Loader that rejects duplicate mapping keys."""
    def construct_mapping(self, node, deep=False):
        mapping = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            if key in mapping:
                line = key_node.start_mark.line + 1
                raise ValueError(f"Duplicate mapping key '{key}' found at line {line}")
            mapping[key] = self.construct_object(value_node, deep=deep)
        return mapping


def is_valid_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def validate_app_file(file_path: Path) -> list[str]:
    errors = []

    # Check file slug format
    if not re.match(r"^[a-z0-9-]+\.(yml|yaml)$", file_path.name):
        errors.append(f"File name '{file_path.name}' does not match slug format (lowercase a-z, digits 0-9, and dashes only).")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.load(f, Loader=UniqueKeyLoader)
    except Exception as e:
        return [f"Invalid YAML syntax: {e}"]

    if not isinstance(data, dict):
        return ["File content must be a YAML dictionary (key: value)."]

    # Required fields (GitHub repo is required, website and docker are optional)
    required_fields = ["name", "category", "source", "description"]
    for field in required_fields:
        if field not in data or data[field] is None or str(data[field]).strip() == "":
            errors.append(f"Missing required field '{field}'.")

    # Category validation (dynamic, minimum 2 characters)
    category = data.get("category")
    if category and len(str(category).strip()) < 2:
        errors.append("Field 'category' must have at least 2 characters.")

    # Check source URL (GitHub repository - required)
    source = data.get("source")
    if source and not is_valid_url(str(source)):
        errors.append(f"Field 'source' contains an invalid URL: '{source}' (must start with http:// or https://).")

    # Check website URL (optional)
    website = data.get("website")
    if website and not is_valid_url(str(website)):
        errors.append(f"Field 'website' contains an invalid URL: '{website}' (must start with http:// or https://).")

    # Check docker URL or image identifier (optional)
    docker = data.get("docker")
    if docker:
        docker_str = str(docker).strip()
        if docker_str.startswith("http://") or docker_str.startswith("https://"):
            if not is_valid_url(docker_str):
                errors.append(f"Field 'docker' contains an invalid URL: '{docker}'.")
        elif " " in docker_str:
            errors.append(f"Field 'docker' cannot contain whitespace: '{docker}'.")

    # Check description length
    desc = data.get("description")
    if desc and len(str(desc).strip()) < 5:
        errors.append("Description is too short (minimum 5 characters).")

    return errors


def main():
    repo_root = Path(__file__).resolve().parent.parent
    apps_dir = repo_root / "data" / "apps"
    hugo_cfg = repo_root / "hugo.yaml"

    has_errors = False

    # Check hugo.yaml configuration
    if hugo_cfg.exists():
        try:
            with open(hugo_cfg, "r", encoding="utf-8") as f:
                yaml.load(f, Loader=UniqueKeyLoader)
        except Exception as e:
            has_errors = True
            print(f"❌ hugo.yaml:\n   - {e}\n")

    if not apps_dir.exists():
        print(f"Directory {apps_dir} does not exist.")
        sys.exit(1)

    app_files = sorted(list(apps_dir.glob("*.yml")) + list(apps_dir.glob("*.yaml")))
    if not app_files:
        print(f"No application files found in {apps_dir}.")
        sys.exit(0)

    has_errors = False
    print(f"🔍 Validating {len(app_files)} applications in {apps_dir}...\n")

    for file_path in app_files:
        errors = validate_app_file(file_path)
        if errors:
            has_errors = True
            print(f"❌ {file_path.name}:")
            for err in errors:
                print(f"   - {err}")
        else:
            print(f"✅ {file_path.name}")

    print("-" * 50)
    if has_errors:
        print("❌ Validation failed! Please fix the errors above.")
        sys.exit(1)
    else:
        print("🎉 All applications in the catalog are valid!")
        sys.exit(0)


if __name__ == "__main__":
    main()
