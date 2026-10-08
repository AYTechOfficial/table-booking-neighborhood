"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { readLocal } from "@/lib/persist";

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

function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string): string {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ManagePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(localDate);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved: Reservation[] = [];
    for (const key of STORAGE_KEYS) {
      const rows = getReservations(readLocal<unknown>(key, []));
      for (const row of rows) {
        const id = getString(row, ["id", "reservationId", "cancellationToken", "token"]);
        const duplicate = saved.some((existing) => {
          const existingId = getString(existing, ["id", "reservationId", "cancellationToken", "token"]);
          return id && existingId === id;
        });
        if (!duplicate) saved.push(row);
      }
    }
    setReservations(saved);
    setLoaded(true);
  }, []);

  const dates = useMemo(() => {
    const values = new Set<string>([localDate()]);
    for (const reservation of reservations) {
      const date = getString(reservation, ["date", "serviceDate", "reservationDate"]);
      if (date) values.add(date.slice(0, 10));
    }
    return Array.from(values).sort();
  }, [reservations]);

  const dayReservations = useMemo(
    () => reservations.filter((reservation) => getString(reservation, ["date", "serviceDate", "reservationDate"]).slice(0, 10) === selectedDate),
    [reservations, selectedDate],
  );
  const activeCount = dayReservations.filter((reservation) => {
    const status = getString(reservation, ["status"]).toLowerCase();
    return status !== "cancelled" && status !== "canceled";
  }).length;
  const canceledCount = dayReservations.length - activeCount;

  return (
    <main className="min-h-screen bg-[#F7F2E8] px-4 py-8 text-[#26362F] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <a href="/" className="text-sm font-semibold tracking-wide text-[#26362F] hover:text-[#B85C38]">Juniper Table</a>
          <a href="/" className="text-sm text-[#52645A] underline underline-offset-4 hover:text-[#B85C38]">Guest booking</a>
        </header>

        <div className="mb-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8A654F]">Staff view</p>
          <h1 className="font-serif text-4xl text-[#26362F] sm:text-5xl">Reservations</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#52645A]">Review your guests and service at a glance. Reservation data is stored in this browser only.</p>
        </div>

        <Card className="mb-6 border-[#E8DED0] bg-[#FFFDF8] p-5 shadow-sm sm:p-6">
          <label htmlFor="service-date" className="mb-2 block text-sm font-semibold text-[#26362F]">Service date</label>
          <select
            id="service-date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="min-h-11 w-full max-w-sm rounded-lg border border-[#D9CCBA] bg-white px-3 text-sm text-[#26362F] outline-none transition focus:border-[#B85C38] focus:ring-2 focus:ring-[#B85C38]/20"
          >
            {dates.map((date) => <option key={date} value={date}>{displayDate(date)}</option>)}
          </select>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-lg bg-[#DCE7D5]/70 p-4">
              <p className="text-xs font-medium text-[#52645A]">Active reservations</p>
              <p className="mt-1 text-2xl font-semibold text-[#26362F]">{loaded ? activeCount : "—"}</p>
            </div>
            <div className="rounded-lg bg-[#F5E9DF] p-4">
              <p className="text-xs font-medium text-[#765B4A]">Canceled</p>
              <p className="mt-1 text-2xl font-semibold text-[#26362F]">{loaded ? canceledCount : "—"}</p>
            </div>
          </div>
        </Card>

        <section aria-label={`Reservations for ${displayDate(selectedDate)}`}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-2xl">{displayDate(selectedDate)}</h2>
            <p className="text-sm text-[#66756C]">{loaded ? `${dayReservations.length} ${dayReservations.length === 1 ? "reservation" : "reservations"}` : "Loading…"}</p>
          </div>
          {!loaded ? (
            <Card className="border-[#E8DED0] bg-[#FFFDF8] text-sm text-[#66756C]">Loading reservations…</Card>
          ) : dayReservations.length === 0 ? (
            <EmptyState title="No reservations for this date" description="Choose another service date to review its guest list." className="border-[#D9CCBA] bg-[#FFFDF8] text-[#26362F]" />
          ) : (
            <div className="space-y-3">
              {dayReservations.slice().sort((a, b) => getString(a, ["time", "serviceTime"]).localeCompare(getString(b, ["time", "serviceTime"]))).map((reservation, index) => {
                const guest = getString(reservation, ["guestName", "name", "customerName"]) || "Guest name not provided";
                const party = getString(reservation, ["partySize", "guests", "size", "covers"]);
                const time = getString(reservation, ["time", "serviceTime"]) || "Time not provided";
                const contact = getString(reservation, ["email", "phone", "contact"]);
                const status = getString(reservation, ["status"]).toLowerCase();
                const canceled = status === "cancelled" || status === "canceled";
                return (
                  <Card key={getString(reservation, ["id", "reservationId", "cancellationToken", "token"]) || `${guest}-${time}-${index}`} className={`border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-sm sm:p-5 ${canceled ? "opacity-75" : ""}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-[#26362F]">{guest}</h3>
                          <Badge tone={canceled ? "bad" : "pass"}>{canceled ? "Canceled" : "Confirmed"}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-[#52645A]">{time}{party ? ` · Party of ${party}` : ""}</p>
                        {contact ? <p className="mt-1 break-all text-sm text-[#66756C]">{contact}</p> : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
