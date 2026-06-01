"""Guardrails for HTTP / frontend URL paths."""

import ast
import unittest
from pathlib import Path

CONST_PATH = (
    Path(__file__).resolve().parents[1] / "custom_components" / "upkeep" / "const.py"
)


def _path_constants() -> dict[str, str]:
    tree = ast.parse(CONST_PATH.read_text(encoding="utf-8"))
    values: dict[str, str] = {}
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if (
                isinstance(target, ast.Name)
                and target.id in ("CARD_URL_BASE", "PANEL_URL")
                and isinstance(node.value, ast.Constant)
                and isinstance(node.value.value, str)
            ):
                values[target.id] = node.value.value
    return values


class TestPathConstants(unittest.TestCase):
    """Panel route and card static mount must not share the same URL prefix."""

    def test_card_static_path_does_not_shadow_panel_route(self) -> None:
        values = _path_constants()
        self.assertEqual(set(values), {"CARD_URL_BASE", "PANEL_URL"})
        self.assertNotEqual(
            values["CARD_URL_BASE"].rstrip("/"), f"/{values['PANEL_URL']}"
        )


if __name__ == "__main__":
    unittest.main()
