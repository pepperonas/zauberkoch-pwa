"""Signed-payload helpers (OAuth state cookie) + cache key normalization."""

import time

from app.core.security import sign_payload, unsign_payload
from app.schemas.recipe import GenerateParams
from app.services.cache import params_hash


def test_sign_unsign_roundtrip():
    data = {"state": "abc", "verifier": "xyz"}
    assert unsign_payload(sign_payload(data)) == data


def test_tampered_signature_rejected():
    token = sign_payload({"state": "abc"})
    body, sig = token.split(".", 1)
    assert unsign_payload(f"{body}.{'0' * len(sig)}") is None
    assert unsign_payload(f"{body}x.{sig}") is None
    assert unsign_payload("garbage") is None
    assert unsign_payload("") is None


def test_expired_payload_rejected(monkeypatch):
    token = sign_payload({"state": "abc"})
    real_time = time.time
    monkeypatch.setattr(time, "time", lambda: real_time() + 700)  # > 600s max_age
    assert unsign_payload(token) is None


def test_params_hash_is_order_and_case_invariant():
    a = GenerateParams(modus="kochen", kueche="Thai", geschmack=["scharf", "frisch"], vorhandene_zutaten=["Reis", "Ei"])
    b = GenerateParams(modus="kochen", kueche="  THAI ", geschmack=["Frisch", "SCHARF"], vorhandene_zutaten=["ei", " reis "])
    assert params_hash(a) == params_hash(b)


def test_params_hash_ignores_regenerate_but_not_content():
    base = GenerateParams(modus="kochen", kueche="Thai")
    assert params_hash(base) == params_hash(GenerateParams(modus="kochen", kueche="Thai", regenerate=True))
    assert params_hash(base) != params_hash(GenerateParams(modus="kochen", kueche="Indisch"))
    assert params_hash(base) != params_hash(GenerateParams(modus="kochen", kueche="Thai", personen=6))
