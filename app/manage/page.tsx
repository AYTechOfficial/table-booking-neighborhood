"use client";

import { useState, useMemo } from "react";
import { Button, Card, Badge, EmptyState, ListRow } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

type Booking = {
  ref: string;
  name: string;
  phone: string;
  party: number;
  date: string;
  time: string;
  notes: string;
  status: string;
  createdAt: string;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Manage() {
  const [tick, setTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const all = useMemo(() => readLocal<Booking[]>("ct_bookings", []), [tick]);

  const day = all
    .filter((b) => b.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const covers = day.reduce((s, b) => s + b.party, 0);
  const confirmed = day.filter((b) => b.status === "confirmed").length;

  function setStatus(ref: string, status: string) {
    const next = all.map((b) => (b.ref === ref ? { ...b, status } : b));
    writeLocal("ct_bookings", next);
    setTick((t) => t + 1);
  }

  function remove(ref: string) {
    const next = all.filter((b) => b.ref !== ref);
    writeLocal("ct_bookings", next);
    setTick((t) => t + 1);
  }

  return (
    <main className="min-h-screen bg-[#FAF5EE] px-6 py-12 text-[#2E2118]">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-[Fraunces] text-4xl">Today&apos;s diary</h1>
        <p className="mt-2 text-sm text-[#6B5D4F]">Every table, one calm screen.</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-[10px] border border-[#E8DFD2] bg-white px-3 py-2 text-sm outline-none focus:border-[#A8431F] focus:ring-2 focus:ring-[#A8431F]/30"
          />
          <div className="flex gap-2">
            <Badge tone="brand">{day.length} bookings</Badge>
            <Badge tone="pass">{covers} covers</Badge>
            <Badge tone="neutral">{confirmed} confirmed</Badge>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {day.length === 0 ? (
            <EmptyState
              title="No bookings this day"
              message="A quiet one — the counter is open."
            />
          ) : (
            day.map((b) => (
              <Card key={b.ref} className="shadow-[0_1px_2px_rgba(46,33,24,.06),0_8px_24px_rgba(46,33,24,.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-[Fraunces] text-lg">{b.time}</span>
                      <span className="text-sm text-[#6B5D4F]">· {b.name}</span>
                      <Badge tone={b.status === "confirmed" ? "pass" : b.status === "seated" ? "brand" : b.status === "cancelled" ? "bad" : "warn"}>
                        {b.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#6B5D4F]">
                      Party of {b.party} · {b.ref}
                      {b.notes ? ` · ${b.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {b.status !== "seated" && b.status !== "cancelled" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(b.ref, "seated")}>
                        Seat
                      </Button>
                    )}
                    {b.status !== "cancelled" && (
                      <Button size="sm" variant="danger" onClick={() => setStatus(b.ref, "cancelled")}>
                        Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(b.ref)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
