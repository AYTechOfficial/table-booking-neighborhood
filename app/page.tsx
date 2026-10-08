"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Booking,
  BookingReceiptCard,
  CafeData,
  CafeHeader,
  CalendarIcon,
  ClockIcon,
  TableZone,
  UsersIcon,
  ZoneCard,
  getDefaultCafeData,
  getTodayDateString,
  loadCafeData,
  saveCafeData,
} from "@/components/widgets";

type ZoneOption = {
  zone: string;
  eligible: TableZone[];
  free: TableZone[];
};

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

function isCafeData(value: unknown): value is CafeData {
  if (typeof value !== "object" || value === null) return false;
  if (!("metadata" in value) || !("tables" in value) || !("bookings" in value)) return false;
  return (
    typeof value.metadata === "object" &&
    value.metadata !== null &&
    Array.isArray(value.tables) &&
    Array.isArray(value.bookings)
  );
}

function toDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildDates(): { value: string; top: string; day: string }[] {
  const now = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return {
      value: toDateString(d),
      top: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" }),
      day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
}

function buildSlots(): string[] {
  const out: string[] = [];
  for (let minutes = 7 * 60; minutes <= 20 * 60 + 30; minutes += 30) {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    out.push(`${h12}:${String(m).padStart(2, "0")} ${period}`);
  }
  return out;
}

const SLOTS = buildSlots();

function isTableFree(data: CafeData, tableId: string, date: string, time: string): boolean {
  return !data.bookings.some(
    (b) =>
      b.tableId === tableId &&
      b.date === date &&
      b.time === time &&
      (b.status === "confirmed" || b.status === "seated")
  );
}

function zoneOptionsFor(data: CafeData, partySize: number, date: string, time: string): ZoneOption[] {
  const zones = Array.from(new Set(data.tables.map((t) => t.zone)));
  return zones
    .map((zone) => {
      const eligible = data.tables
        .filter((t) => t.zone === zone && t.capacity >= partySize)
        .sort((a, b) => a.capacity - b.capacity);
      const free = eligible.filter((t) => isTableFree(data, t.id, date, time));
      return { zone, eligible, free };
    })
    .filter((opt) => opt.eligible.length > 0);
}

function nextConfirmationCode(bookings: Booking[]): string {
  const used = new Set(bookings.map((b) => b.confirmationCode));
  let n = 8821;
  while (used.has(`NT-${n}`)) n += 1;
  return `NT-${n}`;
}

export default function Page() {
  const [data, setData] = useState<CafeData | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Booking | null>(null);
  const dates = useMemo(() => buildDates(), []);

  useEffect(() => {
    const loaded: unknown = loadCafeData();
    const next = isCafeData(loaded) ? loaded : getDefaultCafeData();
    saveCafeData(next);
    setData(next);
  }, []);

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-[#786C66]">
        <p className="text-sm">Loading the cafe floor...</p>
      </main>
    );
  }

  const cafe = data;
  const zoneOptions = time ? zoneOptionsFor(cafe, partySize, date, time) : [];
  const activeZone =
    zoneOptions.find((z) => z.zone === zone && z.free.length > 0)?.zone ??
    zoneOptions.find((z) => z.free.length > 0)?.zone ??
    null;
  const selectedOption = zoneOptions.find((z) => z.zone === activeZone) ?? null;
  const canSubmit =
    activeZone !== null &&
    time !== null &&
    guestName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0;

  function slotHasAvailability(slot: string): boolean {
    return zoneOptionsFor(cafe, partySize, date, slot).some((z) => z.free.length > 0);
  }

  function resetForm() {
    setTime(null);
    setZone(null);
    setGuestName("");
    setEmail("");
    setPhone("");
    setSpecialRequest("");
    setError(null);
  }

  function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!time || !activeZone || !selectedOption) {
      setError("Choose a time and seating zone first.");
      return;
    }
    if (!guestName.trim()) {
      setError("Please enter a guest name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }
    const table = selectedOption.free[0];
    if (!table) {
      setError("That table was just taken. Please pick another time.");
      return;
    }
    const booking: Booking = {
      id: crypto.randomUUID(),
      confirmationCode: nextConfirmationCode(cafe.bookings),
      guestName: guestName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      partySize,
      date,
      time,
      tableId: table.id,
      zone: table.zone,
      specialRequest: specialRequest.trim(),
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    const next: CafeData = { ...cafe, bookings: [...cafe.bookings, booking] };
    saveCafeData(next);
    setData(next);
    setReceipt(booking);
  }

  function closeReceipt() {
    setReceipt(null);
    resetForm();
  }

  const noAvailabilityAtTime = time !== null && activeZone === null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 bg-[#FDFBF7] min-h-screen text-[#2C221E]">
      <CafeHeader metadata={cafe.metadata} />

      <section className="rounded-2xl border border-[#E8E2D5] bg-white/80 backdrop-blur-md p-6 shadow-sm space-y-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#786C66]">1. Party size</h2>
          <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PARTY_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setPartySize(n);
                  setTime(null);
                  setZone(null);
                }}
                className={`h-10 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32] focus:ring-offset-2 ${
                  partySize === n
                    ? "bg-[#C85A32] text-white shadow-md"
                    : "bg-[#F7F4EE] text-[#2C221E] hover:bg-[#EFE9DD]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#786C66]">
            <CalendarIcon className="w-3.5 h-3.5" />
            2. Date
          </h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {dates.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  setDate(d.value);
                  setTime(null);
                  setZone(null);
                }}
                className={`shrink-0 w-24 rounded-xl border px-3 py-2 text-center transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32] ${
                  date === d.value
                    ? "border-[#C85A32] bg-[#C85A32] text-white"
                    : "border-[#E8E2D5] bg-white text-[#2C221E] hover:border-[#C85A32]"
                }`}
              >
                <span className="block text-xs font-semibold">{d.top}</span>
                <span className="block text-[11px] opacity-80">{d.day}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#786C66]">
            <ClockIcon className="w-3.5 h-3.5" />
            3. Time
          </h2>
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SLOTS.map((slot) => {
              const available = slotHasAvailability(slot);
              const selected = time === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    setTime(slot);
                    setZone(null);
                  }}
                  className={`rounded-full px-2 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#C85A32] disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "bg-[#C85A32] text-white shadow-md"
                      : "bg-[#F7F4EE] text-[#2C221E] hover:bg-[#EFE9DD]"
                  } ${!available ? "line-through" : ""}`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#786C66]">
            <UsersIcon className="w-3.5 h-3.5" />
            4. Seating zone
          </h2>
          {time === null ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#E8E2D5] px-4 py-6 text-center text-sm text-[#786C66]">
              Choose a time to see seating zones for {partySize} {partySize === 1 ? "guest" : "guests"}.
            </p>
          ) : noAvailabilityAtTime ? (
            <div className="mt-3 rounded-xl border border-[#E6A15C]/60 bg-[#E6A15C]/10 px-4 py-4 text-sm text-[#2C221E]">
              All tables for {partySize} {partySize === 1 ? "guest" : "guests"} are booked at {time} on this date. Try another time slot or a different party size.
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {zoneOptions.map((opt) => (
                <ZoneCard
                  key={opt.zone}
                  zoneName={opt.zone}
                  capacityText={`Seats up to ${opt.eligible[opt.eligible.length - 1]?.capacity ?? partySize}`}
                  availableCount={opt.free.length}
                  isSelected={activeZone === opt.zone}
                  onClick={() => {
                    if (opt.free.length > 0) setZone(opt.zone);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {activeZone !== null && time !== null && (
          <form onSubmit={handleBook} className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#786C66]">5. Guest details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-medium text-[#786C66]">
                Guest name
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E2D5] bg-white px-3 py-2 text-sm text-[#2C221E] outline-none focus:ring-2 focus:ring-[#C85A32]"
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-[#786C66]">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E2D5] bg-white px-3 py-2 text-sm text-[#2C221E] outline-none focus:ring-2 focus:ring-[#C85A32]"
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-[#786C66]">
                Phone
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E2D5] bg-white px-3 py-2 text-sm text-[#2C221E] outline-none focus:ring-2 focus:ring-[#C85A32]"
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-[#786C66]">
                Special request
                <input
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  placeholder="e.g. High chair needed"
                  className="w-full rounded-lg border border-[#E8E2D5] bg-white px-3 py-2 text-sm text-[#2C221E] outline-none focus:ring-2 focus:ring-[#C85A32]"
                />
              </label>
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-[#C85A32] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#B04A25] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm reservation
            </button>
          </form>
        )}
      </section>

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg">
            <BookingReceiptCard booking={receipt} cafeName={cafe.metadata.name} onDone={closeReceipt} />
          </div>
        </div>
      )}
    </main>
  );
}
