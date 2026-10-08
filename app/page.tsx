"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Badge, EmptyState, ListRow } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

/* ------------------------------------------------------------------ */
/* Shared contract types (declared once, imported elsewhere)           */
/* ------------------------------------------------------------------ */

export type RecordItem = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
};

export type ReservationStatus = "confirmed" | "seated" | "cancelled" | "no-show";

export type Reservation = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string;
  partySize: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: ReservationStatus;
  notes: string;
  createdAt: string;
};

export type Settings = {
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
  slotInterval: number; // minutes
  maxCoversPerSlot: number;
};

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "lastmile:table-booking-neighborhood:reservations";
const SETTINGS_KEY = "lastmile:table-booking-neighborhood:settings";
const MAX_PARTY = 12;
const DAYS_AHEAD = 14;

const DEFAULT_SETTINGS: Settings = {
  openTime: "11:00",
  closeTime: "22:00",
  slotInterval: 30,
  maxCoversPerSlot: 40,
};

const STATUS_META: Record<ReservationStatus, { label: string; tone: "brand" | "pass" | "warn" | "bad" | "neutral" }> = {
  confirmed: { label: "Confirmed", tone: "brand" },
  seated: { label: "Seated", tone: "pass" },
  cancelled: { label: "Cancelled", tone: "bad" },
  "no-show": { label: "No-show", tone: "warn" },
};

/* ------------------------------------------------------------------ */
/* Pure helpers (no React, no storage)                                 */
/* ------------------------------------------------------------------ */

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

function todayKey(): string {
  return dateKey(new Date());
}

