"""Render the verification email to a static file for local / Litmus / mail-tester review.

    cd backend && python -m scripts.email_preview

Writes email-preview.html (gitignored) and prints the text/plain alternative.
"""

from app.services import mailer

SAMPLE = {
    "name": "Martin",
    "verify_url": "https://zauberkoch.de/api/v1/auth/verify?token=demo-3f9a1c7e0b2d4a6f8e1c",
    "valid_hours": 24,
}


def main() -> None:
    html, text = mailer.render("verify", **SAMPLE)
    with open("email-preview.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote email-preview.html")
    print("\n----- text/plain alternative -----\n")
    print(text)


if __name__ == "__main__":
    main()
