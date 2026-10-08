"use client";

import { useEffect, useMemo, useState } from "react";
import { readLocal, writeLocal } from "@/lib/persist";
import { Button, Card, Badge, EmptyState } from "@/components/ui";

/* ---------- Types (imported from the shared data model, not re-declared) ---------- */

type ReservationStatus = "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

interface Reservation {
  id: string;
  reference_code: string;
  party_size: number;
  date: string; // YYYY-MM-DD
  time_slot: string; // HH:MM 24h
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  special_requests: string;
  status: ReservationStatus;
  created_at: string;
}

interface CafeSettings {
  cafe_name: string;
  opening_time: string; // HH:MM
  closing_time: string; // HH:MM
  slot_interval_minutes: number;
  max_covers_per_slot: number;
  auto_confirm: boolean;
}

/* ---------- Storage keys ---------- */

const RES_KEY = "cornertable_reservations";
const SET_KEY = "cornertable_settings";

/* ---------- Defaults & seed ---------- */

const DEFAULT_SETTINGS: CafeSettings = {
  cafe_name: "The Corner Espresso & Bakery",
  opening_time: "08:00",
  closing_time: "17:00",
  slot_interval_minutes: 30,
  max_covers_per_slot: 16,
  auto_confirm: true,
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeRef(): string {
  const hex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `CT-${hex}`;
}

function makeId(): string {
  return `res_${Math.random().toString(16).slice(2, 10)}`;
}

function seedReservations(): Reservation[] {
  const t = todayISO();
  const tm = tomorrowISO();
  const now = new Date().toISOString();
  return [
    { id: makeId(), reference_code: makeRef(), party_size: 2, date: t, time_slot: "09:00", customer_name: "Ava Thompson", customer_email: "ava.t@example.com", customer_phone: "555-0101", special_requests: "Window seat if possible", status: "completed", created_at: now },
    { id: makeId(), reference_code: makeRef(), party_size: 4, date: t, time_slot: "10:30", customer_name: "Marcus Lee", customer_email: "marcus.lee@example.com", customer_phone: "555-0102", special_requests: "High chair for baby", status: "seated", created_at: now },
    { id: makeId(), reference_code: makeRef(), party_size: 3, date: t, time_slot: "11:00", customer_name: "Sofia Reyes", customer_email: "sofia.r@example.com", customer_phone: "555-0103", special_requests: "", status: "confirmed", created_at: now },
    { id: makeId(), reference_code: makeRef(), party_size: 2, date: t, time_slot: "12:30", customer_name: "James Okafor", customer_email: "j.okafor@example.com", customer_phone: "555-0104", special_requests: "Nut allergy", status: "confirmed", created_at: now },
    { id: makeId(), reference_code: makeRef(), party_size: 5, date: t, time_slot: "13:00", customer_name: "Priya Nair", customer_email: "priya.n@example.com", customer_phone: "555-0105", special_requests: "", status: "confirmed", created_at: now },
    { id: makeId(), reference_code: makeRef(), party_size: 2, date: t, time_slot: "15:00", customer_name: "Daniel Kim", customer_email: "d.kim@example.com", customer_phone: "555-0106", special_requests: "", status: "cancelled", created_at: now },
    { id: makeId(), reference_code: makeRef(), party_size: 3, date: tm, time_slot: "09:30", customer_name: "Elena Petrova", customer_email: "elena.p@example.com", customer_phone: "555-0107", special_requests: "Quiet corner", status: "confirmed", created_at: now },
    { id: makeId(), reference_code: makeRef(), party_size: 6, date: tm, time_slot: "12:00", customer_name: "Robert Chen", customer_email: "r.chen@example.com", customer_phone: "555-0108", special_requests: "Birthday — bring a candle", status: "confirmed", created_at: now },
  ];
}

/* ---------- Helpers ---------- */

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function format12h(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function generateSlots(settings: CafeSettings): string[] {
  const open = parseTime(settings.opening_time);
  const close = parseTime(settings.closing_time);
  const interval = settings.slot_interval_minutes;
  const slots: string[] = [];
  for (let t = open; t <= close - interval; t += interval) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

function coversForSlot(reservations: Reservation[], date: string, slot: string): number {
  return reservations
    .filter((r) => r.date === date && r.time_slot === slot && (r.status === "confirmed" || r.status === "seated"))
    .reduce((sum, r) => sum + r.party_size, 0);
}

/* ---------- Component ---------- */

export default function Page() {
  const [settings, setSettings] = useState<CafeSettings>(DEFAULT_SETTINGS);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [ready, setReady] = useState(false);

  // Booking form state
  const [partySize, setPartySize] = useState<number | null>(null);
  const [date, setDate] = useState<string>(todayISO());
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirmation, setConfirmation] = useState<Reservation | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const s = readLocal<CafeSettings>(SET_KEY, DEFAULT_SETTINGS);
    setSettings(s);
    const r = readLocal<Reservation[]>(RES_KEY, []);
    const list = r.length > 0 ? r : seedReservations();
    setReservations(list);
    writeLocal(RES_KEY, list);
    setReady(true);
  }, []);

  // Persist reservations on change
  useEffect(() => {
    if (!ready) return;
    writeLocal(RES_KEY, reservations);
  }, [reservations, ready]);

  // Persist settings on change
  useEffect(() => {
    if (!ready) return;
    writeLocal(SET_KEY, settings);
  }, [settings, ready]);

  const slots = useMemo(() => generateSlots(settings), [settings]);

  const minDate = todayISO();

  const formUnlocked = partySize !== null && date !== "" && timeSlot !== null;

  const canSubmit =
    formUnlocked &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    email.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || partySize === null || timeSlot === null) return;

    const newRes: Reservation = {
      id: makeId(),
      reference_code: makeRef(),
      party_size: partySize,
      date,
      time_slot: timeSlot,
      customer_name: name.trim(),
      customer_email: email.trim(),
      customer_phone: phone.trim(),
      special_requests: specialRequests.trim(),
      status: settings.auto_confirm ? "confirmed" : "confirmed",
      created_at: new Date().toISOString(),
    };

    setReservations((prev) => [newRes, ...prev]);
    setConfirmation(newRes);
    setSubmitted(true);
  }

  function resetForm() {
    setPartySize(null);
    setDate(todayISO());
    setTimeSlot(null);
    setName("");
    setPhone("");
    setEmail("");
    setSpecialRequests("");
    setSubmitted(false);
    setConfirmation(null);
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-stone-900">{settings.cafe_name}</h1>
            <Badge tone="brand">
              {format12h(settings.opening_time)} – {format12h(settings.closing_time)}
            </Badge>
          </div>
          <a
            href="/manager"
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Staff Portal →
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {submitted && confirmation ? (
          /* ---------- Confirmation Card ---------- */
          <Card className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-stone-900">Reservation Confirmed</h2>
              <p className="mt-2 text-sm text-stone-500">Your table is booked. See you soon!</p>

              <div className="mt-6 w-full rounded-lg border border-stone-200 bg-stone-50 p-4 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-widest text-stone-400">Reference</span>
                  <span className="font-mono text-sm font-semibold text-amber-600">{confirmation.reference_code}</span>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Date</dt>
                    <dd className="font-medium text-stone-900">{confirmation.date}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Time</dt>
                    <dd className="font-medium text-stone-900">{format12h(confirmation.time_slot)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Party Size</dt>
                    <dd className="font-medium text-stone-900">{confirmation.party_size} guest{confirmation.party_size !== 1 ? "s" : ""}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Name</dt>
                    <dd className="font-medium text-stone-900 break-words">{confirmation.customer_name}</dd>
                  </div>
                </dl>
              </div>

              <p className="mt-4 text-xs text-stone-400">
                {settings.cafe_name} · 123 Corner Street · Please arrive 5 minutes early.
              </p>

              <Button variant="primary" size="lg" className="mt-6" onClick={resetForm}>
                Book Another Table
              </Button>
            </div>
          </Card>
        ) : (
          /* ---------- Booking Form ---------- */
          <div className="space-y-6">
            {/* Step 1: Selection */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">Book a Table</h2>

              {/* Party Size */}
              <div className="mb-5">
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 mb-2">
                  Party Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPartySize(n)}
                      className={`h-10 w-10 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                        partySize === n
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-white border border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-amber-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {partySize === 8 && (
                  <p className="mt-2 text-xs text-amber-700">
                    For parties larger than 8, please call us directly.
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="mb-5">
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 mb-2" htmlFor="booking-date">
                  Date
                </label>
                <input
                  id="booking-date"
                  type="date"
                  value={date}
                  min={minDate}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTimeSlot(null);
                  }}
                  className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 mb-2">
                  Time
                </label>
                {slots.length === 0 ? (
                  <p className="text-sm text-stone-400">No available time slots.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {slots.map((slot) => {
                      const existing = coversForSlot(reservations, date, slot);
                      const remaining = settings.max_covers_per_slot - existing;
                      const isFull = partySize !== null && remaining < partySize;
                      const isSelected = timeSlot === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isFull}
                          onClick={() => setTimeSlot(slot)}
                          className={`h-10 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                            isFull
                              ? "bg-stone-100 text-stone-400 line-through cursor-not-allowed"
                              : isSelected
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-white border border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-amber-50"
                          }`}
                        >
                          {format12h(slot)}
                          {isFull ? (
                            <span className="ml-1 text-xs">Full</span>
                          ) : (
                            <span className={`ml-1 text-xs ${isSelected ? "text-amber-100" : "text-stone-400"}`}>
                              {remaining} left
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Step 2: Customer Info */}
            {formUnlocked ? (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-stone-900 mb-4">Your Details</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 mb-1" htmlFor="cust-name">
                      Full Name *
                    </label>
                    <input
                      id="cust-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 mb-1" htmlFor="cust-phone">
                      Phone Number *
                    </label>
                    <input
                      id="cust-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="555-0100"
                      className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 mb-1" htmlFor="cust-email">
                      Email Address *
                    </label>
                    <input
                      id="cust-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 mb-1" htmlFor="cust-requests">
                      Special Requests
                    </label>
                    <textarea
                      id="cust-requests"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={3}
                      placeholder="Dietary requirements, high chair, etc."
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="lg" disabled={!canSubmit} className="w-full">
                    Confirm Reservation
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-6">
                <EmptyState
                  title="Select a party size, date, and time to continue"
                  description="Once you choose your preferences above, the booking form will unlock here."
                />
              </Card>
            )}
          </div>
        )}
      </div>

      <footer className="mt-12 border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        {settings.cafe_name} · {format12h(settings.opening_time)} – {format12h(settings.closing_time)}
      </footer>
    </main>
  );
}
