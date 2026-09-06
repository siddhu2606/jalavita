from __future__ import annotations
import asyncio
import itertools
import json
import time
from typing import Any


class Broadcaster:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._connected_at: dict[int, float] = {}
        self._ids: dict[int, int] = {}
        self._counter = itertools.count(1)

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(q)
        self._connected_at[id(q)] = time.time()
        self._ids[id(q)] = next(self._counter)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)
        self._connected_at.pop(id(q), None)
        self._ids.pop(id(q), None)

    def connections(self) -> list[dict]:
        now = time.time()
        return [
            {"id": self._ids[id(q)], "uptime_s": round(now - self._connected_at[id(q)])}
            for q in self._subscribers
        ]

    def publish(self, event: str, data: dict[str, Any]) -> None:
        payload = f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"
        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self._subscribers.discard(q)


broadcaster = Broadcaster()
