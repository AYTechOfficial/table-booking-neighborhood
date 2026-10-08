"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

type RecordItem = { id: string; title: string; notes: string; createdAt: string };

type ReservationDetails = {
  name: string;
  date: string;
  time: string;
  partySize: string;
  phone: string;
  email: string;
  status: string;
  cafeName: string;
};

const STORAGE_KEY = "lastmile:table-booking-neighborhood:CafeConfig (client-side localStorage)";
const ARRAY_KEYS = ["records", "reservations", "bookings", "items"];

function findRecords(value: unknown, path: string[] = []): { records: RecordItem[]; path: string[] } | null {
  if (Array.isArray(value)) {
    if (value.every((item) => item && typeof item === "object" && "id" in item)) {
      return { records: value as RecordItem[], path };
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  for (const key of ARRAY_KEYS) {
    if (Array.isArray(object[key])) {
      const found = findRecords(object[key], [...path, key]);
      if (found) return found;
    }
  }
  for (const [key, nested] of Object.entries(object)) {
    if (nested && typeof nested === "object") {
      const found = findRecords(nested, [...path, key]);
      if (found) return found;
    }
  }
  return null;
}

function updateAtPath(value: unknown, path: string[], records: RecordItem[]): unknown {
  if (path.length === 0) return records;
  if (!value || typeof value !== "object") return value;
  const [head, ...tail] = path;
  if (Array.isArray(value)) {
    const index = Number(head);
    if (!Number.isInteger(index) || index < 0 || index >= value.length) return value;
    const copy = [...value];
    copy[index] = updateAtPath(copy[index], tail, records);
    return copy;
  }
  const copy = { ...(value as Record<string, unknown>) };
  copy[head] = updateAtPath(copy[head], tail, records);
  return copy;
}

function parseNotes(notes: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(notes);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Older reservations may store human-readable notes rather than JSON.
  }
  return {};
}

function field(data: Record<string, unknown>, keys: string[], text: string): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" || typeof value === "number") {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  for (const key of keys) {
    const label = key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ");
    const match = text.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function detailsFor(record: RecordItem): ReservationDetails {
  const data = parseNotes(record.notes || "");
  const allText = `${record.title || ""}\n${record.notes || ""}`;
  return {
    name: field(data, ["guestName", "name", "customerName", "guest", "contactName"], allText) || record.title || "Guest",
    date: field(data, ["date", "serviceDate", "reservationDate", "bookingDate"], allText) || "Date not recorded",
    time: field(data, ["time", "serviceTime", "reservationTime", "bookingTime"], allText) || "Time not recorded",
    partySize: field(data, ["partySize", "guests", "guestCount", "covers", "size"], allText) || "Not recorded",
    phone: field(data, ["phone", "phoneNumber", "telephone", "contactPhone"], allText),
    email: field(data, ["email", "emailAddress", "contactEmail"], allText),
    status: field(data, ["status", "state"], allText) || "confirmed",
    cafeName: field(data, ["cafeName", "restaurantName", "venue"], allText) || "Juniper Table",
  };
}

function isCanceled(record: RecordItem): boolean {
  const data = parseNotes(record.notes || "");
  const status = String(data.status ?? data.state ?? "").toLowerCase();
  return data.canceled === true || data.cancelled === true || /cancel+ed|cancelled|canceled/.test(status) || /(?:^|\n)\s*status\s*:\s*cancel+ed/i.test(record.notes || "");
}

function matchesToken(record: RecordItem, token: string): boolean {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return false;
  if (record.id.toLowerCase() === normalized) return true;
  const data = parseNotes(record.notes || "");
  return [data.cancelToken, data.cancellationToken, data.cancelCode, data.cancellationCode, data.token]
    .some((value) => typeof value === "string" && value.trim().toLowerCase() === normalized);
}

function displayDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

export default function CancelPage() {
  const [stored, setStored] = useState<unknown>(null);
  const [recordsPath, setRecordsPath] = useState<string[] | null>(null);
  const [token, setToken] = useState("");
  const [lookupDone, setLookupDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = readLocal<unknown>(STORAGE_KEY, []);
    const located = findRecords(saved);
    setStored(saved);
    setRecordsPath(located?.path ?? null);
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("token") || params.get("code") || params.get("cancellationToken") || params.get("id") || "";
    if (incoming) {
      setToken(incoming);
      setLookupDone(true);
    }
    setLoading(false);
  }, []);

  const records = useMemo(() => {
    if (stored === null) return [];
    return findRecords(stored)?.records ?? [];
  }, [stored]);
  const reservation = useMemo(() => records.find((record) => matchesToken(record, token)), [records, token]);
  const details = reservation ? detailsFor(reservation) : null;
  const canceled = reservation ? isCanceled(reservation) : false;

  function lookUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLookupDone(true);
  }

  function cancelReservation() {
    if (!reservation || !stored || !recordsPath) {
      setMessage("We couldn’t update this reservation. Please try again or contact the cafe.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const updated = records.map((record) => {
        if (record.id !== reservation.id) return record;
        const original = parseNotes(record.notes || "");
        if (Object.keys(original).length > 0 || (record.notes || "").trim().startsWith("{")) {
          return { ...record, notes: JSON.stringify({ ...original, status: "canceled", canceled: true, canceledAt: new Date().toISOString() }) };
        }
        const notes = (record.notes || "").trim();
        return { ...record, notes: `${notes}${notes ? "\n" : ""}Status: canceled` };
      });
      const nextStored = updateAtPath(stored, recordsPath, updated);
      writeLocal(STORAGE_KEY, nextStored);
      setStored(nextStored);
      setMessage("Your reservation has been canceled. The table is now available again.");
    } catch {
      setMessage("We couldn’t save the cancellation. Your reservation is unchanged; please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] px-4 py-8 text-[#1a1d21] sm:px-6 sm:py-12">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f8cff] focus:ring-offset-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1d21] text-lg text-white" aria-hidden="true">✳</span>
            <span>
              <span className="block font-serif text-xl font-semibold tracking-tight">Juniper Table</span>
              <span className="block text-xs tracking-[0.16em] text-[#73777d]">A NEIGHBORHOOD CAFE</span>
            </span>
          </a>
          <span className="hidden text-sm text-[#73777d] sm:block">Reservation care</span>
        </header>

        <Card className="overflow-hidden rounded-[1.75rem] border border-[#ebe8e3] bg-white shadow-[0_18px_60px_-36px_rgba(26,29,33,0.28)]">
          <div className="relative overflow-hidden bg-[#1a1d21] px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-14 h-44 w-44 rounded-full border border-white/10" />
            <p className="relative mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#b8ceff]">A change of plans</p>
            <h1 className="relative font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Cancel a reservation</h1>
            <p className="relative mt-3 max-w-lg text-sm leading-6 text-white/70">Enter the cancellation code from your confirmation, or open the link we sent you.</p>
          </div>

          <div className="space-y-6 p-6 sm:p-10">
            <form onSubmit={lookUp} className="space-y-3">
              <label htmlFor="cancel-code" className="block text-sm font-semibold">Cancellation code</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="cancel-code"
                  value={token}
                  onChange={(event) => { setToken(event.target.value); setLookupDone(false); setMessage(""); }}
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl border border-[#dedbd5] bg-white px-4 py-3 text-base outline-none transition placeholder:text-[#a1a3a5] focus:border-[#4f8cff] focus:ring-4 focus:ring-[#4f8cff]/15"
                  placeholder="Paste your code"
                  aria-describedby="code-help"
                />
                <Button type="submit" variant="secondary" className="rounded-xl px-6 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8cff]/30">Find reservation</Button>
              </div>
              <p id="code-help" className="text-xs leading-5 text-[#73777d]">Your code is included in the reservation confirmation link.</p>
            </form>

            {loading ? (
              <div className="rounded-2xl border border-[#ebe8e3] p-6 text-sm text-[#73777d]" role="status">Loading your reservation…</div>
            ) : reservation && details ? (
              <section aria-label="Reservation details" className="rounded-2xl border border-[#ebe8e3] bg-[#fcfbfa] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#73777d]">{details.cafeName}</p>
                    <h2 className="mt-1 break-words font-serif text-2xl font-semibold">{details.name}</h2>
                  </div>
                  <Badge tone={canceled ? "neutral" : "pass"}>{canceled ? "Canceled" : "Confirmed"}</Badge>
                </div>
                <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[#ebe8e3] pt-5 sm:grid-cols-2">
                  <div><dt className="text-xs font-medium uppercase tracking-wider text-[#73777d]">Date</dt><dd className="mt-1 break-words text-sm font-medium">{displayDate(details.date)}</dd></div>
                  <div><dt className="text-xs font-medium uppercase tracking-wider text-[#73777d]">Time</dt><dd className="mt-1 break-words text-sm font-medium">{details.time}</dd></div>
                  <div><dt className="text-xs font-medium uppercase tracking-wider text-[#73777d]">Party size</dt><dd className="mt-1 break-words text-sm font-medium">{details.partySize}{details.partySize === "1" ? " guest" : details.partySize !== "Not recorded" ? " guests" : ""}</dd></div>
                  {(details.phone || details.email) && <div><dt className="text-xs font-medium uppercase tracking-wider text-[#73777d]">Contact</dt><dd className="mt-1 break-words text-sm font-medium">{[details.phone, details.email].filter(Boolean).join(" · ")}</dd></div>}
                </dl>
                {!canceled ? (
                  <div className="mt-6 border-t border-[#ebe8e3] pt-5">
                    <p className="mb-4 text-sm leading-6 text-[#65696f]">Cancel this reservation? This will release your table for another guest.</p>
                    <Button type="button" variant="danger" onClick={cancelReservation} disabled={saving} className="w-full rounded-xl py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8cff]/30 sm:w-auto">
                      {saving ? "Canceling…" : "Confirm cancellation"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-5 border-t border-[#ebe8e3] pt-5 text-sm leading-6 text-[#65696f]">This reservation has already been canceled.</p>
                )}
              </section>
            ) : lookupDone ? (
              <EmptyState title="We couldn’t find that reservation" message="Check the cancellation code and try again. If you need a hand, contact Juniper Table directly." className="rounded-2xl border border-[#ebe8e3] bg-[#fcfbfa]" />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dedbd5] bg-[#fcfbfa] px-5 py-6 text-sm leading-6 text-[#73777d]">
                Your reservation details will appear here once you enter its cancellation code.
              </div>
            )}

            {message && <p role="status" className={`rounded-xl px-4 py-3 text-sm leading-6 ${message.includes("couldn’t") ? "bg-[#fff1ef] text-[#9d3529]" : "bg-[#edf6ef] text-[#28613c]"}`}>{message}</p>}
            <p className="text-center text-xs leading-5 text-[#85888c]">Need help instead? <a href="/" className="font-semibold text-[#1a1d21] underline decoration-[#4f8cff] underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#4f8cff]">Contact Juniper Table</a></p>
          </div>
        </Card>
        <p className="mt-6 text-center text-xs text-[#929397]">Made for good meals and easy plans.</p>
      </div>
    </main>
  );
}
