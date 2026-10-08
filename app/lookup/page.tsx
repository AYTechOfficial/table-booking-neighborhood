"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

const STORAGE_KEY = "lastmile:table-booking-neighborhood:bookings";

const DISPLAY_FONT =
  '"Fraunces", "Playfair Display", Georgia, "Times New Roman", serif';
const BODY_FONT = '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif';

type RecordItem = { id: string; title: string; notes: string; createdAt: string };

type BookingStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "no-show"
  | "cancelled";

type Booking = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  requests: string;
  status: BookingStatus;
  createdAt: string;
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f7]";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[15px] text-[#1a1d21] placeholder:text-black/35 focus:border-[#4f8cff] focus:outline-none focus:ring-2 focus:ring-[#4f8cff]/30 " +
  FOCUS_RING;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function extractFromNotes(notes: string): {
  reference?: string;
  date?: string;
  time?: string;
  partySize?: number;
} {
  const reference = notes.match(/NC-[A-Z0-9]{6}/i)?.[0]?.toUpperCase();
  const date = notes.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  const time = notes.match(/\b\d{1,2}:\d{2}\b/)?.[0];
  const partyRaw = notes.match(/\b(\d{1,2})\s*(?:guests?|people|pax|seats?)\b/i)?.[1];
  return {
    reference,
    date,
    time,
    partySize: partyRaw ? Number(partyRaw) : undefined,
  };
}

function normalizeStatus(value: unknown): BookingStatus {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "pending") return "pending";
  if (raw === "seated") return "seated";
  if (raw === "no-show" || raw === "no show" || raw === "noshow") return "no-show";
  if (raw === "cancelled" || raw === "canceled") return "cancelled";
  return "confirmed";
}

function normalizeItem(item: RecordItem): Booking {
  const raw = item as unknown as Record<string, unknown>;
  const notes = typeof item.notes === "string" ? item.notes : "";

  let extra: Record<string, unknown> = {};
  if (notes.trim().startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(notes);
      if (parsed && typeof parsed === "object") {
        extra = parsed as Record<string, unknown>;
      }
    } catch {
      extra = {};
    }
  }

  const pick = (...keys: string[]): unknown => {
    for (const key of keys) {
      const value = raw[key] !== undefined ? raw[key] : extra[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return undefined;
  };

  const fromNotes = extractFromNotes(notes);

  const idPart = item.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  const reference = (
    asString(pick("reference", "ref", "code", "bookingReference")) ??
    fromNotes.reference ??
    `NC-${idPart.padStart(6, "0")}`
  ).toUpperCase();

  const name =
    asString(pick("name", "guestName", "guest", "customerName")) ??
    asString(item.title) ??
    "Guest";

  const date = asString(pick("date", "bookingDate")) ?? fromNotes.date ?? "";
  const time = asString(pick("time", "slot", "bookingTime")) ?? fromNotes.time ?? "";

  const partySize =
    asNumber(pick("partySize", "party", "guests", "size", "pax")) ??
    fromNotes.partySize ??
    2;

  const phone = asString(pick("phone", "phoneNumber", "mobile", "tel")) ?? "";

  const requests =
    asString(pick("requests", "specialRequests", "request")) ??
    (notes && !notes.trim().startsWith("{") ? notes : "");

  return {
    id: item.id,
    reference,
    name,
    phone,
    date,
    time,
    partySize,
    requests,
    status: normalizeStatus(pick("status")),
    createdAt: item.createdAt,
  };
}

function applyStatus(item: RecordItem, status: BookingStatus): RecordItem {
  const next = { ...(item as unknown as Record<string, unknown>) };
  next.status = status;
  if (typeof item.notes === "string" && item.notes.trim().startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(item.notes);
      if (parsed && typeof parsed === "object") {
        const merged = { ...(parsed as Record<string, unknown>), status };
        next.notes = JSON.stringify(merged);
      }
    } catch {
      /* keep the original notes untouched */
    }
  }
  return next as unknown as RecordItem;
}

function statusTone(
  status: BookingStatus
): "brand" | "pass" | "warn" | "bad" | "neutral" {
  switch (status) {
    case "confirmed":
      return "pass";
    case "seated":
      return "brand";
    case "pending":
      return "warn";
    case "no-show":
      return "bad";
    case "cancelled":
      return "neutral";
  }
}

function statusLabel(status: BookingStatus): string {
  switch (status) {
    case "no-show":
      return "No-show";
    case "cancelled":
      return "Cancelled";
    case "seated":
      return "Seated";
    case "pending":
      return "Pending";
    default:
      return "Confirmed";
  }
}

