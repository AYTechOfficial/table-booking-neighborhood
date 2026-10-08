"use client";

import { useEffect, useState } from "react";
import { Button, Card, Badge, EmptyState, ListRow } from "@/components/ui";

export type RecordItem = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
};

export type ReservationStatus = "confirmed" | "seated" | "cancelled" | "no-show";

export type Reservation = {
  id: string;
  name: string;
  phone: string;
  email: string;
  partySize: number;
  date: string;
  time: string;
  status: ReservationStatus;
  walkIn: boolean;
  createdAt: string;
};

export type Settings = {
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  maxCovers: number;
};

export const RESERVATIONS_KEY = "lastmile:table-booking-neighborhood:reservations";

export const DEFAULT_SETTINGS: Settings = {
  openTime: "11:00",
  closeTime: "22:00",
  slotMinutes: 30,
  maxCovers: 24,
};

export const STATUS_META: Record<ReservationStatus, { label: string; tone: "brand" | "pass" | "warn" | "bad" | "neutral" }> = {
  confirmed: { label: "Confirmed", tone: "brand" },
  seated: { label: "Seated", tone: "pass" },
  cancelled: { label: "Cancelled", tone: "bad" },
  "no-show": { label: "No-Show", tone: "warn" },
};

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toHHMM(mins: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(mins)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function generateRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CT-${out}`;
}

export function generateId(): string {
  return `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function slotTimes(settings: Settings): string[] {
  const start = toMinutes(settings.openTime);
  const end = toMinutes(settings.closeTime);
  const step = Math.max(5, settings.slotMinutes);
  const out: string[] = [];
  for (let t = start; t <= end; t += step) {
    out.push(toHHMM(t));
  }
  return out;
}

export function coversForDate(reservations: Reservation[], date: string): number {
  return reservations
    .filter((r) => r.date === date && (r.status === "confirmed" || r.status === "seated"))
    .reduce((sum, r) => sum + r.partySize, 0);
}

export function coversForSlot(reservations: Reservation[], date: string, time: string): number {
  return reservations
    .filter((r) => r.date === date && r.time === time && (r.status === "confirmed" || r.status === "seated"))
    .reduce((sum, r) => sum + r.partySize, 0);
}

export function remainingCovers(reservations: Reservation[], settings: Settings, date: string, time: string): number {
  return Math.max(0, settings.maxCovers - coversForSlot(reservations, date, time));
}

export function isSlotAvailable(reservations: Reservation[], settings: Settings, date: string, time: string, partySize: number): boolean {
  return remainingCovers(reservations, settings, date, time) >= partySize;
}

export function StatTile({ label, value, hint, tone = "neutral" }: { label: string; value: string | number; hint?: string; tone?: "brand" | "pass" | "warn" | "bad" | "neutral" }) {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[#7c8595]">{label}</span>
      <span className="font-mono text-2xl leading-none text-[#e6e9ef]">{value}</span>
      {hint ? (
        <span className="flex items-center gap-1 text-[11px] text-[#7c8595]">
          <Badge tone={tone}>{hint}</Badge>
        </span>
      ) : null}
    </Card>
  );
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const meta = STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PartySizePicker({ value, onChange, max = 12 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-md border font-mono text-sm transition-colors ${
            value === n
              ? "border-[#4f8cff] bg-[#4f8cff]/15 text-[#4f8cff]"
              : "border-[#262b33] bg-[#14171c] text-[#9aa3b2] hover:border-[#3a4150] hover:text-[#e6e9ef]"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function TimeSlotGrid({
  settings,
  reservations,
  date,
  partySize,
  selected,
  onSelect,
}: {
  settings: Settings;
  reservations: Reservation[];
  date: string;
  partySize: number;
  selected: string | null;
  onSelect: (time: string) => void;
}) {
  const times = slotTimes(settings);
  if (times.length === 0) {
    return (
      <EmptyState
        title="No open slots"
        message="Operating hours are not set. Update them in Manager settings to enable bookings."
      />
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
      {times.map((time) => {
        const remaining = remainingCovers(reservations, settings, date, time);
        const available = remaining >= partySize;
        const isSelected = selected === time;
        return (
          <button
            key={time}
            type="button"
            disabled={!available}
            onClick={() => onSelect(time)}
            className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 font-mono text-sm transition-colors ${
              isSelected
                ? "border-[#4f8cff] bg-[#4f8cff]/15 text-[#4f8cff]"
                : available
                ? "border-[#262b33] bg-[#14171c] text-[#e6e9ef] hover:border-[#3a4150]"
                : "cursor-not-allowed border-[#1c2027] bg-[#0f1216] text-[#4a5260]"
            }`}
          >
            <span>{formatTime(time)}</span>
            <span className={`text-[10px] ${available ? "text-[#7c8595]" : "text-[#4a5260]"}`}>{available ? `${remaining} left` : "Full"}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ReservationRow({
  reservation,
  actions,
}: {
  reservation: Reservation;
  actions?: React.ReactNode;
}) {
  return (
    <ListRow
      title={reservation.name}
      subtitle={`${formatDate(reservation.date)} · ${formatTime(reservation.time)} · Party of ${reservation.partySize}${reservation.walkIn ? " · Walk-in" : ""}`}
      trailing={
        <div className="flex items-center gap-2">
          <StatusBadge status={reservation.status} />
          {actions}
        </div>
      }
    />
  );
}

export function BookingConfirmation({ reservation, onNew }: { reservation: Reservation; onNew?: () => void }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <Badge tone="pass">Booked</Badge>
        <span className="text-sm text-[#7c8595]">Reservation confirmed</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#7c8595]">Booking reference</p>
          <p className="font-mono text-2xl text-[#4f8cff]">{reservation.id}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-[#7c8595]">Party</p>
          <p className="font-mono text-2xl text-[#e6e9ef]">{reservation.partySize}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-[#262b33] pt-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#7c8595]">Date</p>
          <p className="text-[#e6e9ef]">{formatDate(reservation.date)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#7c8595]">Time</p>
          <p className="text-[#e6e9ef]">{formatTime(reservation.time)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#7c8595]">Name</p>
          <p className="truncate text-[#e6e9ef]" title={reservation.name}>{reservation.name}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#7c8595]">Phone</p>
          <p className="truncate font-mono text-[#e6e9ef]" title={reservation.phone}>{reservation.phone}</p>
        </div>
      </div>
      {onNew ? (
        <Button variant="secondary" size="sm" onClick={onNew}>
          Make another booking
        </Button>
      ) : null}
    </Card>
  );
}

export function WalkInModal({
  open,
  onClose,
  onSubmit,
  defaultTime,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, partySize: number) => void;
  defaultTime: string;
}) {
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setPartySize(2);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Guest name is required.");
      return;
    }
    onSubmit(trimmed, partySize);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <Card className="flex w-full max-w-sm flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#e6e9ef]">Add Walk-in</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="text-sm text-[#7c8595]">Seated at {formatTime(defaultTime)}.</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[#7c8595]" htmlFor="walkin-name">Guest name</label>
          <input
            id="walkin-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jordan Lee"
            className="w-full rounded-md border border-[#262b33] bg-[#0f1216] px-3 py-2 text-sm text-[#e6e9ef] outline-none focus:border-[#4f8cff]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-[#7c8595]">Party size</span>
          <PartySizePicker value={partySize} onChange={setPartySize} />
        </div>
        {error ? <p className="text-sm text-[#ff6b6b]">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Seat guest
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function SettingsForm({
  settings,
  onSave,
  onReset,
}: {
  settings: Settings;
  onSave: (next: Settings) => void;
  onReset: () => void;
}) {
  const [openTime, setOpenTime] = useState(settings.openTime);
  const [closeTime, setCloseTime] = useState(settings.closeTime);
  const [slotMinutes, setSlotMinutes] = useState(settings.slotMinutes);
  const [maxCovers, setMaxCovers] = useState(settings.maxCovers);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpenTime(settings.openTime);
    setCloseTime(settings.closeTime);
    setSlotMinutes(settings.slotMinutes);
    setMaxCovers(settings.maxCovers);
  }, [settings]);

  const handleSubmit = () => {
    const open = toMinutes(openTime);
    const close = toMinutes(closeTime);
    if (close <= open) {
      setError("Closing time must be after opening time.");
      return;
    }
    if (slotMinutes < 5 || slotMinutes > 120) {
      setError("Slot interval must be between 5 and 120 minutes.");
      return;
    }
    if (maxCovers < 1 || maxCovers > 200) {
      setError("Max covers must be between 1 and 200.");
      return;
    }
    setError(null);
    onSave({ openTime, closeTime, slotMinutes, maxCovers });
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[#7c8595]" htmlFor="set-open">Opens</label>
          <input
            id="set-open"
            type="time"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="w-full rounded-md border border-[#262b33] bg-[#0f1216] px-3 py-2 font-mono text-sm text-[#e6e9ef] outline-none focus:border-[#4f8cff]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[#7c8595]" htmlFor="set-close">Closes</label>
          <input
            id="set-close"
            type="time"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="w-full rounded-md border border-[#262b33] bg-[#0f1216] px-3 py-2 font-mono text-sm text-[#e6e9ef] outline-none focus:border-[#4f8cff]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[#7c8595]" htmlFor="set-slot">Slot interval (min)</label>
          <input
            id="set-slot"
            type="number"
            min={5}
            max={120}
            step={5}
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
            className="w-full rounded-md border border-[#262b33] bg-[#0f1216] px-3 py-2 font-mono text-sm text-[#e6e9ef] outline-none focus:border-[#4f8cff]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[#7c8595]" htmlFor="set-covers">Max covers / slot</label>
          <input
            id="set-covers"
            type="number"
            min={1}
            max={200}
            value={maxCovers}
            onChange={(e) => setMaxCovers(Number(e.target.value))}
            className="w-full rounded-md border border-[#262b33] bg-[#0f1216] px-3 py-2 font-mono text-sm text-[#e6e9ef] outline-none focus:border-[#4f8cff]"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-[#ff6b6b]">{error}</p> : null}
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset to defaults
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit}>
          Save settings
        </Button>
      </div>
    </Card>
  );
}
