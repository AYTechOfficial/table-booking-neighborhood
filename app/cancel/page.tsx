"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

type Reservation = Record<string, unknown>;

const STORAGE_KEYS = [
  "juniper-reservations",
  "juniper-table-reservations",
  "juniperReservations",
  "juniper-table-bookings",
  "reservations",
  "bookings",
];

function getString(record: Reservation, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getReservations(value: unknown): Reservation[] {
  let rows: unknown[] = [];
  if (Array.isArray(value)) {
    rows = value;
  } else if (isRecord(value) && Array.isArray(value.reservations)) {
    rows = value.reservations;
  }
  return rows.filter((item): item is Reservation => isRecord(item));
}

function displayDate(value: string): string {
  const normalized = value.slice(0, 10);
  const parts = normalized.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isCanceled(reservation: Reservation): boolean {
  const status = getString(reservation, ["status"]).toLowerCase();
  return status === "cancelled" || status === "canceled";
}

export default function CancelPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [storageKey, setStorageKey] = useState(STORAGE_KEYS[0]);
  const [lookupCode, setLookupCode] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLookupCode(params.get("token") || params.get("code") || params.get("cancellationToken") || params.get("id") || "");
    let foundKey = STORAGE_KEYS[0];
    let found: Reservation[] = [];
    for (const key of STORAGE_KEYS) {
      const rows = getReservations(readLocal<unknown>(key, []));
      if (rows.length > 0) {
        foundKey = key;
        found = rows;
        break;
      }
    }
    setStorageKey(foundKey);
    setReservations(found);
    setLoaded(true);
  }, []);

  const reservation = reservations.find((item) => {
    if (!lookupCode) return false;
    return ["cancellationToken", "cancelToken", "token", "id", "reservationId"].some((key) => getString(item, [key]) === lookupCode);
  });

  function cancelReservation() {
    if (!reservation || !lookupCode || working || isCanceled(reservation)) return;
    setWorking(true);
    setResult("");
    try {
      const current = getReservations(readLocal<unknown>(storageKey, []));
      const updated = current.map((item) => {
        const matches = ["cancellationToken", "cancelToken", "token", "id", "reservationId"].some((key) => getString(item, [key]) === lookupCode);
        return matches ? { ...item, status: "cancelled", canceledAt: new Date().toISOString() } : item;
      });
      if (!updated.some((item) => ["cancellationToken", "cancelToken", "token", "id", "reservationId"].some((key) => getString(item, [key]) === lookupCode))) {
        setResult("We couldn't update this reservation. Please return to the cafe team for help.");
        return;
      }
      writeLocal(storageKey, updated);
      setReservations(updated);
      setResult("Your reservation has been canceled.");
    } catch {
      setResult("We couldn't cancel your reservation right now. Please try again or contact the cafe.");
    } finally {
      setWorking(false);
    }
  }

  const guest = reservation ? getString(reservation, ["guestName", "name", "customerName"]) : "";
  const date = reservation ? getString(reservation, ["date", "serviceDate", "reservationDate"]) : "";
  const time = reservation ? getString(reservation, ["time", "serviceTime"]) : "";
  const party = reservation ? getString(reservation, ["partySize", "guests", "size", "covers"]) : "";
  const contact = reservation ? getString(reservation, ["email", "phone", "contact"]) : "";

  return (
    <main className="min-h-screen bg-[#F7F2E8] px-4 py-8 text-[#26362F] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-xl">
        <header className="mb-10 flex items-center justify-between gap-4">
          <a href="/" className="text-sm font-semibold tracking-wide text-[#26362F] hover:text-[#B85C38]">Juniper Table</a>
          <a href="/" className="text-sm text-[#52645A] underline underline-offset-4 hover:text-[#B85C38]">Back to booking</a>
        </header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8A654F]">Reservation help</p>
        <h1 className="font-serif text-4xl text-[#26362F] sm:text-5xl">Cancel a reservation</h1>
        <p className="mt-3 text-sm leading-6 text-[#52645A]">Use the private cancellation link from your confirmation to review and cancel your booking.</p>

        {!loaded ? (
          <Card className="mt-8 border-[#E8DED0] bg-[#FFFDF8] text-sm text-[#66756C]">Looking up your reservation…</Card>
        ) : reservation ? (
          <Card className="mt-8 border-[#E8DED0] bg-[#FFFDF8] p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-2xl">Your reservation</h2>
              <Badge tone={isCanceled(reservation) ? "bad" : "pass"}>{isCanceled(reservation) ? "Canceled" : "Confirmed"}</Badge>
            </div>
            <dl className="mt-5 divide-y divide-[#EEE5D9] text-sm">
              {guest ? <div className="flex justify-between gap-4 py-3"><dt className="text-[#66756C]">Guest</dt><dd className="text-right font-medium">{guest}</dd></div> : null}
              {date ? <div className="flex justify-between gap-4 py-3"><dt className="text-[#66756C]">Date</dt><dd className="text-right font-medium">{displayDate(date)}</dd></div> : null}
              {time ? <div className="flex justify-between gap-4 py-3"><dt className="text-[#66756C]">Time</dt><dd className="text-right font-medium">{time}</dd></div> : null}
              {party ? <div className="flex justify-between gap-4 py-3"><dt className="text-[#66756C]">Party size</dt><dd className="text-right font-medium">{party}</dd></div> : null}
              {contact ? <div className="flex justify-between gap-4 py-3"><dt className="text-[#66756C]">Contact</dt><dd className="break-all text-right font-medium">{contact}</dd></div> : null}
            </dl>
            {result ? <p role="status" className="mt-4 rounded-lg bg-[#DCE7D5] px-4 py-3 text-sm text-[#26362F]">{result}</p> : null}
            {!isCanceled(reservation) ? (
              <div className="mt-6">
                <p className="mb-4 text-sm leading-6 text-[#66756C]">Canceling will release your table. This action cannot be undone.</p>
                <Button variant="danger" onClick={cancelReservation} disabled={working} className="w-full sm:w-auto">{working ? "Canceling…" : "Cancel reservation"}</Button>
              </div>
            ) : (
              <p className="mt-5 text-sm text-[#52645A]">This reservation is already canceled. If you need another table, you can make a new booking.</p>
            )}
          </Card>
        ) : (
          <Card className="mt-8 border-[#E8DED0] bg-[#FFFDF8] p-5 shadow-sm sm:p-7">
            <h2 className="font-serif text-2xl">We couldn’t find that reservation</h2>
            <p className="mt-3 text-sm leading-6 text-[#52645A]">The cancellation link may be incomplete or the reservation may not be saved in this browser. Check that you’re using the original confirmation link, or contact Juniper Table for help.</p>
          </Card>
        )}
      </div>
    </main>
  );
}
