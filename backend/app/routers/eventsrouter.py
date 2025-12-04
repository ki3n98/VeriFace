# app/routers/events_test.py

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.repository.eventRepo import EventRepository
from app.db.schema.events import EventInCreate, EventInUpdate, EventOutput
from app.db.models.events import Events  # <-- import model

router = APIRouter(
    prefix="/events-test",
    tags=["events-test (no auth)"],
)


@router.post("/", response_model=EventOutput)
def create_event(
    event: EventInCreate,
    db: Session = Depends(get_db),
    user_ids: Optional[List[int]] = Query(default=None),
):
    repo = EventRepository(session=db)
    new_event = repo.create_event(event_data=event, user_ids=user_ids)
    return new_event


@router.get("/", response_model=List[EventOutput])
def list_events(db: Session = Depends(get_db)):
    """
    List all events.
    """
    repo = EventRepository(session=db)
    events = repo.session.query(Events).all()  # ✅ no `ev` here
    return events
