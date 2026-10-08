"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readLocal, writeLocal } from "@/lib/persist";

type Reservation = {
  id?: string | number;
  reservationId?: string | number;
  name?: string;
  guestName?: string;
  email?: string;
  phone?: string;
  contact?: string;
  date?: string;
  serviceDate?: string;
  time?: string;
  serviceTime?: string;
  partySize?: number | string;
  guests?: number | string;
  status?: string;
  cancelled?: boolean;
  canceled?: boolean;
  cancelledAt?: string;
  canceledAt?: string;
  [key: string]: unknown;
};

const STORAGE_KEYS = [
  "juniper-table-reservations",
  "juniper-reservations",
  "reservations",
  "juniperReservations",
];

function isReservationList(value: unknown): value is Reservation[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "object" && entry !== null);
}

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function reservationDate(reservation: Reservation) {
  return typeof reservation.date === "string"
    ? reservation.date
    : typeof reservation.serviceDate === "string"
      ? reservation.serviceDate
      : "";
}

function isCanceled(reservation: Reservation) {
  const status = typeof reservation.status === "string" ? reservation.status.toLowerCase() : "";
  return reservation.cancelled === true || reservation.canceled === true || Boolean(reservation.cancelledAt || reservation.canceledAt) || status === "cancelled" || status === "canceled";
}

