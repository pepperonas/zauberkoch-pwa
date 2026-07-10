def test_health_ok(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_error_format_on_404(client):
    r = client.get("/api/v1/does-not-exist")
    assert r.status_code == 404
    assert "error" in r.json()
    assert "code" in r.json()["error"]
