from collections import defaultdict

def overlaps(a_start, a_end, b_start, b_end) -> bool:
    # Half-open intervals: [start, end). Back-to-back events are allowed.
    return a_start < b_end and b_start < a_end

def detect_conflicts(events: list[dict]) -> list[dict]:
    # Sweep-line style: sort by start, then compare only active intervals.
    by_resource = defaultdict(list)
    for event in events:
        by_resource[event.get("resource", "personal")].append(event)

    conflicts = []
    for resource, items in by_resource.items():
        items = sorted(items, key=lambda x: x["start_at"])
        active = []
        for current in items:
            active = [x for x in active if x["end_at"] > current["start_at"]]
            for other in active:
                if overlaps(other["start_at"], other["end_at"], current["start_at"], current["end_at"]):
                    conflicts.append({
                        "event_a": other["id"], "event_b": current["id"],
                        "title_a": other["title"], "title_b": current["title"],
                        "resource": resource,
                        "start": max(other["start_at"], current["start_at"]).isoformat(),
                        "end": min(other["end_at"], current["end_at"]).isoformat(),
                        "reason": f'{other["title"]} overlaps {current["title"]} on resource "{resource}".'
                    })
            active.append(current)
    return conflicts
