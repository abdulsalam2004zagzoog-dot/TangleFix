from datetime import date, datetime, time, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Event, User
from ..schemas import OptimizeRequest
from ..security import get_current_user
from ..algorithms.conflicts import detect_conflicts
from ..algorithms.scheduler import generate_schedules, serialize_solution

router = APIRouter(prefix="/api/scheduling", tags=["Scheduling"])

def as_dict(e):
    return {"id": e.id, "title": e.title, "start_at": e.start_at, "end_at": e.end_at,
            "duration_minutes": e.duration_minutes, "priority": e.priority,
            "is_fixed": e.is_fixed, "resource": e.resource,
            "window_start": e.window_start, "window_end": e.window_end}

@router.get("/conflicts")
def conflicts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    events = [as_dict(e) for e in db.query(Event).filter(Event.owner_id == user.id).all()]
    return {"count": len(detect_conflicts(events)), "conflicts": detect_conflicts(events)}

@router.post("/optimize")
def optimize(data: OptimizeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        selected = date.fromisoformat(data.date)
    except ValueError:
        raise HTTPException(400, "date must use YYYY-MM-DD.")
    events = db.query(Event).filter(Event.owner_id == user.id,
        Event.start_at >= datetime.combine(selected, time.min),
        Event.start_at < datetime.combine(selected + timedelta(days=1), time.min)).all()
    items = [as_dict(e) for e in events]
    if not items:
        return {"date": data.date, "alternatives": [], "message": "No events found for this date."}
    day_start = datetime.combine(selected, time(7, 0))
    day_end = datetime.combine(selected, time(22, 0))
    solutions = generate_schedules(items, day_start, day_end, data.slot_minutes, data.max_alternatives)
    if not solutions:
        return {"date": data.date, "alternatives": [], "message": "No feasible schedule found. Relax a constraint or extend availability."}
    return {"date": data.date, "alternatives": [
        {"rank": i+1, "cost": s["cost"], "events": serialize_solution(s, items)}
        for i, s in enumerate(solutions)
    ], "message": "Solutions are ranked by minimum weighted schedule changes."}
