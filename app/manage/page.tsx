"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

type RecordItem = { id: string; title: string; notes: string; createdAt: string };
type Reservation = RecordItem & {
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: "confirmed" | "canceled";
};
type CafeStore = {
  reservations: Reservation[];
  [key: string]: unknown;
};
type ReservationForm = {
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: string;
  notes: string;
};

const STORAGE_KEY = "lastmile:table-booking-neighborhood:CafeConfig (client-side localStorage)";
const TIMES = ["5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM"];
const DEFAULT_CAPACITY = 24;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseNotes(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return getObject(parsed);
  } catch {
    return {};
  }
}

function normalizeReservation(value: unknown, index: number): Reservation | null {
  const item = getObject(value);
  const parsed = parseNotes(item.notes);
  const guestName = asText(item.guestName) || asText(item.name) || asText(item.title) || asText(parsed.guestName);
  const date = asText(item.date) || asText(item.serviceDate) || asText(item.reservationDate) || asText(parsed.date);
  const time = asText(item.time) || asText(item.reservationTime) || asText(parsed.time);
  if (!guestName || !date || !time) return null;
  const rawStatus = asText(item.status).toLowerCase();
  const status: Reservation["status"] = rawStatus === "canceled" || rawStatus === "cancelled" ? "canceled" : "confirmed";
  const createdAt = asText(item.createdAt) || new Date().toISOString();
  const id = asText(item.id) || `reservation-${index}-${createdAt}`;
  const phone = asText(item.phone) || asText(item.contactPhone) || asText(parsed.phone);
  const email = asText(item.email) || asText(item.contactEmail) || asText(parsed.email);
  const notes = asText(item.guestNotes) || asText(parsed.guestNotes) || (typeof item.notes === "string" && !Object.keys(parsed).length ? item.notes : "");
  const partyValue = item.partySize ?? item.party ?? item.guests ?? parsed.partySize;
  const partySize = Math.max(1, Number(partyValue) || 2);
  return {
    id,
    title: guestName,
    notes: JSON.stringify({ guestName, email, phone, date, time, partySize, guestNotes: notes }),
    createdAt,
    guestName,
    email,
    phone,
    date,
    time,
    partySize,
    status,
  };
}

function normalizeStore(value: unknown): CafeStore {
  const root = getObject(value);
  const possibleLists = [root.reservations, root.bookings, root.records];
  const list = possibleLists.find(Array.isArray) as unknown[] | undefined;
  const reservations = (list || [])
    .map((item, index) => normalizeReservation(item, index))
    .filter((item): item is Reservation => item !== null);
  return { ...root, reservations };
}

function makeForm(date: string): ReservationForm {
  return { guestName: "", email: "", phone: "", date, time: TIMES[2], partySize: "2", notes: "" };
}

