import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from html import escape
from dotenv import load_dotenv

load_dotenv()


class EmailService:
    def __init__(self):
        self.smtp_email = os.getenv("SMTP_EMAIL")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 587
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    def _build_message(self, to_email: str, first_name: str, last_name: str, event_name: str) -> MIMEMultipart:
        signup_url = f"{self.frontend_url}/sign-up"
        safe_first = escape(first_name)
        safe_last = escape(last_name)
        safe_event = escape(event_name)
        safe_email = escape(to_email)

        subject = f"VeriFace: You've been added to {event_name}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #6B46C1; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">VeriFace</h1>
            </div>
            <div style="padding: 20px;">
                <p>Hi {safe_first} {safe_last},</p>
                <p>You have been added to the event <strong>{safe_event}</strong> on VeriFace,
                   a facial recognition attendance system.</p>
                <p>To complete your registration and enable facial check-in, please:</p>
                <ol>
                    <li>Create your account at the link below</li>
                    <li>Sign in and upload a clear photo of your face</li>
                </ol>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{signup_url}"
                       style="background-color: #6B46C1; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Sign Up Now
                    </a>
                </p>
                <p style="color: #666; font-size: 12px;">
                    Use your email address <strong>{safe_email}</strong> when signing up.
                </p>
            </div>
        </body>
        </html>
        """

        plain_body = (
            f"Hi {first_name} {last_name},\n\n"
            f"You have been added to the event '{event_name}' on VeriFace.\n\n"
            f"Please sign up at: {signup_url}\n"
            f"Use your email: {to_email}\n\n"
            f"After signing up, sign in and upload a photo of your face for check-in.\n"
        )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.smtp_email
        msg["To"] = to_email
        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        return msg

    def send_bulk_invites(self, recipients: list, event_name: str) -> dict:
        """
        Send invite emails to multiple recipients using a single SMTP connection.
        recipients: list of User ORM objects with email, first_name, last_name attributes.
        Returns dict with sent_count, failed_count, failed_emails.
        """
        if not self.smtp_email or not self.smtp_password:
            raise ValueError("SMTP_EMAIL and SMTP_PASSWORD environment variables must be set")

        sent_count = 0
        failed_count = 0
        failed_emails = []

        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_email, self.smtp_password)

            for user in recipients:
                try:
                    msg = self._build_message(
                        to_email=user.email,
                        first_name=user.first_name or "",
                        last_name=user.last_name or "",
                        event_name=event_name,
                    )
                    server.sendmail(self.smtp_email, user.email, msg.as_string())
                    sent_count += 1
                except Exception as e:
                    print(f"Failed to send email to {user.email}: {e}")
                    failed_count += 1
                    failed_emails.append(user.email)

        return {
            "sent_count": sent_count,
            "failed_count": failed_count,
            "failed_emails": failed_emails,
        }
