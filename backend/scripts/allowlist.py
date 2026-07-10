"""Admin CLI for the signup allowlist.

Usage (from backend/, venv active):
    python -m scripts.allowlist add martin@example.com
    python -m scripts.allowlist remove martin@example.com
    python -m scripts.allowlist list
"""

import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.models import AllowlistEntry


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in {"add", "remove", "list"}:
        print(__doc__)
        return 1
    cmd = sys.argv[1]
    db = SessionLocal()
    try:
        if cmd == "list":
            for entry in db.execute(select(AllowlistEntry).order_by(AllowlistEntry.email)).scalars():
                print(entry.email)
            return 0
        if len(sys.argv) != 3:
            print("email argument required")
            return 1
        email = sys.argv[2].strip().lower()
        existing = db.execute(select(AllowlistEntry).where(AllowlistEntry.email == email)).scalar_one_or_none()
        if cmd == "add":
            if existing:
                print(f"already on allowlist: {email}")
            else:
                db.add(AllowlistEntry(email=email))
                db.commit()
                print(f"added: {email}")
        else:
            if existing:
                db.delete(existing)
                db.commit()
                print(f"removed: {email}")
            else:
                print(f"not on allowlist: {email}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