function formatDate(value: string): string {
  if (!value) return "Date not recorded";
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return value;
  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string): string {
  if (!value) return "Time not recorded";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${match[2]} ${suffix}`;
}

export default function LookupPage() {
  const [items, setItems] = useState<RecordItem[] | null>(null);
  const [reference, setReference] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [found, setFound] = useState<Booking | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    try {
      const stored = readLocal<RecordItem[]>(STORAGE_KEY, []);
      setItems(Array.isArray(stored) ? stored : []);
    } catch {
      setItems([]);
      setError(
        "We couldn't read the bookings saved in this browser. You can still start a new reservation."
      );
    }
  }, []);

  const handleLookup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ref = reference.trim().toUpperCase();
    const guest = guestName.trim().toLowerCase();

    setNotice(null);
    setConfirming(false);

    if (!ref || !guest) {
      setFound(null);
      setError(
        "Enter both your booking reference and the name on the booking so we can find it."
      );
      return;
    }

    const list = items ?? [];
    const match = list
      .map(normalizeItem)
      .find(
        (booking) =>
          booking.reference.toUpperCase() === ref &&
          booking.name.trim().toLowerCase() === guest
      );

    if (!match) {
      setFound(null);
      setError(
        "We couldn't find a booking with that reference and name. Check the code on your confirmation screen — it looks like NC-XXXXXX — and use the same name you booked with."
      );
      return;
    }

    setError(null);
    setFound(match);
  };

  const handleCancel = () => {
    if (!found || !items) return;
    const next = items.map((item) =>
      item.id === found.id ? applyStatus(item, "cancelled") : item
    );

    try {
      writeLocal(STORAGE_KEY, next);
    } catch {
      setConfirming(false);
      setError(
        "We couldn't save the cancellation in this browser, so your booking is unchanged. Please try again."
      );
      return;
    }

    setItems(next);
    setFound({ ...found, status: "cancelled" });
    setConfirming(false);
    setError(null);
    setNotice(
      `Booking ${found.reference} is cancelled. ${found.partySize} ${
        found.partySize === 1 ? "seat is" : "seats are"
      } back on the floor for ${formatDate(found.date)} at ${formatTime(found.time)}.`
    );
  };

  const resetSearch = () => {
    setFound(null);
    setConfirming(false);
    setError(null);
    setNotice(null);
    setReference("");
    setGuestName("");
  };

  const canCancel =
    found !== null &&
    (found.status === "pending" || found.status === "confirmed");

  const showEmptyState =
    items !== null && items.length === 0 && !found && !error;

  return (
    <div
      className="min-h-screen bg-[#faf9f7] text-[#1a1d21]"
      style={{ fontFamily: BODY_FONT }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/"
            className={
              "flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 " + FOCUS_RING
            }
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1a1d21] text-white">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z" />
                <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
                <path d="M7 5.5c0-.8.8-1 .8-1.8M10.5 5.5c0-.8.8-1 .8-1.8" />
              </svg>
            </span>
            <span
              className="truncate text-sm font-semibold tracking-tight sm:text-base"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              CornerTable
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-0.5 text-xs sm:gap-1 sm:text-sm">
            <Link
              href="/book"
              className={
                "rounded-lg px-2.5 py-1.5 font-medium text-[#1a1d21]/75 transition hover:bg-black/5 hover:text-[#1a1d21] motion-safe:transition " +
                FOCUS_RING
              }
            >
              Reserve
            </Link>
            <Link
              href="/manage"
              className={
                "rounded-lg px-2.5 py-1.5 font-medium text-[#1a1d21]/75 transition hover:bg-black/5 hover:text-[#1a1d21] motion-safe:transition " +
                FOCUS_RING
              }
            >
              Owner diary
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#4f8cff]">
          Guest lookup
        </p>
        <h1
          className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          Find your table
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#1a1d21]/70">
          Enter the reference from your confirmation screen together with the name
          you booked under. You can review the details, or cancel and release your
          seats back to the floor.
        </p>

        <div className="mt-6 h-px w-full bg-gradient-to-r from-[#4f8cff]/60 via-[#4f8cff]/15 to-transparent" />

        <Card className="mt-6 p-5 sm:p-6">
          <form onSubmit={handleLookup} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="reference"
                  className="block text-sm font-medium text-[#1a1d21]"
                >
                  Booking reference
                </label>
                <input
                  id="reference"
                  name="reference"
                  type="text"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="NC-4F8C2A"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-describedby={error ? "lookup-error" : undefined}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="guest-name"
                  className="block text-sm font-medium text-[#1a1d21]"
                >
                  Name on the booking
                </label>
                <input
                  id="guest-name"
                  name="guest-name"
                  type="text"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Amara Okafor"
                  autoComplete="name"
                  aria-describedby={error ? "lookup-error" : undefined}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button type="submit" variant="primary">
                Find my booking
              </Button>
              <p className="text-xs text-[#1a1d21]/60">
                Both fields must match your confirmation exactly.
              </p>
            </div>
          </form>

          <div aria-live="polite" className="mt-3">
            {error ? (
              <p
                id="lookup-error"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            ) : null}
          </div>
        </Card>

        {notice ? (
          <div
            aria-live="polite"
            className="mt-4 rounded-xl border border-[#4f8cff]/30 bg-[#4f8cff]/10 px-4 py-3 text-sm font-medium text-[#1a1d21]"
          >
            {notice}
          </div>
        ) : null}

        {showEmptyState ? (
          <Card className="mt-6 p-5 sm:p-6">
            <EmptyState
              title="No bookings saved in this browser yet"
              message="CornerTable keeps reservations in this browser only, so a booking made on another device won't appear here. Reserve a table and your reference will show on the confirmation screen."
            />
            <div className="mt-5 flex justify-center">
              <Link
                href="/book"
                className={
                  "inline-flex items-center justify-center rounded-xl bg-[#1a1d21] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black motion-safe:transition " +
                  FOCUS_RING
                }
              >
                Reserve a table
              </Link>
            </div>
          </Card>
        ) : null}

        {found ? (
          <Card className="mt-6 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 bg-[#faf9f7] px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#1a1d21]/55">
                  Booking reference
                </p>
                <p
                  className="mt-1 break-all text-2xl font-semibold tracking-tight text-[#1a1d21]"
                  style={{ fontFamily: DISPLAY_FONT }}
                >
                  {found.reference}
                </p>
              </div>
              <Badge tone={statusTone(found.status)}>
                {statusLabel(found.status)}
              </Badge>
            </div>

            <div className="px-5 py-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-[#1a1d21]/55">
                    Date
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[#1a1d21]">
                    {formatDate(found.date)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-[#1a1d21]/55">
                    Time
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[#1a1d21]">
                    {formatTime(found.time)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-[#1a1d21]/55">
                    Party size
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[#1a1d21]">
                    {found.partySize}{" "}
                    {found.partySize === 1 ? "guest" : "guests"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-[#1a1d21]/55">
                    Guest name
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[#1a1d21]">
                    {found.name}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-[#1a1d21]/55">
                    Phone
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[#1a1d21]">
                    {found.phone || "Not recorded"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-[#1a1d21]/55">
                    Booked on
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[#1a1d21]">
                    {found.createdAt
                      ? new Date(found.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not recorded"}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl border border-black/5 bg-[#faf9f7] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#1a1d21]/55">
                  Special requests
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#1a1d21]">
                  {found.requests || "None added."}
                </p>
              </div>

              {found.status === "cancelled" ? (
                <div className="mt-5 rounded-xl border border-black/10 bg-white px-4 py-3">
                  <p className="text-sm font-medium text-[#1a1d21]">
                    This booking is cancelled.
                  </p>
                  <p className="mt-1 text-sm text-[#1a1d21]/70">
                    Your seats have been returned to availability for that date and
                    time. You can reserve again whenever you like.
                  </p>
                </div>
              ) : null}

              {found.status === "seated" || found.status === "no-show" ? (
                <div className="mt-5 rounded-xl border border-black/10 bg-white px-4 py-3">
                  <p className="text-sm text-[#1a1d21]/70">
                    This booking is marked as {statusLabel(found.status).toLowerCase()},
                    so it can no longer be cancelled from here. Please speak to the
                    host on the door.
                  </p>
                </div>
              ) : null}

              {confirming && canCancel ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                  <p className="text-sm font-semibold text-red-800">
                    Cancel booking {found.reference}?
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-red-700">
                    This frees {found.partySize}{" "}
                    {found.partySize === 1 ? "seat" : "seats"} for{" "}
                    {formatDate(found.date)} at {formatTime(found.time)}. It cannot be
                    undone from this screen.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="danger" size="sm" onClick={handleCancel}>
                      Yes, cancel booking
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirming(false)}
                    >
                      Keep my booking
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {canCancel && !confirming ? (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setNotice(null);
                      setConfirming(true);
                    }}
                  >
                    Cancel this booking
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={resetSearch}>
                  Start a new search
                </Button>
                <Link
                  href="/book"
                  className={
                    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-[#1a1d21] underline decoration-[#4f8cff] decoration-2 underline-offset-4 transition hover:bg-black/5 motion-safe:transition " +
                    FOCUS_RING
                  }
                >
                  Reserve another table
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        <p className="mt-8 text-xs leading-relaxed text-[#1a1d21]/55">
          Bookings live in this browser only — the guest view and the owner diary
          share the same storage, so they stay in step on this device. Clearing
          browser storage erases every booking; the owner diary&apos;s CSV export is
          the only backup.
        </p>
      </main>
    </div>
  );
}