function displayDate(value: string) {
  if (!value) return "Choose a date";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

function capacityFrom(store: CafeStore) {
  const nested = getObject(store.cafe);
  const value = Number(store.capacityPerTime ?? store.slotCapacity ?? nested.capacityPerTime ?? nested.slotCapacity);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_CAPACITY;
}

export default function ManagePage() {
  const [store, setStore] = useState<CafeStore>({ reservations: [] });
  const [ready, setReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReservationForm>(() => makeForm(localDateString()));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved = readLocal<unknown>(STORAGE_KEY, null);
      setStore(normalizeStore(saved));
    } catch {
      setError("We couldn’t load saved reservations. You can still try again by refreshing this page.");
    } finally {
      setReady(true);
    }
  }, []);

  const capacity = capacityFrom(store);
  const dailyReservations = useMemo(
    () => store.reservations.filter((reservation) => reservation.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [store.reservations, selectedDate],
  );
  const confirmedCount = dailyReservations.filter((reservation) => reservation.status === "confirmed").length;
  const guestCount = dailyReservations.filter((reservation) => reservation.status === "confirmed").reduce((sum, reservation) => sum + reservation.partySize, 0);
  const cafe = getObject(store.cafe);
  const cafeName = asText(store.cafeName) || asText(store.name) || asText(cafe.name) || "Juniper Table";

  function persistStore(nextStore: CafeStore) {
    setStore(nextStore);
    writeLocal(STORAGE_KEY, nextStore);
  }

  function openCreate() {
    setEditingId(null);
    setForm(makeForm(selectedDate));
    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function openEdit(reservation: Reservation) {
    setEditingId(reservation.id);
    setForm({
      guestName: reservation.guestName,
      email: reservation.email,
      phone: reservation.phone,
      date: reservation.date,
      time: reservation.time,
      partySize: String(reservation.partySize),
      notes: asText(parseNotes(reservation.notes).guestNotes),
    });
    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function saveReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const partySize = Number(form.partySize);
    if (!form.guestName.trim() || !form.date || !form.time || !Number.isInteger(partySize) || partySize < 1 || partySize > 12) {
      setError("Add a guest name, date, time, and a party size from 1 to 12.");
      return;
    }
    const id = editingId || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `jt-${Date.now()}`);
    const cleanNotes = form.notes.trim();
    const existing = store.reservations.find((item) => item.id === editingId);
    const nextReservation: Reservation = {
      id,
      title: form.guestName.trim(),
      notes: JSON.stringify({ guestName: form.guestName.trim(), email: form.email.trim(), phone: form.phone.trim(), date: form.date, time: form.time, partySize, guestNotes: cleanNotes }),
      createdAt: existing?.createdAt || new Date().toISOString(),
      guestName: form.guestName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      date: form.date,
      time: form.time,
      partySize,
      status: existing?.status || "confirmed",
    };
    const reservations = editingId
      ? store.reservations.map((item) => item.id === editingId ? nextReservation : item)
      : [...store.reservations, nextReservation];
    const nextStore: CafeStore = { ...store, reservations };
    persistStore(nextStore);
    setSelectedDate(form.date);
    setFormOpen(false);
    setEditingId(null);
    setNotice(editingId ? "Reservation updated." : "Reservation added.");
  }

  function updateStatus(id: string, status: Reservation["status"]) {
    const reservations: Reservation[] = store.reservations.map((reservation) =>
      reservation.id === id ? { ...reservation, status } : reservation,
    );
    persistStore({ ...store, reservations });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 text-[var(--primary)] sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Reservation management</p>
          <h1 className="text-3xl font-semibold">{cafeName}</h1>
          <p className="mt-2 text-sm text-white/55">Manage your neighborhood table bookings.</p>
        </div>
        <Button onClick={openCreate}>Add reservation</Button>
      </div>

      {!ready ? <p className="text-sm text-white/55">Loading reservations…</p> : null}
      {error && !formOpen ? <p role="alert" className="mb-4 text-sm text-red-300">{error}</p> : null}
      {notice ? <p role="status" className="mb-4 text-sm text-emerald-300">{notice}</p> : null}

      <Card className="mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex flex-col gap-2 text-sm text-white/65">
            Reservation date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white"
            />
          </label>
          <div className="flex gap-6 text-sm">
            <div><p className="text-white/50">Bookings</p><p className="mt-1 text-lg font-semibold">{confirmedCount}</p></div>
            <div><p className="text-white/50">Guests</p><p className="mt-1 text-lg font-semibold">{guestCount} <span className="text-sm font-normal text-white/45">/ {capacity}</span></p></div>
          </div>
        </div>
      </Card>

      <h2 className="mb-4 text-xl font-semibold">{displayDate(selectedDate)}</h2>
      {dailyReservations.length === 0 ? (
        <EmptyState title="No reservations yet" message="Add a reservation to get started." action={<Button variant="secondary" onClick={openCreate}>Add reservation</Button>} />
      ) : (
        <div className="space-y-3">
          {dailyReservations.map((reservation) => (
            <Card key={reservation.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{reservation.guestName}</h3>
                  <Badge tone={reservation.status === "confirmed" ? "pass" : "bad"}>{reservation.status}</Badge>
                </div>
                <p className="text-sm text-white/55">{reservation.time} · {reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}</p>
                {reservation.email || reservation.phone ? <p className="mt-1 text-xs text-white/40">{[reservation.email, reservation.phone].filter(Boolean).join(" · ")}</p> : null}
                {asText(parseNotes(reservation.notes).guestNotes) ? <p className="mt-2 text-sm text-white/55">{asText(parseNotes(reservation.notes).guestNotes)}</p> : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(reservation)}>Edit</Button>
                {reservation.status === "confirmed" ? (
                  <Button variant="danger" size="sm" onClick={() => updateStatus(reservation.id, "canceled")}>Cancel</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => updateStatus(reservation.id, "confirmed")}>Restore</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="presentation">
          <Card className="my-auto w-full max-w-xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{editingId ? "Edit reservation" : "Add reservation"}</h2>
              <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Close</Button>
            </div>
            {error ? <p role="alert" className="mb-4 text-sm text-red-300">{error}</p> : null}
            <form onSubmit={saveReservation} className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm text-white/65 sm:col-span-2">Guest name
                <input required value={form.guestName} onChange={(event) => setForm({ ...form, guestName: event.target.value })} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/65">Email
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/65">Phone
                <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/65">Date
                <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/65">Time
                <select value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white">
                  {TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/65">Party size
                <input required type="number" min="1" max="12" value={form.partySize} onChange={(event) => setForm({ ...form, partySize: event.target.value })} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/65 sm:col-span-2">Notes
                <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="resize-y rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white" />
              </label>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="secondary" onClick={() => setFormOpen(false)}>Dismiss</Button>
                <Button type="submit">{editingId ? "Save changes" : "Add reservation"}</Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
