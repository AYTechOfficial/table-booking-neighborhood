"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Badge, EmptyState } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

interface Table {
  id: string;
  name: string;
  seats: number;
  zone: string;
  minSpend?: number;
  features?: string[];
}

interface Booking {
  id: string;
  tableId: string;
  tableName: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  contact: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
}

const INITIAL_TABLES: Table[] = [
  { id: "t1", name: "Window Booth 1", seats: 4, zone: "Window", minSpend: 50, features: ["View", "Quiet"] },
  { id: "t2", name: "Window Booth 2", seats: 4, zone: "Window", minSpend: 50, features: ["View", "Quiet"] },
  { id: "t3", name: "Main Hall 4-Top", seats: 4, zone: "Main", features: ["Central"] },
  { id: "t4", name: "Main Hall 6-Top", seats: 6, zone: "Main", features: ["Spacious"] },
  { id: "t5", name: "Chef Counter 1", seats: 2, zone: "Bar", minSpend: 80, features: ["Action View"] },
  { id: "t6", name: "Chef Counter 2", seats: 2, zone: "Bar", minSpend: 80, features: ["Action View"] },
  { id: "t7", name: "Garden Patio 1", seats: 4, zone: "Patio", features: ["Outdoor", "Pet Friendly"] },
  { id: "t8", name: "Garden Patio 2", seats: 6, zone: "Patio", features: ["Outdoor", "Heated"] },
];

export default function BookPage() {
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const [date, setDate] = useState<string>("2025-05-01");
  const [time, setTime] = useState<string>("19:00");
  const [guests, setGuests] = useState<number>(2);
  const [zoneFilter, setZoneFilter] = useState<string>("all");

  const [guestName, setGuestName] = useState<string>("");
  const [contact, setContact] = useState<string>("");

  useEffect(() => {
    const saved = readLocal<Booking[]>("neighborhood_bookings", []);
    setBookings(saved);
  }, []);

  useEffect(() => {
    writeLocal("neighborhood_bookings", bookings);
  }, [bookings]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (t.seats < guests) return false;
      if (zoneFilter !== "all" && t.zone.toLowerCase() !== zoneFilter.toLowerCase()) return false;
      return true;
    });
  }, [tables, guests, zoneFilter]);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !guestName.trim() || !contact.trim()) return;

    const newBooking: Booking = {
      id: "b-" + Math.random().toString(36).substring(2, 9),
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      date,
      time,
      guests,
      name: guestName,
      contact,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    setBookings([newBooking, ...bookings]);
    setSelectedTable(null);
    setGuestName("");
    setContact("");
    alert("Table successfully booked!");
  };

  const cancelBooking = (id: string) => {
    setBookings(bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" as const } : b)));
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6 text-[var(--primary)]">
      <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Neighborhood Table Booking</h1>
        <p className="text-sm text-white/60">
          Reserve your spot at our community dining room. Choose your preferred zone, table, and time.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold">1. Select Party & Time</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">Time</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"
                >
                  <option value="17:00">5:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="19:00">7:00 PM</option>
                  <option value="20:00">8:00 PM</option>
                  <option value="21:00">9:00 PM</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">Guests</label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "Guest" : "Guests"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-white/60">Filter Zone:</span>
              {["all", "window", "main", "bar", "patio"].map((z) => (
                <Button
                  key={z}
                  size="sm"
                  variant={zoneFilter === z ? "primary" : "outline"}
                  onClick={() => setZoneFilter(z)}
                >
                  {z.charAt(0).toUpperCase() + z.slice(1)}
                </Button>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">2. Choose a Table ({filteredTables.length} available)</h2>
            {filteredTables.length === 0 ? (
              <EmptyState title="No tables match your criteria" description="Try reducing your guest count or switching zones." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredTables.map((t) => {
                  const isSelected = selectedTable?.id === t.id;
                  return (
                    <Card
                      key={t.id}
                      className={`cursor-pointer transition-all ${isSelected ? "border-[var(--accent)] bg-[var(--accent)]/5" : "hover:border-white/30"}`}
                      onClick={() => setSelectedTable(t)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white">{t.name}</h3>
                          <p className="text-xs text-white/50">Zone: {t.zone} • Seats up to {t.seats}</p>
                        </div>
                        <Badge tone={isSelected ? "brand" : "neutral"}>{t.zone}</Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {t.features?.map((f) => (
                            <span key={f} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">
                              {f}
                            </span>
                          ))}
                        </div>
                        {t.minSpend ? <span className="text-xs text-[var(--accent)]">Min spend: ${t.minSpend}</span> : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">3. Complete Reservation</h2>
            {selectedTable ? (
              <form onSubmit={handleBook} className="space-y-4">
                <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-xs">
                  <p className="font-medium text-[var(--accent)]">Selected: {selectedTable.name}</p>
                  <p className="text-white/70">
                    {date} at {time} for {guests} guests
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-white/70">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-white/70">Contact (Phone / Email)</label>
                  <input
                    type="text"
                    required
                    placeholder="jane@example.com"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </div>

                <Button type="submit" className="w-full" variant="primary">
                  Confirm Reservation
                </Button>
              </form>
            ) : (
              <p className="text-xs text-white/50">Please select an available table from the list to finalize your booking details.</p>
            )}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold">Your Bookings</h2>
            {bookings.length === 0 ? (
              <p className="text-xs text-white/50">No active bookings found.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{b.tableName}</span>
                      <Badge tone={b.status === "confirmed" ? "pass" : "bad"}>{b.status}</Badge>
                    </div>
                    <p className="text-white/60">
                      {b.date} @ {b.time} ({b.guests} guests)
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-white/40">{b.name}</span>
                      {b.status === "confirmed" ? (
                        <button
                          onClick={() => cancelBooking(b.id)}
                          className="text-red-400 hover:underline"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