export default function ManagePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => localDateValue(new Date()));
  const [storageKey, setStorageKey] = useState(STORAGE_KEYS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let found: Reservation[] | null = null;
    let foundKey = STORAGE_KEYS[0];

    for (const key of STORAGE_KEYS) {
      const value = readLocal<unknown>(key, null);
      if (isReservationList(value)) {
        if (found === null || (found.length === 0 && value.length > 0)) {
          found = value;
          foundKey = key;
        }
        if (value.length > 0) break;
      }
    }

    setReservations(found ?? []);
    setStorageKey(foundKey);
    setLoading(false);
  }, []);

  const dayReservations = useMemo(
    () => reservations.filter((reservation) => reservationDate(reservation) === selectedDate),
    [reservations, selectedDate],
  );
  const activeCount = dayReservations.filter((reservation) => !isCanceled(reservation)).length;
  const canceledCount = dayReservations.length - activeCount;

  function updateReservation(target: Reservation) {
    const updated = reservations.map((reservation) => {
      const targetId = target.id ?? target.reservationId;
      const currentId = reservation.id ?? reservation.reservationId;
      return targetId !== undefined && currentId === targetId ? target : reservation;
    });
    setReservations(updated);
    writeLocal(storageKey, updated);
  }

  function toggleCanceled(reservation: Reservation) {
    const canceled = isCanceled(reservation);
    updateReservation({
      ...reservation,
      status: canceled ? "confirmed" : "cancelled",
      cancelled: !canceled,
      canceled: !canceled,
      ...(canceled ? { cancelledAt: "", canceledAt: "" } : { cancelledAt: new Date().toISOString(), canceledAt: new Date().toISOString() }),
    });
  }

  return (
    <main className="min-h-screen bg-[#F7F2E8] px-4 py-8 text-[#26362F] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-[#DED5C7] pb-6">
          <Link href="/" className="text-sm font-semibold tracking-wide text-[#26362F] transition hover:text-[#B85C38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B85C38]">
            <span className="font-serif text-2xl">Juniper Table</span>
            <span className="ml-3 hidden text-xs font-medium uppercase tracking-[0.16em] text-[#68766B] sm:inline">Staff reservations</span>
          </Link>
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-[#5D6B60] transition hover:bg-[#EAE4D8] hover:text-[#26362F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B85C38]">
            Back to the cafe
          </Link>
        </header>

        <section className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A563B]">A warm welcome starts here</p>
            <h1 className="font-serif text-4xl leading-tight text-[#26362F] sm:text-5xl">Reservations</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#68766B]">Review the day’s bookings and keep the team up to date.</p>
          </div>
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#39483E]">
            Service date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-11 rounded-xl border border-[#D8CEBE] bg-[#FFFDF8] px-3 text-[#26362F] shadow-sm outline-none transition focus:border-[#B85C38] focus:ring-2 focus:ring-[#B85C38]/20"
            />
          </label>
        </section>

        <section aria-label="Reservation totals" className="mb-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E5DCCF] bg-[#FFFDF8] p-5 shadow-[0_5px_20px_rgba(68,54,37,0.04)]">
            <p className="text-sm font-medium text-[#68766B]">Bookings for this date</p>
            <p className="mt-2 text-3xl font-semibold text-[#26362F]">{loading ? <span className="text-[#A69B8B]">—</span> : dayReservations.length}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E1D1] bg-[#F0F4EC] p-5">
            <p className="text-sm font-medium text-[#52694F]">Confirmed</p>
            <p className="mt-2 text-3xl font-semibold text-[#344B36]">{loading ? <span className="text-[#A69B8B]">—</span> : activeCount}</p>
          </div>
          <div className="rounded-2xl border border-[#E5DCCF] bg-[#FFFDF8] p-5">
            <p className="text-sm font-medium text-[#68766B]">Canceled</p>
            <p className="mt-2 text-3xl font-semibold text-[#77594A]">{loading ? <span className="text-[#A69B8B]">—</span> : canceledCount}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E5DCCF] bg-[#FFFDF8] p-4 shadow-[0_8px_28px_rgba(68,54,37,0.05)] sm:p-6">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EEE7DC] pb-4">
            <h2 className="font-serif text-2xl text-[#26362F]">{loading ? "Reservations" : formatDate(selectedDate)}</h2>
            {!loading && <p className="text-sm text-[#778176]">{dayReservations.length} {dayReservations.length === 1 ? "reservation" : "reservations"}</p>}
          </div>

          {loading ? (
            <div role="status" className="rounded-xl border border-[#E8E0D4] bg-[#FAF7F0] px-5 py-8 text-center text-sm text-[#68766B]">
              Loading reservations…
            </div>
          ) : dayReservations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8CEBE] bg-[#FAF7F0] px-5 py-10 text-center">
              <p className="font-serif text-xl text-[#39483E]">No reservations yet</p>
              <p className="mt-2 text-sm text-[#778176]">Bookings for {formatDate(selectedDate)} will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {dayReservations.map((reservation, index) => {
                const canceled = isCanceled(reservation);
                const guest = reservation.guestName ?? reservation.name ?? "Guest";
                const serviceTime = reservation.serviceTime ?? reservation.time ?? "Time not set";
                const partySize = reservation.partySize ?? reservation.guests ?? "—";
                const contact = reservation.email ?? reservation.phone ?? reservation.contact;
                const identity = reservation.id ?? reservation.reservationId ?? `${guest}-${serviceTime}-${index}`;
                return (
                  <li key={String(identity)} className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${canceled ? "border-[#E8DCD0] bg-[#F7F3ED]" : "border-[#E5DCCF] bg-white"}`}>
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="min-w-[78px] rounded-lg bg-[#F3E8DB] px-3 py-2 text-center text-sm font-semibold text-[#8C4B32]">{serviceTime}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`font-semibold ${canceled ? "text-[#756E64]" : "text-[#26362F]"}`}>{guest}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${canceled ? "bg-[#EEE7DC] text-[#756E64]" : "bg-[#E6EFE2] text-[#3E6841]"}`}>
                            {canceled ? "Canceled" : "Confirmed"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#68766B]">{partySize} {String(partySize) === "1" ? "guest" : "guests"}{contact ? ` · ${contact}` : ""}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCanceled(reservation)}
                      className={`min-h-10 shrink-0 rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B85C38] ${canceled ? "border-[#C9D7C3] bg-[#F0F4EC] text-[#3E6841] hover:bg-[#E5EEDF]" : "border-[#E0C1B2] bg-[#FBF0E9] text-[#9A4E32] hover:bg-[#F5E5DA]"}`}
                    >
                      {canceled ? "Restore booking" : "Cancel booking"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-[#827B70]">Reservations are saved in this browser only and are not synced between devices.</p>
      </div>
    </main>
  );
}
