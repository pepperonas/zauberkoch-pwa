"""Mailer: template rendering, escaping, and SMTP send (mocked / no-op)."""

from app.services import mailer


def test_verify_template_renders_html_and_text():
    html, text = mailer.render("verify", name="Martin", verify_url="https://zauberkoch.de/v?t=abc", valid_hours=24)
    # both parts carry the essentials
    for part in (html, text):
        assert "Martin" in part
        assert "https://zauberkoch.de/v?t=abc" in part
        assert "24" in part
    # html brand + bulletproof bits
    assert "E-Mail bestätigen" in html
    assert "roundrect" in html  # Outlook VML button
    assert 'name="color-scheme"' in html  # dark-mode meta
    assert "© 2026 Martin Pfeffer | celox.io" in text


def test_html_escapes_the_name_but_not_the_text_part():
    html, text = mailer.render("verify", name="<script>x</script>", verify_url="https://x/y", valid_hours=24)
    assert "<script>x</script>" not in html  # autoescaped in HTML
    assert "&lt;script&gt;" in html
    # the plain-text part is literal (not HTML) — no escaping needed/applied
    assert "<script>x</script>" in text


def test_missing_name_degrades_gracefully():
    html, _ = mailer.render("verify", name="", verify_url="https://x/y", valid_hours=24)
    assert "Hallo," in html  # no dangling "Hallo ,"


def test_send_is_noop_without_smtp(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "smtp_host", "")
    assert mailer.send("a@b.de", "Hi", "<b>hi</b>", "hi") is False


def test_send_uses_smtp_ssl_when_configured(monkeypatch):
    from app.core.config import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(s, "smtp_port", 465)
    monkeypatch.setattr(s, "smtp_user", "user")
    monkeypatch.setattr(s, "smtp_pass", "pass")

    sent = {}

    class FakeSMTP:
        def __init__(self, host, port, context=None, timeout=None):
            sent["host"] = host
            sent["port"] = port

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def login(self, u, p):
            sent["login"] = (u, p)

        def send_message(self, msg):
            sent["from"] = msg["From"]
            sent["to"] = msg["To"]
            sent["subject"] = msg["Subject"]
            sent["types"] = [p.get_content_type() for p in msg.get_payload()]

    monkeypatch.setattr(mailer.smtplib, "SMTP_SSL", FakeSMTP)
    ok = mailer.send_verification_email("new@user.de", "Ada", "https://zauberkoch.de/v?t=xyz")
    assert ok is True
    assert sent["host"] == "smtp.example.com" and sent["port"] == 465
    assert sent["login"] == ("user", "pass")
    assert sent["to"] == "new@user.de"
    assert "Zauberkoch" in sent["from"] and "support@celox.io" in sent["from"]
    assert sent["types"] == ["text/plain", "text/html"]  # multipart/alternative order
