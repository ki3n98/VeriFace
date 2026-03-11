from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput
from app.db.schema.email_change import EmailChangeRequest, EmailChangeVerifyResponse
from app.service.emailChangeService import EmailChangeService

emailChangeRouter = APIRouter()


@emailChangeRouter.post("/request", status_code=202)
def request_email_change(
    body: EmailChangeRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    """
    Authenticated. Validates the new email and sends a verification link to it.
    The email is NOT changed yet — only after the user clicks the link.
    """
    EmailChangeService(session=session).initiate_change(
        user=user,
        new_email=body.new_email,
    )
    return {"message": "Verification email sent. Check your new inbox."}


@emailChangeRouter.get("/verify", response_model=EmailChangeVerifyResponse)
def verify_email_change(
    token: str,
    session: Session = Depends(get_db),
):
    """
    Public (no auth). Called when the user clicks the verification link in their email.
    Validates the token and updates the email in the database.
    """
    EmailChangeService(session=session).confirm_change(token=token)
    return {"message": "Email updated successfully."}
