"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Badge, EmptyState } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

/* ------------------------------------------------------------------ */
/* Shared data model — matches the main screen exactly.                */
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
  ref: string;
  name: string;
  phone: string;
  email: string;
  partySize: number;
  date: string; // YYYY-MM-DD
  slot: string; // HH:MM
  status: ReservationStatus;
  createdAt: string;
};

export type CafeSettings = {
  cafeName: string;
  address: string;
  phone: string;
  email: string;
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
  slotMinutes: number;
  maxCoversPerSlot: number;
};

const STORAGE_KEY = "lastmile:table-booking-neighborhood:reservations";
const SETTINGS_KEY = "lastmile:table-booking-neighborhood:settings";

const DEFAULT_SETTINGS: CafeSettings = {
  cafeName: "CornerTable",
  address: "14 Alder Lane, Riverside",
  phone: "(555) 014-2288",
  email: "hello@cornertable.cafe",
  openTime: "08:00",
  closeTime: "16:00",
  slotMinutes: 30,
  maxCoversPerSlot: 12,
};

/* ------------------------------------------------------------------ */
/* Small pure helpers                                                  */
/* ------------------------------------------------------------------ */

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function toHHMM(mins: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(mins)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function makeRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CT-${out}`;
}

function makeId(): string {
  return `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampTime(value: string, min: number, max: number): string {
  const mins = toMinutes(value);
  return toHHMM(clampInt(mins, min, max));
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

function formatLongDate(iso: string): string {
  const [y, mo, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !mo || !d) return iso;
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function buildSlots(openTime: string, closeTime: string, slotMinutes: number): string[] {
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const step = Math.max(5, slotMinutes);
  const slots: string[] = [];
  for (let t = open; t < close; t += step) {
    slots.push(toHHMM(t));
  }
  return slots;
}

function sanitizeSettings(raw: unknown): CafeSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v : fb);
  const num = (v: unknown, fb: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fb;
  return {
    cafeName: str(r.cafeName, base.cafeName),
    address: str(r.address, base.address),
    phone: str(r.phone, base.phone),
    email: str(r.email, base.email),
    openTime: clampTime(str(r.openTime, base.openTime), 0, 1439),
    closeTime: clampTime(str(r.closeTime, base.closeTime), 0, 1439),
    slotMinutes: clampInt(num(r.slotMinutes, base.slotMinutes), 5, 180),
    maxCoversPerSlot: clampInt(num(r.maxCoversPerSlot, base.maxCoversPerSlot), 1, 200),
  };
}

/* ------------------------------------------------------------------ */
/* Local presentational widgets                                        */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8a93a3]"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-[#5f6875]">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-[#262c35] bg-[#0b0d10] px-3 py-2 text-sm text-[#e6e9ef] " +
  "placeholder:text-[#4a5260] outline-none transition-colors focus:border-[#4f8cff] " +
  "focus:ring-1 focus:ring-[#4f8cff]/40";

function SectionHeader({
  index,
  title,
  description,
  badge,
}: {
  index: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1d222a] pb-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 font-mono text-xs text-[#4f8cff]">{index}</span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#e6e9ef]">{title}</h2>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-[#8a93a3]">{description}</p>
        </div>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-[#1d222a] bg-[#0b0d10] px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5f6875]">
        {label}
      </div>
      <div
        className={
          "mt-1 font-mono text-lg leading-none " + (accent ? "text-[#4f8cff]" : "text-[#e6e9ef]")
        }
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-[11px] text-[#5f6875]">{sub}</div> : null}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  id?: string;
}) {
  const dec = () => onChange(clampInt(value - step, min, max));
  const inc = () => onChange(clampInt(value + step, min, max));
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-md border border-[#262c35] bg-[#0b0d10] " +
    "text-base text-[#e6e9ef] transition-colors hover:border-[#4f8cff] hover:text-[#4f8cff] " +
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#262c35] disabled:hover:text-[#e6e9ef]";
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={dec} disabled={value <= min} className={btn} aria-label="decrease">
        −
      </button>
      <div className="flex min-w-[92px] items-center justify-center gap-1 rounded-md border border-[#262c35] bg-[#0b0d10] px-3 py-2">
        <span id={id} className="font-mono text-sm text-[#e6e9ef]">
          {value}
        </span>
        {suffix ? <span className="text-[11px] text-[#5f6875]">{suffix}</span> : null}
      </div>
      <button type="button" onClick={inc} disabled={value >= max} className={btn} aria-label="increase">
        +
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ManagerSettingsPage() {
  const [settings, setSettings] = useState<CafeSettings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<CafeSettings>(DEFAULT_SETTINGS);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load persisted state once on the client (never during render — this page is prerendered).
  useEffect(() => {
    try {
      const raw = readLocal<unknown>(STORAGE_KEY, []);
      const list = Array.isArray(raw) ? (raw as Reservation[]) : [];
      setReservations(list);
      const s = sanitizeSettings(readLocal<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS));
      setSettings(s);
      setDraft(s);
    } catch {
      setError("Could not read saved settings. Showing defaults — your changes will still save.");
    } finally {
      setLoaded(true);
    }
  }, []);

  // Cross-tab sync: keep this screen consistent with other tabs writing the same key.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const raw = readLocal<unknown>(STORAGE_KEY, []);
          setReservations(Array.isArray(raw) ? (raw as Reservation[]) : []);
        } catch {
          /* ignore malformed cross-tab payloads */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Auto-dismiss the transient "saved" confirmation.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
  }, [saved]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings]
  );

  const openMins = toMinutes(draft.openTime);
  const closeMins = toMinutes(draft.closeTime);
  const hoursValid = closeMins > openMins;
  const slots = useMemo(
    () => (hoursValid ? buildSlots(draft.openTime, draft.closeTime, draft.slotMinutes) : []),
    [draft.openTime, draft.closeTime, draft.slotMinutes, hoursValid]
  );
  const durationMins = Math.max(0, closeMins - openMins);
  const coversPerDay = slots.length * draft.maxCoversPerSlot;

  const today = todayISO();
  const todayRes = useMemo(
    () => reservations.filter((r) => r.date === today && r.status !== "cancelled" && r.status !== "no-show"),
    [reservations, today]
  );
  const todayCovers = todayRes.reduce((sum, r) => sum + r.partySize, 0);
  const todayBookedSlots = new Set(todayRes.map((r) => r.slot)).size;
  const todayFullSlots = todayRes.filter(
    (r) => r.partySize >= draft.maxCoversPerSlot
  ).length;

  const update = <K extends keyof CafeSettings>(key: K, value: CafeSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    try {
      const next = sanitizeSettings(draft);
      if (toMinutes(next.closeTime) <= toMinutes(next.openTime)) {
        setError("Closing time must be after opening time. Adjust the hours and try again.");
        return;
      }
      writeLocal(SETTINGS_KEY, next);
      setSettings(next);
      setDraft(next);
      setError(null);
      setSaved(true);
    } catch {
      setError("Saving failed — your browser blocked local storage. Nothing was written.");
    }
  };

  const handleRevert = () => {
    setDraft(settings);
    setError(null);
  };

  const handleReset = () => {
    try {
      writeLocal(SETTINGS_KEY, DEFAULT_SETTINGS);
      setSettings(DEFAULT_SETTINGS);
      setDraft(DEFAULT_SETTINGS);
      setConfirmReset(false);
      setError(null);
      setSaved(true);
    } catch {
      setError("Reset failed — could not write defaults to local storage.");
    }
  };

  const handleClearReservations = () => {
    try {
      writeLocal(STORAGE_KEY, []);
      setReservations([]);
      setError(null);
      setSaved(true);
    } catch {
      setError("Clearing reservations failed — local storage is unavailable.");
    }
  };

  const slotPreview = slots.slice(0, 12);
  const hiddenSlots = slots.length - slotPreview.length;

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e6e9ef]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#262c35] bg-[#14171c] font-mono text-sm text-[#4f8cff]">
              CT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">Manager Settings</h1>
                <Badge tone="neutral">/manager/settings</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8a93a3]">
                Configure operating hours, slot intervals, and capacity. These values drive the
                customer booking flow on the front page and the live shift view on the diary.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved ? (
              <Badge tone="pass">Saved</Badge>
            ) : isDirty ? (
              <Badge tone="warn">Unsaved changes</Badge>
            ) : (
              <Badge tone="neutral">In sync</Badge>
            )}
          </div>
        </header>

        {/* Error banner */}
        {error ? (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-md border border-[#7a2f36] bg-[#1a1114] px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 font-mono text-xs text-[#ff7a86]">!</span>
              <p className="text-sm text-[#f3c9cd]">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-xs text-[#8a93a3] underline-offset-2 hover:text-[#e6e9ef] hover:underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {/* Live impact preview */}
        <Card className="mt-5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a93a3]">
              Live impact preview
            </h2>
            <span className="font-mono text-[11px] text-[#5f6875]">draft values</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              label="Open hours"
              value={hoursValid ? formatDuration(durationMins) : "—"}
              sub={`${formatTime12(draft.openTime)} – ${formatTime12(draft.closeTime)}`}
            />
            <StatTile
              label="Slots / day"
              value={String(slots.length)}
              sub={`${draft.slotMinutes} min interval`}
              accent
            />
            <StatTile
              label="Covers / slot"
              value={String(draft.maxCoversPerSlot)}
              sub="max party capacity"
            />
            <StatTile
              label="Covers / day"
              value={String(coversPerDay)}
              sub="total seatings possible"
            />
          </div>
          <div className="mt-3 border-t border-[#1d222a] pt-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6875]">
              Selectable slots on the front page
            </div>
            {slots.length === 0 ? (
              <p className="text-xs text-[#8a93a3]">
                No slots yet — set a closing time after the opening time to generate the booking grid.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {slotPreview.map((s) => (
                  <span
                    key={s}
                    className="rounded border border-[#262c35] bg-[#0b0d10] px-2 py-1 font-mono text-[11px] text-[#c7cdd8]"
                  >
                    {s}
                  </span>
                ))}
                {hiddenSlots > 0 ? (
                  <span className="rounded border border-dashed border-[#262c35] px-2 py-1 font-mono text-[11px] text-[#5f6875]">
                    +{hiddenSlots} more
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </Card>

        {/* Settings form */}
        <form
          className="mt-5 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {/* Cafe details */}
          <Card className="p-5">
            <SectionHeader
              index="01"
              title="Cafe details"
              description="Shown to customers on the booking page and printed on confirmation cards."
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Cafe name" htmlFor="cafeName">
                <input
                  id="cafeName"
                  className={inputClass}
                  value={draft.cafeName}
                  onChange={(e) => update("cafeName", e.target.value)}
                  placeholder="CornerTable"
                />
              </Field>
              <Field label="Phone" htmlFor="cafePhone">
                <input
                  id="cafePhone"
                  className={inputClass}
                  value={draft.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(555) 014-2288"
                />
              </Field>
              <Field label="Email" htmlFor="cafeEmail">
                <input
                  id="cafeEmail"
                  type="email"
                  className={inputClass}
                  value={draft.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="hello@cornertable.cafe"
                />
              </Field>
              <Field label="Address" htmlFor="cafeAddress" hint="Keep it under 200 characters so it never wraps awkwardly on the card.">
                <input
                  id="cafeAddress"
                  className={inputClass}
                  value={draft.address}
                  onChange={(e) => update("address", e.target.value.slice(0, 200))}
                  placeholder="14 Alder Lane, Riverside"
                />
              </Field>
            </div>
          </Card>

          {/* Operating hours */}
          <Card className="p-5">
            <SectionHeader
              index="02"
              title="Operating hours"
              description="The front page only offers slots inside this window. Times are 24-hour."
              badge={
                hoursValid ? (
                  <Badge tone="pass">{formatDuration(durationMins)} open</Badge>
                ) : (
                  <Badge tone="bad">Invalid range</Badge>
                )
              }
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Opens at" htmlFor="openTime">
                <input
                  id="openTime"
                  type="time"
                  className={inputClass + " font-mono"}
                  value={draft.openTime}
                  onChange={(e) => update("openTime", e.target.value || "08:00")}
                />
              </Field>
              <Field label="Closes at" htmlFor="closeTime">
                <input
                  id="closeTime"
                  type="time"
                  className={inputClass + " font-mono"}
                  value={draft.closeTime}
                  onChange={(e) => update("closeTime", e.target.value || "16:00")}
                />
              </Field>
            </div>
            {!hoursValid ? (
              <p className="mt-3 text-xs text-[#ff7a86]">
                Closing time must be after opening time. The booking grid stays empty until this is fixed.
              </p>
            ) : null}
          </Card>

          {/* Slot & capacity */}
          <Card className="p-5">
            <SectionHeader
              index="03"
              title="Slots & capacity"
              description="How long each booking window is and how many covers fit in one."
            />
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Slot interval" hint="Common values: 30 or 60 minutes.">
                <Stepper
                  value={draft.slotMinutes}
                  onChange={(v) => update("slotMinutes", v)}
                  min={5}
                  max={180}
                  step={5}
                  suffix="min"
                />
              </Field>
              <Field label="Max covers per slot" hint="Total guests allowed in a single time slot.">
                <Stepper
                  value={draft.maxCoversPerSlot}
                  onChange={(v) => update("maxCoversPerSlot", v)}
                  min={1}
                  max={200}
                  step={1}
                  suffix="covers"
                />
              </Field>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#1d222a] bg-[#14171c] px-4 py-3">
            <p className="text-xs text-[#8a93a3]">
              {isDirty
                ? "You have unsaved changes. Saving updates the customer booking page immediately."
                : "All changes are saved and in sync with the booking page."}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={handleRevert} disabled={!isDirty}>
                Revert
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={!isDirty}>
                Save settings
              </Button>
            </div>
          </div>
        </form>

        {/* Data & diagnostics */}
        <Card className="mt-5 p-5">
          <SectionHeader
            index="04"
            title="Data & diagnostics"
            description="Inspect what is stored locally and reset the workspace. These actions write to the same key the other screens read."
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Stored reservations" value={String(reservations.length)} sub="all dates" />
            <StatTile
              label="Today's covers"
              value={String(todayCovers)}
              sub={`${todayBookedSlots} of ${slots.length || "—"} slots booked`}
            />
            <StatTile
              label="Full slots today"
              value={String(todayFullSlots)}
              sub={`at ${draft.maxCoversPerSlot} covers each`}
            />
          </div>

          <div className="mt-4 rounded-md border border-[#1d222a] bg-[#0b0d10] p-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6875]">
              Storage key
            </div>
            <code className="block break-all font-mono text-[11px] text-[#8a93a3]">{STORAGE_KEY}</code>
            <p className="mt-2 text-[11px] leading-relaxed text-[#5f6875]">
              Reservations and settings live in your browser only. Clearing browser storage removes
              every test reservation — there is no server to restore them from. Opening the same
              product in two tabs can overbook a slot, since there is no shared concurrency check.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={handleClearReservations} disabled={reservations.length === 0}>
              Clear all reservations
            </Button>
            {confirmReset ? (
              <div className="flex items-center gap-2 rounded-md border border-[#7a2f36] bg-[#1a1114] px-3 py-1.5">
                <span className="text-xs text-[#f3c9cd]">Reset settings to defaults?</span>
                <Button variant="danger" size="sm" type="button" onClick={handleReset}>
                  Yes, reset
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" type="button" onClick={() => setConfirmReset(true)}>
                Reset to defaults
              </Button>
            )}
          </div>
        </Card>

        {/* Empty state for the whole workspace */}
        {!loaded ? (
          <div className="mt-5">
            <EmptyState
              title="Loading settings…"
              message="Reading your saved configuration from local storage."
            />
          </div>
        ) : reservations.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="No reservations yet"
              message="Once customers book on the front page, their reservations appear here and in the live shift view."
              description="Your settings are ready — the booking page will use the hours and capacity you configure above."
              action={
                <Button variant="secondary" size="sm" type="button" onClick={() => window.location.assign("/")}>
                  Open booking page
                </Button>
              }
            />
          </div>
        ) : null}

        <footer className="mt-8 border-t border-[#1d222a] pt-4 text-center">
          <p className="font-mono text-[11px] text-[#5f6875]">
            CornerTable · manager console · {formatLongDate(today)}
          </p>
        </footer>
      </div>
    </div>
  );
}