function formatLongDate(key: string): string {
  return parseDateKey(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(key: string): string {
  return parseDateKey(key).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CT-${out}`;
}

function makeId(): string {
  return `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildSlots(settings: Settings): string[] {
  const open = toMinutes(settings.openTime);
  const close = toMinutes(settings.closeTime);
  const interval = Math.max(5, settings.slotInterval);
  const slots: string[] = [];
  for (let t = open; t < close; t += interval) {
    slots.push(toHHMM(t));
  }
  return slots;
}

function coversFor(reservations: Reservation[], date: string, time: string): number {
  return reservations
    .filter((r) => r.date === date && r.time === time && (r.status === "confirmed" || r.status === "seated"))
    .reduce((sum, r) => sum + r.partySize, 0);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhone(value: string): boolean {
  return value.replace(/[^0-9]/g, "").length >= 7;
}

/* ------------------------------------------------------------------ */
/* Storage helpers (guarded — only ever called from effects/handlers)  */
/* ------------------------------------------------------------------ */

function loadReservations(): Reservation[] {
  const raw = readLocal<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is Reservation => {
    if (!r || typeof r !== "object") return false;
    const o = r as Record<string, unknown>;
    return typeof o.id === "string" && typeof o.date === "string" && typeof o.time === "string";
  });
}

function loadSettings(): Settings {
  const raw = readLocal<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS);
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const o = raw as Record<string, unknown>;
  return {
    openTime: typeof o.openTime === "string" ? o.openTime : DEFAULT_SETTINGS.openTime,
    closeTime: typeof o.closeTime === "string" ? o.closeTime : DEFAULT_SETTINGS.closeTime,
    slotInterval: typeof o.slotInterval === "number" ? o.slotInterval : DEFAULT_SETTINGS.slotInterval,
    maxCoversPerSlot: typeof o.maxCoversPerSlot === "number" ? o.maxCoversPerSlot : DEFAULT_SETTINGS.maxCoversPerSlot,
  };
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-[#8b93a1]">{label}</span>
        {hint ? <span className="text-[11px] text-[#5b6472]">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="mt-1.5 text-xs text-[#ff6b6b]">{error}</p> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-[#262b33] bg-[#0b0d10] px-3 py-2.5 text-sm text-[#e6e9ef] placeholder:text-[#5b6472] outline-none transition focus:border-[#4f8cff] focus:ring-2 focus:ring-[#4f8cff]/25";

function PartySizePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {Array.from({ length: MAX_PARTY }, (_, i) => i + 1).map((n) => {
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={active}
            className={`rounded-md border py-2.5 font-mono text-sm transition ${
              active
                ? "border-[#4f8cff] bg-[#4f8cff]/15 text-[#4f8cff]"
                : "border-[#262b33] bg-[#0b0d10] text-[#8b93a1] hover:border-[#3a4150] hover:text-[#e6e9ef]"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

type Step = "details" | "contact" | "confirmed";

type FormErrors = { name?: string; phone?: string; email?: string };

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [step, setStep] = useState<Step>("details");
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState<string>(todayKey());
  const [time, setTime] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const [confirmed, setConfirmed] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);

  const reservationsRef = useRef<Reservation[]>([]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const mountedRef = useRef(false);

  /* Hydrate from storage exactly once on the client. */
  useEffect(() => {
    try {
      const res = loadReservations();
      const set = loadSettings();
      reservationsRef.current = res;
      settingsRef.current = set;
      setReservations(res);
      setSettings(set);
    } catch {
      setStorageWarning(true);
    }
    setHydrated(true);
    mountedRef.current = true;
  }, []);

  /* Persist whenever reservations change (after hydration). */
  useEffect(() => {
    if (!mountedRef.current) return;
    try {
      writeLocal(STORAGE_KEY, reservations);
    } catch {
      setStorageWarning(true);
    }
  }, [reservations]);

  /* Keep the selected slot valid when settings change (e.g. hours narrowed). */
  useEffect(() => {
    if (!hydrated) return;
    const slots = buildSlots(settings);
    if (time && !slots.includes(time)) {
      setTime(null);
    }
  }, [settings, hydrated, time]);

  const slots = useMemo(() => buildSlots(settings), [settings]);
  const dayOptions = useMemo(() => {
    const base = todayKey();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(base, i));
  }, []);

  const slotCovers = useCallback(
    (t: string) => coversFor(reservations, date, t),
    [reservations, date]
  );

  const selectedCovers = time ? slotCovers(time) : 0;
  const selectedRemaining = time ? Math.max(0, settings.maxCoversPerSlot - selectedCovers) : 0;
  const canProceed = Boolean(time) && selectedRemaining >= partySize;

  const resetFlow = useCallback(() => {
    setStep("details");
    setTime(null);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setErrors({});
    setConfirmed(null);
    setError(null);
  }, []);

  const handleProceed = () => {
    if (!canProceed) return;
    setErrors({});
    setError(null);
    setStep("contact");
  };

  const handleBackToDetails = () => {
    setErrors({});
    setError(null);
    setStep("details");
  };

  const handleSubmit = () => {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Please enter the guest name.";
    if (!isPhone(phone)) next.phone = "Enter a valid phone number (at least 7 digits).";
    if (!isEmail(email)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (!time) {
      setError("No time slot selected. Please pick an available slot.");
      return;
    }

    // Re-check capacity against the freshest known state to reduce overbooking.
    const currentCovers = coversFor(reservationsRef.current, date, time);
    if (currentCovers + partySize > settingsRef.current.maxCoversPerSlot) {
      setError(
        `This slot just filled up — only ${Math.max(0, settingsRef.current.maxCoversPerSlot - currentCovers)} cover(s) remain. Please choose another time.`
      );
      setStep("details");
      setTime(null);
      return;
    }

    try {
      const reservation: Reservation = {
        id: makeId(),
        reference: makeReference(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        partySize,
        date,
        time,
        status: "confirmed",
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };
      const nextReservations = [reservation, ...reservationsRef.current];
      reservationsRef.current = nextReservations;
      setReservations(nextReservations);
      setConfirmed(reservation);
      setError(null);
      setStep("confirmed");
    } catch {
      setError("We couldn't save your reservation. Please try again.");
    }
  };

  const dayLabel = formatLongDate(date);

  /* ------------------------- Render ------------------------- */

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef]">
      {/* Header */}
      <header className="border-b border-[#1c2027] bg-[#0b0d10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#262b33] bg-[#14171c] font-mono text-sm font-semibold text-[#4f8cff]">
              CT
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-tight">CornerTable</h1>
              <p className="font-mono text-[11px] text-[#5b6472]">The Neighborhood · Reservations</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone="neutral">Open {formatTime12(settings.openTime)} – {formatTime12(settings.closeTime)}</Badge>
            <Badge tone="brand">{settings.maxCoversPerSlot} covers / slot</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {storageWarning ? (
          <div className="mb-5 flex items-start gap-3 rounded-md border border-[#3a2a12] bg-[#1a1408] px-4 py-3 text-sm text-[#e0b877]">
            <span aria-hidden>⚠</span>
            <p>
              Browser storage is unavailable or was cleared, so previously saved reservations may not be shown. New
              bookings will still work for this session.
            </p>
          </div>
        ) : null}

        {/* Step indicator */}
        <ol className="mb-6 flex items-center gap-2 text-xs">
          {(["details", "contact", "confirmed"] as Step[]).map((s, i) => {
            const active = step === s;
            const done = ["details", "contact", "confirmed"].indexOf(step) > i;
            return (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[11px] ${
                    active
                      ? "border-[#4f8cff] bg-[#4f8cff]/15 text-[#4f8cff]"
                      : done
                      ? "border-[#2f6b3a] bg-[#122016] text-[#5fd08a]"
                      : "border-[#262b33] bg-[#14171c] text-[#5b6472]"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={active ? "text-[#e6e9ef]" : "text-[#5b6472]"}>
                  {s === "details" ? "Details" : s === "contact" ? "Contact" : "Confirmed"}
                </span>
                {i < 2 ? <span className="h-px w-6 bg-[#262b33]" /> : null}
              </li>
            );
          })}
        </ol>

        {!hydrated ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-[#1c2027] bg-[#14171c]">
            <p className="font-mono text-sm text-[#5b6472]">Loading availability…</p>
          </div>
        ) : step === "confirmed" && confirmed ? (
          <ConfirmationCard reservation={confirmed} onNew={resetFlow} />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* Left: form */}
            <div className="space-y-5">
              {step === "details" ? (
                <Card className="p-5">
                  <h2 className="text-base font-semibold">Book a table</h2>
                  <p className="mt-1 text-sm text-[#8b93a1]">Choose your party size, date and an available time.</p>

                  <div className="mt-5 space-y-5">
                    <Field label="Party size" hint="guests">
                      <PartySizePicker value={partySize} onChange={setPartySize} />
                    </Field>

                    <Field label="Date">
                      <div className="flex flex-wrap gap-1.5">
                        {dayOptions.map((d) => {
                          const active = d === date;
                          const isToday = d === todayKey();
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setDate(d);
                                setTime(null);
                              }}
                              aria-pressed={active}
                              className={`rounded-md border px-3 py-2 text-left transition ${
                                active
                                  ? "border-[#4f8cff] bg-[#4f8cff]/15"
                                  : "border-[#262b33] bg-[#0b0d10] hover:border-[#3a4150]"
                              }`}
                            >
                              <span className={`block text-xs font-medium ${active ? "text-[#4f8cff]" : "text-[#e6e9ef]"}`}>
                                {isToday ? "Today" : formatShortDate(d)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    <Field label="Time" hint={dayLabel}>
                      {slots.length === 0 ? (
                        <EmptyState
                          title="No slots available"
                          message="The restaurant has no open time slots for the selected hours."
                          description="Try a different date or check back later."
                        />
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                          {slots.map((t) => {
                            const covers = slotCovers(t);
                            const remaining = Math.max(0, settings.maxCoversPerSlot - covers);
                            const full = remaining < partySize;
                            const active = t === time;
                            return (
                              <button
                                key={t}
                                type="button"
                                disabled={full}
                                onClick={() => setTime(t)}
                                aria-pressed={active}
                                className={`rounded-md border px-2 py-2 text-center transition ${
                                  full
                                    ? "cursor-not-allowed border-[#1c2027] bg-[#0b0d10] opacity-45"
                                    : active
                                    ? "border-[#4f8cff] bg-[#4f8cff]/15"
                                    : "border-[#262b33] bg-[#0b0d10] hover:border-[#3a4150]"
                                }`}
                              >
                                <span
                                  className={`block font-mono text-sm ${
                                    full ? "text-[#5b6472]" : active ? "text-[#4f8cff]" : "text-[#e6e9ef]"
                                  }`}
                                >
                                  {formatTime12(t)}
                                </span>
                                <span className="block text-[10px] text-[#5b6472]">
                                  {full ? "Full" : `${remaining} left`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Field>
                  </div>

                  {error ? (
                    <p className="mt-4 rounded-md border border-[#3a1a1a] bg-[#1a0d0d] px-3 py-2 text-sm text-[#ff8a8a]">{error}</p>
                  ) : null}

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#1c2027] pt-4">
                    <p className="text-xs text-[#5b6472]">
                      {time ? (
                        <>
                          {partySize} guest{partySize > 1 ? "s" : ""} · {formatTime12(time)} · {selectedRemaining} cover
                          {selectedRemaining === 1 ? "" : "s"} left
                        </>
                      ) : (
                        "Select a time to continue"
                      )}
                    </p>
                    <Button variant="primary" size="md" disabled={!canProceed} onClick={handleProceed}>
                      Continue
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">Your contact details</h2>
                      <p className="mt-1 text-sm text-[#8b93a1]">We'll use these to confirm your table.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleBackToDetails}>
                      ← Back
                    </Button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <Field label="Full name" error={errors.name}>
                      <input
                        className={inputClass}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jordan Rivera"
                        autoComplete="name"
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Phone" error={errors.phone}>
                        <input
                          className={inputClass}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                          inputMode="tel"
                          autoComplete="tel"
                        />
                      </Field>
                      <Field label="Email" error={errors.email}>
                        <input
                          className={inputClass}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jordan@example.com"
                          inputMode="email"
                          autoComplete="email"
                        />
                      </Field>
                    </div>

                    <Field label="Notes (optional)" hint={`${notes.length}/200`}>
                      <textarea
                        className={`${inputClass} min-h-[80px] resize-y`} maxLength={200}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Allergies, high chair, celebration…"
                      />
                    </Field>
                  </div>

                  {error ? (
                    <p className="mt-4 rounded-md border border-[#3a1a1a] bg-[#1a0d0d] px-3 py-2 text-sm text-[#ff8a8a]">{error}</p>
                  ) : null}

                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#1c2027] pt-4">
                    <Button variant="outline" size="md" onClick={handleBackToDetails}>
                      Back
                    </Button>
                    <Button variant="primary" size="md" onClick={handleSubmit}>
                      Confirm reservation
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Right: summary */}
            <aside className="space-y-4">
              <Card className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b93a1]">Summary</h3>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <SummaryRow label="Party" value={`${partySize} guest${partySize > 1 ? "s" : ""}`} />
                  <SummaryRow label="Date" value={formatShortDate(date)} />
                  <SummaryRow label="Time" value={time ? formatTime12(time) : "—"} mono />
                  <SummaryRow
                    label="Availability"
                    value={time ? `${selectedRemaining} cover${selectedRemaining === 1 ? "" : "s"} left` : "—"}
                    mono
                  />
                </dl>
                <div className="mt-4 rounded-md border border-[#1c2027] bg-[#0b0d10] p-3 text-xs text-[#5b6472]">
                  Slots are {settings.slotInterval}-minute intervals between {formatTime12(settings.openTime)} and{" "}
                  {formatTime12(settings.closeTime)}. Max {settings.maxCoversPerSlot} covers per slot.
                </div>
              </Card>

              <RecentBookings reservations={reservations} date={date} />
            </aside>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="font-mono text-[11px] text-[#3f4653]">CornerTable · local demo — bookings are stored in this browser.</p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#8b93a1]">{label}</dt>
      <dd className={mono ? "font-mono text-[#e6e9ef]" : "text-[#e6e9ef]"}>{value}</dd>
    </div>
  );
}

function RecentBookings({ reservations, date }: { reservations: Reservation[]; date: string }) {
  const todays = reservations
    .filter((r) => r.date === date && (r.status === "confirmed" || r.status === "seated"))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 5);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b93a1]">On {formatShortDate(date)}</h3>
        <Badge tone="neutral">{todays.length}</Badge>
      </div>
      {todays.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No bookings yet"
            message="Reservations for this date will appear here."
            description="Be the first to book a table."
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-1">
          {todays.map((r) => (
            <ListRow
              key={r.id}
              title={`${r.name} · ${r.partySize} guests`}
              subtitle={formatTime12(r.time)}
              trailing={<Badge tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</Badge>}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ConfirmationCard({ reservation, onNew }: { reservation: Reservation; onNew: () => void }) {
  const meta = STATUS_META[reservation.status];
  return (
    <div className="mx-auto max-w-xl">
      <Card className="overflow-hidden">
        <div className="border-b border-[#1c2027] bg-[#14171c] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2f6b3a] bg-[#122016] text-[#5fd08a]">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-semibold">Reservation confirmed</h2>
              <p className="text-sm text-[#8b93a1]">A confirmation has been saved to this device.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center justify-between rounded-md border border-[#262b33] bg-[#0b0d10] px-4 py-3">
            <span className="text-xs uppercase tracking-wider text-[#8b93a1]">Booking reference</span>
            <span className="font-mono text-lg font-semibold text-[#4f8cff]">{reservation.reference}</span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5b6472]">Guest</dt>
              <dd className="mt-0.5 break-words text-[#e6e9ef]">{reservation.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5b6472]">Party</dt>
              <dd className="mt-0.5 font-mono text-[#e6e9ef]">{reservation.partySize} guest{reservation.partySize > 1 ? "s" : ""}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5b6472]">Date</dt>
              <dd className="mt-0.5 text-[#e6e9ef]">{formatLongDate(reservation.date)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5b6472]">Time</dt>
              <dd className="mt-0.5 font-mono text-[#e6e9ef]">{formatTime12(reservation.time)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5b6472]">Phone</dt>
              <dd className="mt-0.5 font-mono text-[#e6e9ef]">{reservation.phone}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5b6472]">Email</dt>
              <dd className="mt-0.5 break-words text-[#e6e9ef]">{reservation.email}</dd>
            </div>
          </dl>

          {reservation.notes ? (
            <div className="mt-4 rounded-md border border-[#1c2027] bg-[#0b0d10] px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-[#5b6472]">Notes</p>
              <p className="mt-1 break-words text-sm text-[#c7ccd6]">{reservation.notes}</p>
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="text-xs text-[#5b6472]">Show this reference at the host stand.</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#1c2027] bg-[#14171c] px-6 py-4">
          <Button variant="outline" size="md" onClick={onNew}>
            Make another booking
          </Button>
        </div>
      </Card>
    </div>
  );
}
