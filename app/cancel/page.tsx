"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatServiceDate, loadReservations, Reservation, saveReservations } from "@/lib/reservations";

export default function CancelPage() {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    const found = loadReservations().find((item) => item.token === token) ?? null;
    setReservation(found);
    setLoaded(true);
  }, []);

  function confirmCancellation() {
    if (!reservation || reservation.status !== "confirmed") return;
    const latest = loadReservations();
    const current = latest.find((item) => item.token === reservation.token);
    if (!current || current.status !== "confirmed") {
      setReservation(current ?? null);
      setMessage("This reservation has already been updated.");
      return;
    }
    const updated = latest.map((item) => item.token === current.token ? { ...item, status: "cancelled" as const } : item);
    saveReservations(updated);
    setReservation(updated.find((item) => item.token === current.token) ?? null);
    setMessage("Your reservation has been cancelled.");
  }

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-5 py-8 text-[#26362f] sm:py-14">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">Juniper Table<span className="text-[#b85c38]">.</span></Link>
        <section className="mt-8 rounded-[22px] border border-[#e4dccd] bg-[#fffdf8] p-6 shadow-lg shadow-[#574831]/[0.06] sm:mt-12 sm:p-9">
          {!loaded ? <p className="text-sm text-[#68756c]">Looking up your reservation…</p> : !reservation ? <>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b85c38]">Reservation help</p>
            <h1 className="mt-3 font-serif text-3xl">We couldn’t find that reservation.</h1>
            <p className="mt-3 text-sm leading-6 text-[#59675e]">The cancellation link may be incomplete, or the reservation is not saved in this browser.</p>
          </> : <>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b85c38]">Reservation cancellation</p>
            <h1 className="mt-3 font-serif text-3xl">Review your reservation</h1>
            <p className="mt-2 text-sm leading-6 text-[#59675e]">Please check the details below before confirming your cancellation.</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl bg-[#f7f2e8] p-4 text-sm sm:p-5">
              <div><dt className="text-xs text-[#69756d]">Guest</dt><dd className="mt-1 font-semibold">{reservation.guestName}</dd></div>
              <div><dt className="text-xs text-[#69756d]">Party</dt><dd className="mt-1 font-semibold">{reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}</dd></div>
              <div><dt className="text-xs text-[#69756d]">Date</dt><dd className="mt-1 font-semibold">{formatServiceDate(reservation.date)}</dd></div>
              <div><dt className="text-xs text-[#69756d]">Time</dt><dd className="mt-1 font-semibold">{reservation.time}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-[#69756d]">Contact</dt><dd className="mt-1 font-semibold">{reservation.email} · {reservation.phone}</dd></div>
            </dl>
            {reservation.status === "cancelled" ? <p className="mt-5 rounded-lg bg-[#dce7d5] px-4 py-3 text-sm font-semibold text-[#31503a]">This reservation has already been cancelled.</p> : <button type="button" onClick={confirmCancellation} className="mt-6 w-full rounded-xl bg-[#b85c38] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#a64f30] focus:outline-none focus:ring-2 focus:ring-[#b85c38] focus:ring-offset-2">Confirm cancellation</button>}
            {message && <p role="status" className="mt-3 text-sm text-[#526158]">{message}</p>}
          </>}
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-[#a64f30] underline underline-offset-4">Return to Juniper Table</Link>
        </section>
        <p className="mt-5 text-center text-xs text-[#758077]">Reservations are stored in this browser only.</p>
      </div>
    </main>
  );
}
