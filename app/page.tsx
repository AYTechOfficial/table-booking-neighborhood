"use client";

import { Button } from "@/components/ui";
import { CoffeeRing } from "@/components/coffee-ring";
import { useState } from "react";

const heroImg =
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80";

const times = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

export default function Page() {
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("19:00");
  const [booked, setBooked] = useState(false);

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--primary)]">
      <section className="relative h-[420px] w-full overflow-hidden">
        <img src={heroImg} alt="Neighborhood café" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <CoffeeRing />
          <h1 className="text-4xl font-semibold tracking-tight">Table Booking</h1>
          <p className="max-w-md text-sm text-white/70">
            Reserve a table at your neighborhood café — pick a party size and a time, and we&apos;ll
            keep the seat warm.
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
        {booked ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <p className="text-sm font-medium text-emerald-300">
              Table for {guests} booked at {time}. See you soon!
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => setBooked(false)}>
                Book another table
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
                Guests
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant={guests === n ? "primary" : "outline"}
                    onClick={() => setGuests(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
                Time
              </p>
              <div className="flex flex-wrap gap-2">
                {times.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={time === t ? "primary" : "outline"}
                    onClick={() => setTime(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <Button size="lg" onClick={() => setBooked(true)}>
              Book table for {guests} at {time}
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
