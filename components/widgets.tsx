"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Badge, Button, Card, EmptyState, ListRow } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

export type RecordItem = { id: string; title: string; notes: string; createdAt: string };

export type Reservation = RecordItem & {
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: "confirmed" | "canceled";
  cancellationCode: string;
};

export type CafeConfig = {
  cafeName: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string[];
  slotCapacity: number;
  reservations: Reservation[];
};

export const CAFE_CONFIG_KEY =
  "lastmile:table-booking-neighborhood:CafeConfig (client-side localStorage)";

export const DEFAULT_CAFE_CONFIG: CafeConfig = {
  cafeName: "Juniper Table",
  address: "38 Willow Lane, Portland, OR 97205",
  phone: "(503) 555-0148",
  email: "hello@junipertable.example",
  openingHours: [
    "Monday–Friday · 8:00 AM–9:00 PM",
    "Saturday–Sunday · 9:00 AM–10:00 PM",
  ],
  slotCapacity: 24,
  reservations: [],
};

export const SERVICE_TIMES = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM",
];

const inputClass =
  "mt-2 w-full min-w-0 rounded-xl border border-[#dedbd6] bg-white px-3.5 py-3 text-sm text-[#1a1d21] outline-none transition placeholder:text-[#96928c] focus:border-[#4f8cff] focus:ring-4 focus:ring-[#4f8cff]/15 disabled:cursor-not-allowed disabled:bg-[#f3f2f0]";

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayString(): string {
  return localDateString(new Date());
}

export function formatServiceDate(value: string): string {
  if (!value) return "Date not set";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function validConfig(value: unknown): value is CafeConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CafeConfig>;
  return (
    typeof candidate.cafeName === "string" &&
    typeof candidate.address === "string" &&
    typeof candidate.phone === "string" &&
    typeof candidate.email === "string" &&
    Array.isArray(candidate.openingHours) &&
    typeof candidate.slotCapacity === "number" &&
    Array.isArray(candidate.reservations)
  );
}

export function useCafeConfig() {
  const [config, setConfig] = useState<CafeConfig>(DEFAULT_CAFE_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = readLocal<CafeConfig | null>(CAFE_CONFIG_KEY, null);
      if (validConfig(saved)) {
        setConfig({
          ...DEFAULT_CAFE_CONFIG,
          ...saved,
          reservations: saved.reservations.filter(
            (item): item is Reservation =>
              !!item && typeof item.id === "string" && typeof item.date === "string",
          ),
        });
      }
    } catch {
      // Keep the usable demo defaults if saved data is unavailable or malformed.
    } finally {
      setLoaded(true);
    }
  }, []);

  const saveConfig = (next: CafeConfig) => {
    setConfig(next);
    try {
      writeLocal(CAFE_CONFIG_KEY, next);
    } catch {
      // The caller remains usable in memory; screens can report persistence failures if needed.
    }
  };

  return { config, saveConfig, loaded };
}

export function occupiedSeats(
  reservations: Reservation[],
  date: string,
  time: string,
  excludeId?: string,
): number {
  return reservations.reduce((total, item) => {
    if (
      item.id !== excludeId &&
      item.status === "confirmed" &&
      item.date === date &&
      item.time === time
    ) {
      return total + Math.max(0, Number(item.partySize) || 0);
    }
    return total;
  }, 0);
}

export function availableSeats(
  config: CafeConfig,
  date: string,
  time: string,
  excludeId?: string,
): number {
  return Math.max(
    0,
    config.slotCapacity - occupiedSeats(config.reservations, date, time, excludeId),
  );
}

