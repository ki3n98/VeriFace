import secrets
import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.db.models.pending_email_change import PendingEmailChange
from app.db.repository.userRepo import UserRepository
from app.service.emailService import EmailService
from app.db.schema.user import UserOutput

EXPIRY_HOURS = 24


class EmailChangeService:
    def __init__(self, session: Session):
        self.session = session
        self.user_repo = UserRepository(session=session)

    def initiate_change(self, user: UserOutput, new_email: str) -> None:
        # Reject if the new email is the same as the current one
        if new_email.lower() == user.email.lower():
            raise HTTPException(status_code=400, detail="New email is the same as your current email.")

        # Reject if the new email is already taken by another account
        existing = self.user_repo.get_user_by_email(email=new_email)
        if existing:
            raise HTTPException(status_code=400, detail="That email is already in use.")

        # Delete any previous pending request for this user (one at a time)
        self.session.query(PendingEmailChange).filter(
            PendingEmailChange.user_id == user.id
        ).delete()

        # Generate a secure random token and set expiry
        token = secrets.token_urlsafe(32)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=EXPIRY_HOURS)

        pending = PendingEmailChange(
            user_id=user.id,
            new_email=new_email,
            token=token,
            expires_at=expires_at,
        )
        self.session.add(pending)
        self.session.commit()

        # Fetch the user's first name for the email greeting
        db_user = self.user_repo.get_user_by_id(id=user.id)
        EmailService().send_email_change_verification(
            to_email=new_email,
            first_name=db_user.first_name or "",
            token=token,
        )

    def confirm_change(self, token: str) -> None:
        pending = self.session.query(PendingEmailChange).filter(
            PendingEmailChange.token == token
        ).first()

        if not pending:
            raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

        if pending.expires_at < datetime.datetime.utcnow():
            self.session.delete(pending)
            self.session.commit()
            raise HTTPException(status_code=400, detail="Verification link has expired.")

        # Final duplicate check at write time (guards against race conditions)
        existing = self.user_repo.get_user_by_email(email=pending.new_email)
        if existing and existing.id != pending.user_id:
            raise HTTPException(status_code=400, detail="That email is already in use.")

        self.user_repo.update_user_by_id(
            id=pending.user_id,
            updates={"email": pending.new_email},
        )
        self.session.delete(pending)
        self.session.commit()
