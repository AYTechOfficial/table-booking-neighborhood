"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Badge, EmptyState } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

export type ReservationStatus = "confirmed" | "seated" | "completed" | "cancelled" | "no-show";

export type Reservation = {
  id: string;
  ref: string;
  name: string;
  phone: string;
  email: string;
  partySize: number;
  date: string;
  slot: string;
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
};

export type CafeSettings = {
  cafeName: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  maxCoversPerSlot: number;
};

const CORNER_RESERVATIONS_KEY = "cornertable_reservations";
const LEGACY_RESERVATIONS_KEY = "lastmile:table-booking-neighborhood:reservations";
const CORNER_SETTINGS_KEY = "cornertable_settings";
const LEGACY_SETTINGS_KEY = "lastmile:table-booking-neighborhood:settings";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime12(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (isNaN(h)) return hhmm;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

function makeRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CT-${out}`;
}

function normalizeReservation(raw: any): Reservation {
  return {
    id: String(raw.id || `res_${Math.random().toString(36).slice(2, 9)}`),
    ref: String(raw.ref || raw.reference_code || makeRef()),
    name: String(raw.name || raw.customer_name || "Guest"),
    phone: String(raw.phone || raw.customer_phone || ""),
    email: String(raw.email || raw.customer_email || ""),
    partySize: Number(raw.partySize || raw.party_size || 2),
    date: String(raw.date || todayISO()),
    slot: String(raw.slot || raw.time_slot || "09:00"),
    status: (["confirmed", "seated", "completed", "cancelled", "no-show"].includes(raw.status) ? raw.status : "confirmed") as ReservationStatus,
    notes: String(raw.notes || raw.special_requests || ""),
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
  };
}

const SEED_RESERVATIONS: Reservation[] = [
  { id: "res_1", ref: "CT-8F92", name: "Sarah Jenkins", phone: "(555) 234-5678", email: "sarah@example.com", partySize: 2, date: todayISO(), slot: "08:30", status: "completed", notes: "Window table requested", createdAt: new Date().toISOString() },
  { id: "res_2", ref: "CT-3A11", name: "David Chen", phone: "(555) 876-5432", email: "david@example.com", partySize: 4, date: todayISO(), slot: "09:00", status: "seated", notes: "High chair needed", createdAt: new Date().toISOString() },
  { id: "res_3", ref: "CT-9C44", name: "Emma Watson", phone: "(555) 345-6789", email: "emma@example.com", partySize: 2, date: todayISO(), slot: "10:00", status: "confirmed", notes: "", createdAt: new Date().toISOString() },
  { id: "res_4", ref: "CT-1B77", name: "Marcus Brody", phone: "(555) 901-2345", email: "marcus@example.com", partySize: 6, date: todayISO(), slot: "11:30", status: "confirmed", notes: "Birthday celebration", createdAt: new Date().toISOString() },
  { id: "res_5", ref: "CT-5D22", name: "Walk-in Guest", phone: "(555) 000-0000", email: "", partySize: 3, date: todayISO(), slot: "12:00", status: "seated", notes: "Walk-in", createdAt: new Date().toISOString() },
  { id: "res_6", ref: "CT-7E99", name: "Alice Smith", phone: "(555) 456-7890", email: "alice@example.com", partySize: 2, date: tomorrowISO(), slot: "09:30", status: "confirmed", notes: "Nut allergy", createdAt: new Date().toISOString() },
  { id: "res_7", ref: "CT-2F33", name: "Robert Taylor", phone: "(555) 567-8901", email: "robert@example.com", partySize: 4, date: tomorrowISO(), slot: "11:00", status: "confirmed", notes: "", createdAt: new Date().toISOString() },
  { id: "res_8", ref: "CT-4G88", name: "Clara Oswald", phone: "(555) 678-9012", email: "clara@example.com", partySize: 2, date: tomorrowISO(), slot: "14:00", status: "confirmed", notes: "Quiet corner", createdAt: new Date().toISOString() },
];

export default function ManagerDiaryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [settings, setSettings] = useState<CafeSettings>({
    cafeName: "The Corner Espresso & Bakery",
    openTime: "08:00",
    closeTime: "17:00",
    slotMinutes: 30,
    maxCoversPerSlot: 16,
  });

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState("Walk-in Guest");
  const [walkInParty, setWalkInParty] = useState(2);
  const [walkInSlot, setWalkInSlot] = useState("10:00");
  const [walkInNotes, setWalkInNotes] = useState("");

  useEffect(() => {
    const rawRes = readLocal<unknown[]>(CORNER_RESERVATIONS_KEY, readLocal<unknown[]>(LEGACY_RESERVATIONS_KEY, []));
    if (!rawRes || rawRes.length === 0) {
      setReservations(SEED_RESERVATIONS);
      writeLocal(CORNER_RESERVATIONS_KEY, SEED_RESERVATIONS);
      writeLocal(LEGACY_RESERVATIONS_KEY, SEED_RESERVATIONS);
    } else {
      setReservations(rawRes.map(normalizeReservation));
    }

    const rawSet = readLocal<any>(CORNER_SETTINGS_KEY, readLocal<any>(LEGACY_SETTINGS_KEY, null));
    if (rawSet) {
      setSettings({
        cafeName: rawSet.cafeName || rawSet.cafe_name || "The Corner Espresso & Bakery",
        openTime: rawSet.openTime || rawSet.opening_time || "08:00",
        closeTime: rawSet.closeTime || rawSet.closing_time || "17:00",
        slotMinutes: rawSet.slotMinutes || rawSet.slot_interval_minutes || 30,
        maxCoversPerSlot: rawSet.maxCoversPerSlot || rawSet.max_covers_per_slot || 16,
      });
    }
  }, []);

  const updateReservations = (nextList: Reservation[]) => {
    setReservations(nextList);
    writeLocal(CORNER_RESERVATIONS_KEY, nextList);
    writeLocal(LEGACY_RESERVATIONS_KEY, nextList);
  };

  const updateStatus = (id: string, newStatus: ReservationStatus) => {
    const nextList = reservations.map((r) => (r.id === id ? { ...r, status: newStatus } : r));
    updateReservations(nextList);
  };

  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    const newRes: Reservation = {
      id: `res_walkin_${Date.now()}`,
      ref: makeRef(),
      name: walkInName.trim() || "Walk-in Guest",
      phone: "",
      email: "",
      partySize: Math.max(1, walkInParty),
      date: selectedDate,
      slot: walkInSlot,
      status: "seated",
      notes: walkInNotes.trim(),
      createdAt: new Date().toISOString(),
    };
    updateReservations([...reservations, newRes]);
    setShowWalkInModal(false);
    setWalkInNotes("");
  };

  const dateReservations = useMemo(() => {
    return reservations.filter((r) => r.date === selectedDate);
  }, [reservations, selectedDate]);

  const filteredReservations = useMemo(() => {
    if (statusFilter === "all") return dateReservations;
    if (statusFilter === "cancelled") return dateReservations.filter((r) => r.status === "cancelled" || r.status === "no-show");
    return dateReservations.filter((r) => r.status === statusFilter);
  }, [dateReservations, statusFilter]);

  const groupedBySlot = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    const sorted = [...filteredReservations].sort((a, b) => a.slot.localeCompare(b.slot));
    for (const res of sorted) {
      const list = map.get(res.slot) || [];
      list.push(res);
      map.set(res.slot, list);
    }
    return Array.from(map.entries());
  }, [filteredReservations]);

  const metrics = useMemo(() => {
    const active = dateReservations.filter((r) => r.status !== "cancelled" && r.status !== "no-show");
    const totalBookings = active.length;
    const totalCovers = active.reduce((sum, r) => sum + r.partySize, 0);
    const currentlySeated = dateReservations.filter((r) => r.status === "seated").reduce((sum, r) => sum + r.partySize, 0);
    
    // Calculate total daily slot capacity
    const [oH, oM] = settings.openTime.split(":").map(Number);
    const [cH, cM] = settings.closeTime.split(":").map(Number);
    const openMins = (oH || 8) * 60 + (oM || 0);
    const closeMins = (cH || 17) * 60 + (cM || 0);
    const numSlots = Math.max(1, Math.floor((closeMins - openMins) / (settings.slotMinutes || 30)));
    const totalDailyCapacity = numSlots * settings.maxCoversPerSlot;
    const remainingCapacity = Math.max(0, totalDailyCapacity - totalCovers);

    return { totalBookings, totalCovers, currentlySeated, remainingCapacity };
  }, [dateReservations, settings]);

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case "confirmed":
        return <Badge tone="brand">Confirmed</Badge>;
      case "seated":
        return <Badge tone="pass">Seated</Badge>;
      case "completed":
        return <Badge tone="neutral">Completed</Badge>;
      case "cancelled":
        return <Badge tone="bad">Cancelled</Badge>;
      case "no-show":
        return <Badge tone="bad">No-Show</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1917] font-sans pb-12">
      {/* Top Header Bar */}
      <header className="border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 font-bold text-white text-sm">
              CT
            </span>
            <div>
              <h1 className="text-base font-bold text-stone-900 leading-tight">{settings.cafeName}</h1>
              <p className="text-xs text-stone-500">Manager Diary &amp; Live Shift View</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">Public Booking Page</Button>
            </Link>
            <Link href="/manager/settings">
              <Button variant="secondary" size="sm">Settings</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {/* Top Metrics Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="bg-white border-stone-200 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Total Bookings</p>
            <p className="mt-1 text-2xl font-extrabold text-stone-900">{metrics.totalBookings}</p>
          </Card>
          <Card className="bg-white border-stone-200 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Total Covers</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-600">{metrics.totalCovers}</p>
          </Card>
          <Card className="bg-white border-stone-200 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Currently Seated</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600">{metrics.currentlySeated}</p>
          </Card>
          <Card className="bg-white border-stone-200 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Remaining Cap.</p>
            <p className="mt-1 text-2xl font-extrabold text-stone-700">{metrics.remainingCapacity}</p>
          </Card>
        </div>

        {/* Date and Filter Controls */}
        <Card className="bg-white border-stone-200 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={selectedDate === todayISO() ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(todayISO())}
              >
                Today
              </Button>
              <Button
                variant={selectedDate === tomorrowISO() ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(tomorrowISO())}
              >
                Tomorrow
              </Button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="rounded-md border border-stone-300 px-2.5 py-1 text-xs text-stone-800 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowWalkInModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
              + Add Walk-in
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-stone-100 pt-3 text-xs">
            {["all", "confirmed", "seated", "completed", "cancelled"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3 py-1 font-medium capitalize transition-colors ${
                  statusFilter === st ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {st === "cancelled" ? "Cancelled / No-Show" : st}
              </button>
            ))}
          </div>
        </Card>

        {/* Reservation Timeline */}
        {groupedBySlot.length === 0 ? (
          <EmptyState
            title="No reservations for this date"
            description="Walk-in tables are currently open or select another filter/date."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowWalkInModal(true)}>
                + Add Walk-in
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {groupedBySlot.map(([slot, items]) => (
              <div key={slot} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    {formatTime12(slot)}
                  </span>
                  <div className="h-px flex-1 bg-stone-200" />
                </div>
                <div className="grid gap-2">
                  {items.map((r) => (
                    <Card key={r.id} className="bg-white border-stone-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                      <div className="space-y-1 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900">{r.name}</span>
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-stone-600">
                            {r.partySize} {r.partySize === 1 ? "Guest" : "Guests"}
                          </span>
                          <span className="text-xs text-stone-400 font-mono">#{r.ref}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                          {r.phone && <span>📞 {r.phone}</span>}
                          {r.email && <span>✉️ {r.email}</span>}
                        </div>
                        {r.notes && (
                          <p className="text-xs text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200/60 inline-block mt-1">
                            Note: {r.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div>{getStatusBadge(r.status)}</div>
                        <div className="flex items-center gap-1">
                          {r.status === "confirmed" && (
                            <Button variant="secondary" size="sm" onClick={() => updateStatus(r.id, "seated")}>
                              Seat
                            </Button>
                          )}
                          {r.status === "seated" && (
                            <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, "completed")}>
                              Complete
                            </Button>
                          )}
                          {r.status !== "cancelled" && r.status !== "no-show" && r.status !== "completed" && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => updateStatus(r.id, "cancelled")}>
                                Cancel
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => updateStatus(r.id, "no-show")}>
                                No-Show
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Walk-in Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-white border-stone-200 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Quick Walk-in Logger</h3>
              <button type="button" onClick={() => setShowWalkInModal(false)} className="text-stone-400 hover:text-stone-600 text-sm font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddWalkIn} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Walk-in Guest"
                  className="w-full rounded border border-stone-300 p-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Party Size</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={walkInParty}
                    onChange={(e) => setWalkInParty(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded border border-stone-300 p-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Time Slot</label>
                  <input
                    type="time"
                    value={walkInSlot}
                    onChange={(e) => setWalkInSlot(e.target.value)}
                    className="w-full rounded border border-stone-300 p-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Special Requests / Notes</label>
                <input
                  type="text"
                  value={walkInNotes}
                  onChange={(e) => setWalkInNotes(e.target.value)}
                  placeholder="High chair, patio, etc."
                  className="w-full rounded border border-stone-300 p-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowWalkInModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                  Seat Walk-in Now
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
