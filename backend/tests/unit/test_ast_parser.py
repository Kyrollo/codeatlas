from __future__ import annotations

import textwrap
from src.codeatlas.domain.entities import LayerKind, SymbolKind
from src.codeatlas.services.ast_parser import compute_cyclomatic_complexity, infer_layer, parse_python_file


def test_ast_parser_extracts_classes_and_methods() -> None:
    code = textwrap.dedent("""
    import os
    from typing import Optional

    class PaymentGateway:
        \"\"\"Handles third-party payments.\"\"\"
        def __init__(self, api_key: str):
            self.api_key = api_key

        def charge(self, amount: float) -> bool:
            \"\"\"Charges the credit card.\"\"\"
            if amount <= 0:
                return False
            for attempt in range(3):
                if attempt > 1:
                    break
            return True

    def calculate_tax(subtotal: float) -> float:
        \"\"\"Calculates sales tax.\"\"\"
        return subtotal * 0.08
    """)

    symbols, edges = parse_python_file("services/payments.py", code)

    assert len(symbols) >= 3
    names = [s.name for s in symbols]
    assert "PaymentGateway" in names
    assert "PaymentGateway.charge" in names
    assert "calculate_tax" in names

    # Check kind
    pg_class = next(s for s in symbols if s.name == "PaymentGateway")
    assert pg_class.kind == SymbolKind.CLASS
    assert pg_class.docstring == "Handles third-party payments."

    charge_method = next(s for s in symbols if s.name == "PaymentGateway.charge")
    assert charge_method.kind == SymbolKind.METHOD
    assert charge_method.docstring == "Charges the credit card."
    assert charge_method.complexity > 1

    tax_func = next(s for s in symbols if s.name == "calculate_tax")
    assert tax_func.kind == SymbolKind.FUNCTION
    assert tax_func.complexity == 1


def test_infer_layer() -> None:
    assert infer_layer("api/v1/routes.py") == LayerKind.API
    assert infer_layer("controllers/auth.py") == LayerKind.API
    assert infer_layer("services/checkout.py") == LayerKind.SERVICE
    assert infer_layer("domain/models/user.py") == LayerKind.DOMAIN
    assert infer_layer("core/config.py") == LayerKind.CORE
    assert infer_layer("infra/clients/stripe.py") == LayerKind.INFRASTRUCTURE
