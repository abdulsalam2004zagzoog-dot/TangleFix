from datetime import datetime, timedelta, time
from itertools import islice
from .conflicts import overlaps

def _candidate_starts(event, day_start, day_end, slot_minutes):
    duration = timedelta(minutes=event["duration_minutes"])
    if event["is_fixed"]:
        return [event["start_at"]]
    low = event.get("window_start") or day_start
    high = event.get("window_end") or day_end
    low = max(low, day_start)
    high = min(high, day_end)
    if high - low < duration:
        return []
    # Include the original time first to minimize unnecessary changes.
    values = [event["start_at"]]
    cursor = low.replace(second=0, microsecond=0)
    minute = cursor.minute
    rounded = ((minute + slot_minutes - 1) // slot_minutes) * slot_minutes
    cursor = cursor.replace(minute=0) + timedelta(hours=cursor.hour) + timedelta(minutes=rounded)
    while cursor + duration <= high:
        values.append(cursor)
        cursor += timedelta(minutes=slot_minutes)
    # Stable unique order, original time first.
    return list(dict.fromkeys(x for x in values if low <= x and x + duration <= high))

def _cost(event, start):
    moved = abs((start - event["start_at"]).total_seconds()) / 60
    # Higher-priority events are more expensive to move.
    return moved * (1 + event["priority"] * 2)

def generate_schedules(events: list[dict], day_start: datetime, day_end: datetime,
                       slot_minutes: int = 15, max_alternatives: int = 3):
    # Most constrained/high-priority events are assigned first.
    ordered = sorted(events, key=lambda e: (
        0 if e["is_fixed"] else 1,
        len(_candidate_starts(e, day_start, day_end, slot_minutes)),
        -e["priority"], e["start_at"]
    ))
    assigned = []
    solutions = []

    def search(index, cost):
        if len(solutions) >= 80:  # bounded deterministic search
            return
        if index == len(ordered):
            solutions.append((cost, {x["id"]: x["assigned_start"] for x in assigned}))
            return
        event = ordered[index]
        duration = timedelta(minutes=event["duration_minutes"])
        for start in _candidate_starts(event, day_start, day_end, slot_minutes):
            end = start + duration
            collision = any(
                x["resource"] == event["resource"] and
                overlaps(x["assigned_start"], x["assigned_end"], start, end)
                for x in assigned
            )
            if collision:
                continue
            extra = _cost(event, start)
            # Branch-and-bound: costs cannot decrease.
            if solutions and cost + extra > max(s[0] for s in solutions) and len(solutions) >= max_alternatives * 4:
                continue
            item = {**event, "assigned_start": start, "assigned_end": end}
            assigned.append(item)
            search(index + 1, cost + extra)
            assigned.pop()

    search(0, 0)
    solutions.sort(key=lambda x: x[0])
    unique = []
    seen = set()
    for cost, mapping in solutions:
        signature = tuple(sorted((k, v.isoformat()) for k, v in mapping.items()))
        if signature not in seen:
            seen.add(signature)
            unique.append({"cost": round(cost, 2), "assignments": mapping})
        if len(unique) >= max_alternatives:
            break
    return unique

def serialize_solution(solution, events):
    by_id = {e["id"]: e for e in events}
    rows = []
    for event_id, start in solution["assignments"].items():
        event = by_id[event_id]
        end = start + timedelta(minutes=event["duration_minutes"])
        rows.append({
            "event_id": event_id, "title": event["title"],
            "start_at": start.isoformat(), "end_at": end.isoformat(),
            "resource": event["resource"], "priority": event["priority"],
            "moved": start != event["start_at"],
            "explanation": "Kept at preferred time." if start == event["start_at"]
                           else f'Moved to avoid a conflict; priority {event["priority"]}/5.'
        })
    return sorted(rows, key=lambda x: x["start_at"])