export function CafeDetailsCard({ config = DEFAULT_CAFE_CONFIG }: { config?: CafeConfig }) {
  return (
    <Card className="overflow-hidden border border-[#ece9e4] bg-white">
      <div className="h-1.5 bg-gradient-to-r from-[#4f8cff] via-[#84aaff] to-[#d6e4ff]" />
      <div className="p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4f8cff]">A neighborhood favorite</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-[#1a1d21]">{config.cafeName}</h2>
        <p className="mt-2 break-words text-sm leading-6 text-[#66645f]">{config.address}</p>
        <div className="mt-5 grid gap-4 border-t border-[#efede9] pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold text-[#1a1d21]">Say hello</p>
            <a className="mt-1 block break-all text-[#4f8cff] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4f8cff]" href={`tel:${config.phone.replace(/[^\d+]/g, "")}`}>{config.phone}</a>
            <a className="mt-1 block break-all text-[#4f8cff] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4f8cff]" href={`mailto:${config.email}`}>{config.email}</a>
          </div>
          <div>
            <p className="font-semibold text-[#1a1d21]">Opening hours</p>
            <ul className="mt-1 space-y-1 text-[#66645f]">
              {config.openingHours.map((hours) => <li key={hours} className="break-words">{hours}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ReservationConfirmation({
  reservation,
  cafeName = DEFAULT_CAFE_CONFIG.cafeName,
}: {
  reservation: Reservation;
  cafeName?: string;
}) {
  const cancelHref = `/cancel?code=${encodeURIComponent(reservation.cancellationCode)}`;
  return (
    <Card className="overflow-hidden border border-[#dce9df] bg-white">
      <div className="h-2 bg-[#427c56]" />
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7f2e9] text-xl text-[#427c56]">✓</span>
          <div>
            <Badge tone="pass">Reservation confirmed</Badge>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[#1a1d21]">We saved you a seat.</h2>
          </div>
        </div>
        <p className="mt-4 break-words text-sm leading-6 text-[#66645f]">Your table at <strong className="text-[#1a1d21]">{cafeName}</strong> is booked. We sent the details to {reservation.email}.</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl bg-[#f7f6f3] p-4 text-sm">
          <div><dt className="text-[#77736d]">Date</dt><dd className="mt-1 break-words font-semibold text-[#1a1d21]">{formatServiceDate(reservation.date)}</dd></div>
          <div><dt className="text-[#77736d]">Time</dt><dd className="mt-1 font-semibold text-[#1a1d21]">{reservation.time}</dd></div>
          <div><dt className="text-[#77736d]">Party</dt><dd className="mt-1 font-semibold text-[#1a1d21]">{reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}</dd></div>
          <div><dt className="text-[#77736d]">Name</dt><dd className="mt-1 break-words font-semibold text-[#1a1d21]">{reservation.guestName}</dd></div>
          <div className="col-span-2"><dt className="text-[#77736d]">Contact</dt><dd className="mt-1 break-all font-semibold text-[#1a1d21]">{reservation.phone} · {reservation.email}</dd></div>
        </dl>
        <p className="mt-4 break-words text-sm text-[#66645f]">Need to change plans? <a className="font-semibold text-[#4f8cff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4f8cff]" href={cancelHref}>Cancel this reservation</a>. Your cancellation code is <span className="break-all font-mono text-xs">{reservation.cancellationCode}</span>.</p>
      </div>
    </Card>
  );
}

export function BookingForm({
  config,
  onBooked,
}: {
  config: CafeConfig;
  onBooked: (reservation: Reservation) => void;
}) {
  const [date, setDate] = useState(todayString());
  const [partySize, setPartySize] = useState(2);
  const [time, setTime] = useState("");
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const availableTimes = useMemo(
    () => SERVICE_TIMES.filter((slot) => availableSeats(config, date, slot) >= partySize),
    [config, date, partySize],
  );
  const maxDate = useMemo(() => {
    const last = new Date();
    last.setDate(last.getDate() + 60);
    return localDateString(last);
  }, []);

  useEffect(() => {
    if (!availableTimes.includes(time)) setTime(availableTimes[0] ?? "");
  }, [availableTimes, time]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!time || !availableTimes.includes(time) || availableSeats(config, date, time) < partySize) {
      setError("That time is no longer available for your party. Please choose another time.");
      return;
    }
    const now = new Date().toISOString();
    const reservation: Reservation = {
      id: `jt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: guestName.trim(),
      notes: `${partySize} guests · ${time}`,
      createdAt: now,
      guestName: guestName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      date,
      time,
      partySize,
      status: "confirmed",
      cancellationCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
    };
    onBooked(reservation);
  }

  return (
    <Card className="border border-[#ece9e4] bg-white">
      <form className="space-y-5 p-5 sm:p-6" onSubmit={submit}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4f8cff]">Make it a date</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-[#1a1d21]">Find your table</h2>
          <p className="mt-1 text-sm text-[#77736d]">Choose a date and we’ll show you the seats still open.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-semibold text-[#34363a]">Service date
            <input className={inputClass} type="date" min={todayString()} max={maxDate} value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="min-w-0 text-sm font-semibold text-[#34363a]">Party size
            <select className={inputClass} value={partySize} onChange={(event) => setPartySize(Number(event.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => <option key={size} value={size}>{size} {size === 1 ? "guest" : "guests"}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm font-semibold text-[#34363a] sm:col-span-2">Available time
            <select className={inputClass} value={time} onChange={(event) => setTime(event.target.value)} required disabled={availableTimes.length === 0}>
              {availableTimes.length === 0 ? <option value="">No times available for this party</option> : availableTimes.map((slot) => <option key={slot} value={slot}>{slot} · {availableSeats(config, date, slot)} seats left</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm font-semibold text-[#34363a] sm:col-span-2">Your name
            <input className={inputClass} value={guestName} onChange={(event) => setGuestName(event.target.value)} autoComplete="name" maxLength={200} required placeholder="Name for the reservation" />
          </label>
          <label className="min-w-0 text-sm font-semibold text-[#34363a]">Email
            <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={200} required placeholder="you@example.com" />
          </label>
          <label className="min-w-0 text-sm font-semibold text-[#34363a]">Phone
            <input className={inputClass} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" maxLength={40} required placeholder="(503) 555-0123" />
          </label>
        </div>
        {error && <p role="alert" className="break-words rounded-xl border border-[#f1c9c4] bg-[#fff4f2] p-3 text-sm text-[#9b3b32]">{error}</p>}
        {availableTimes.length === 0 && <p className="text-sm text-[#77736d]">Nothing is available for that date and party size. Try another date or a smaller party.</p>}
        <Button type="submit" size="lg" disabled={!time || availableTimes.length === 0} className="w-full">Reserve a table</Button>
        <p className="text-center text-xs leading-5 text-[#85817a]">Reservations are stored on this device for the demo.</p>
      </form>
    </Card>
  );
}

export function ReservationList({
  reservations,
  selectedDate,
  onChange,
}: {
  reservations: Reservation[];
  selectedDate: string;
  onChange: (next: Reservation[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const visible = reservations.filter((item) => item.date === selectedDate);

  function update(id: string, patch: Partial<Reservation>) {
    onChange(reservations.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function saveEdit(event: FormEvent<HTMLFormElement>, item: Reservation) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const guestName = String(form.get("guestName") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const time = String(form.get("time") || "");
    const partySize = Number(form.get("partySize"));
    if (!guestName || !email || !phone || !SERVICE_TIMES.includes(time) || partySize < 1 || partySize > 8) {
      setError("Please check the guest details, party size, and service time.");
      return;
    }
    const occupied = occupiedSeats(reservations, item.date, time, item.id);
    if (occupied + partySize > DEFAULT_CAFE_CONFIG.slotCapacity) {
      setError("That time does not have enough remaining capacity. Choose another time or party size.");
      return;
    }
    setError("");
    update(item.id, { guestName, title: guestName, email, phone, time, partySize, notes: `${partySize} guests · ${time}` });
    setEditingId(null);
  }

  return (
    <section className="space-y-4">
      {error && <p role="alert" className="break-words rounded-xl border border-[#f1c9c4] bg-[#fff4f2] p-3 text-sm text-[#9b3b32]">{error}</p>}
      {visible.length === 0 ? (
        <EmptyState title="No reservations yet" message="There are no reservations for this service date." icon="✳" />
      ) : visible.slice().sort((a, b) => SERVICE_TIMES.indexOf(a.time) - SERVICE_TIMES.indexOf(b.time)).map((item) => (
        <Card key={item.id} className="min-w-0 border border-[#ece9e4] bg-white p-4 sm:p-5">
          {editingId === item.id ? (
            <form className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(event) => saveEdit(event, item)}>
              <label className="text-sm font-semibold">Guest name<input className={inputClass} name="guestName" defaultValue={item.guestName} maxLength={200} required /></label>
              <label className="text-sm font-semibold">Email<input className={inputClass} name="email" type="email" defaultValue={item.email} maxLength={200} required /></label>
              <label className="text-sm font-semibold">Phone<input className={inputClass} name="phone" type="tel" defaultValue={item.phone} maxLength={40} required /></label>
              <label className="text-sm font-semibold">Party size<select className={inputClass} name="partySize" defaultValue={item.partySize}>{[1, 2, 3, 4, 5, 6, 7, 8].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
              <label className="text-sm font-semibold sm:col-span-2">Time<select className={inputClass} name="time" defaultValue={item.time}>{SERVICE_TIMES.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
              <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" size="sm">Save changes</Button><Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(null); setError(""); }}>Keep current details</Button></div>
            </form>
          ) : (
            <>
              <ListRow title={item.guestName || item.title} subtitle={`${item.time} · ${item.partySize} ${item.partySize === 1 ? "guest" : "guests"} · ${item.email} · ${item.phone}`} trailing={<Badge tone={item.status === "confirmed" ? "pass" : "neutral"}>{item.status === "confirmed" ? "Confirmed" : "Canceled"}</Badge>} />
              {item.status === "confirmed" && <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(item.id); setError(""); }}>Edit reservation</Button><Button type="button" variant="danger" size="sm" onClick={() => update(item.id, { status: "canceled" })}>Cancel reservation</Button></div>}
            </>
          )}
        </Card>
      ))}
    </section>
  );
}

export function StaffReservationForm({
  date,
  config,
  onCreate,
}: {
  date: string;
  config: CafeConfig;
  onCreate: (reservation: Reservation) => void;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const guestName = String(form.get("guestName") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const time = String(form.get("time") || "");
    const partySize = Number(form.get("partySize"));
    if (!guestName || !email || !phone || !SERVICE_TIMES.includes(time) || partySize < 1 || partySize > 8) {
      setError("Please enter valid guest details, party size, and service time.");
      return;
    }
    if (availableSeats(config, date, time) < partySize) {
      setError("That slot does not have enough available seats. Choose another time or smaller party.");
      return;
    }
    const now = new Date().toISOString();
    onCreate({
      id: `jt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: guestName,
      notes: `${partySize} guests · ${time}`,
      createdAt: now,
      guestName,
      email,
      phone,
      date,
      time,
      partySize,
      status: "confirmed",
      cancellationCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
    });
    setError("");
    event.currentTarget.reset();
  }
  return (
    <Card className="border border-[#ece9e4] bg-white p-5">
      <h2 className="font-serif text-xl font-semibold text-[#1a1d21]">Add a reservation</h2>
      <p className="mt-1 text-sm text-[#77736d]">For {formatServiceDate(date)}.</p>
      <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-semibold">Guest name<input className={inputClass} name="guestName" maxLength={200} required placeholder="Guest name" /></label>
        <label className="text-sm font-semibold">Email<input className={inputClass} name="email" type="email" maxLength={200} required placeholder="guest@example.com" /></label>
        <label className="text-sm font-semibold">Phone<input className={inputClass} name="phone" type="tel" maxLength={40} required placeholder="(503) 555-0123" /></label>
        <label className="text-sm font-semibold">Party size<select className={inputClass} name="partySize" defaultValue="2">{[1, 2, 3, 4, 5, 6, 7, 8].map((size) => <option key={size} value={size}>{size} {size === 1 ? "guest" : "guests"}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Time<select className={inputClass} name="time" defaultValue="" required><option value="" disabled>Select a time</option>{SERVICE_TIMES.map((slot) => <option key={slot} value={slot}>{slot} · {availableSeats(config, date, slot)} seats left</option>)}</select></label>
        {error && <p role="alert" className="break-words rounded-xl border border-[#f1c9c4] bg-[#fff4f2] p-3 text-sm text-[#9b3b32] sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2"><Button type="submit">Create reservation</Button></div>
      </form>
    </Card>
  );
}

export function ReservationCancelView({
  code,
  config,
  onCancel,
}: {
  code: string;
  config: CafeConfig;
  onCancel: (reservationId: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const reservation = config.reservations.find((item) => item.cancellationCode === code && item.status === "confirmed");

  if (!code || !reservation) {
    return <EmptyState title="We couldn’t find that reservation" message="This cancellation link may be invalid, expired, or already used. Check the code in your confirmation and try again." icon="⌕" />;
  }
  if (confirmed) {
    return <Card className="border border-[#dce9df] bg-white p-6"><Badge tone="pass">Reservation canceled</Badge><h2 className="mt-3 font-serif text-2xl font-semibold text-[#1a1d21]">Your plans have changed.</h2><p className="mt-2 break-words text-sm leading-6 text-[#66645f]">The reservation for {reservation.guestName} on {formatServiceDate(reservation.date)} at {reservation.time} has been canceled.</p></Card>;
  }
  return (
    <Card className="border border-[#ece9e4] bg-white p-5 sm:p-6">
      <Badge tone="warn">Cancellation requested</Badge>
      <h2 className="mt-3 font-serif text-2xl font-semibold text-[#1a1d21]">Cancel this reservation?</h2>
      <dl className="mt-4 space-y-2 text-sm text-[#66645f]"><div><dt className="inline">Guest: </dt><dd className="inline break-words font-semibold text-[#1a1d21]">{reservation.guestName}</dd></div><div><dt className="inline">Date and time: </dt><dd className="inline font-semibold text-[#1a1d21]">{formatServiceDate(reservation.date)} · {reservation.time}</dd></div><div><dt className="inline">Party: </dt><dd className="inline font-semibold text-[#1a1d21]">{reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}</dd></div></dl>
      {error && <p role="alert" className="mt-4 break-words rounded-xl border border-[#f1c9c4] bg-[#fff4f2] p-3 text-sm text-[#9b3b32]">{error}</p>}
      <Button className="mt-5" type="button" variant="danger" onClick={() => { const stillValid = config.reservations.some((item) => item.id === reservation.id && item.status === "confirmed" && item.cancellationCode === code); if (!stillValid) { setError("This reservation has already changed and can no longer be canceled from this link."); return; } onCancel(reservation.id); setConfirmed(true); }}>Confirm cancellation</Button>
    </Card>
  );
}
