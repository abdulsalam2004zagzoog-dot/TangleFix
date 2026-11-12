from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Event, User
from ..schemas import EventCreate, EventUpdate, EventOut
from ..security import get_current_user

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Event).filter(Event.owner_id == user.id).order_by(Event.start_at).all()

@router.post("", response_model=EventOut, status_code=201)
def create_event(data: EventCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = Event(**data.model_dump(), owner_id=user.id)
    db.add(event); db.commit(); db.refresh(event)
    return event

@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: int, data: EventUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == event_id, Event.owner_id == user.id).first()
    if not event: raise HTTPException(404, "Event not found.")
    for key, value in data.model_dump().items(): setattr(event, key, value)
    db.commit(); db.refresh(event)
    return event

@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == event_id, Event.owner_id == user.id).first()
    if not event: raise HTTPException(404, "Event not found.")
    db.delete(event); db.commit()
