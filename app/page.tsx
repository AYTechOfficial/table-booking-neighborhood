"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { availableTimes, formatServiceDate, loadReservations, PARTY_SIZES, Reservation, saveReservations, serviceDateOptions, SERVICE_TIMES } from "@/lib/reservations";

const fieldClass = "mt-1.5 w-full rounded-xl border border-[#d9d1c2] bg-white px-3.5 py-3 text-sm text-[#26362f] outline-none transition focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20";

export default function HomePage() {
  const dates = useMemo(() => serviceDateOptions(), []);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [time, setTime] = useState("");
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Reservation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadReservations();
    setReservations(saved);
    const initialDate = dates[0] ?? "";
    setDate(initialDate);
    const reservationId = new URLSearchParams(window.location.search).get("reservation");
    if (reservationId) {
      setConfirmation(saved.find((reservation) => reservation.id === reservationId && reservation.status === "confirmed") ?? null);
    }
    setReady(true);
  }, [dates]);

  const choices = availableTimes(reservations, date, Number(partySize));

  useEffect(() => {
    if (!choices.includes(time)) setTime(choices[0] ?? "");
  }, [date, partySize, reservations, time, choices]);

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!date || !time || !guestName.trim() || !email.trim() || !phone.trim()) {
      setNotice("Please complete each field and choose an available time.");
      return;
    }
    const current = loadReservations();
    if (!availableTimes(current, date, Number(partySize)).includes(time)) {
      setReservations(current);
      setNotice("That time has just become unavailable. Please choose another available time.");
      setTime("");
      return;
    }
    const reservation: Reservation = {
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      date,
      time,
      partySize: Number(partySize),
      guestName: guestName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    const updated = [...current, reservation];
    saveReservations(updated);
    setReservations(updated);
    setConfirmation(reservation);
    window.history.replaceState(null, "", `/?reservation=${encodeURIComponent(reservation.id)}`);
  }

  return (
    <main className="min-h-screen bg-[#f7f2e8] text-[#26362f]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">Juniper Table<span className="text-[#b85c38]">.</span></Link>
        <Link href="/manage" className="rounded-full px-4 py-2 text-sm font-medium text-[#526158] transition hover:bg-[#dce7d5] focus:outline-none focus:ring-2 focus:ring-[#b85c38]">Staff reservations</Link>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-12 pt-3 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12 lg:pb-16">
        <div className="relative order-2 overflow-hidden rounded-[24px] shadow-lg shadow-[#574831]/10 lg:order-1">
          <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1800&q=85" alt="Sunlit neighborhood cafe with welcoming tables" className="h-[280px] w-full object-cover sm:h-[390px] lg:h-[560px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18241d]/55 via-transparent to-transparent" />
          <p className="absolute bottom-5 left-5 max-w-xs font-serif text-2xl text-white sm:bottom-8 sm:left-8">A little room at the table, just for you.</p>
        </div>

        <div className="order-1 lg:order-2">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#b85c38]">Good food, good company</p>
          <h1 className="max-w-xl font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.65rem]">Your neighborhood table is waiting.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#59675e]">Seasonal plates, thoughtfully poured coffee, and the kind of welcome that makes an ordinary day feel special.</p>

          <div className="mt-8 rounded-[20px] border border-[#e4dccd] bg-[#fffdf8] p-5 shadow-xl shadow-[#574831]/[0.07] sm:p-7">
            {confirmation ? (
              <div aria-live="polite">
                <div className="mb-5 inline-flex rounded-full bg-[#dce7d5] px-3 py-1 text-sm font-semibold text-[#31503a]">Reservation confirmed</div>
                <h2 className="font-serif text-3xl">We saved you a seat, {confirmation.guestName.split(" ")[0]}.</h2>
                <p className="mt-2 text-sm leading-6 text-[#59675e]">We look forward to welcoming you to Juniper Table.</p>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl bg-[#f7f2e8] p-4 text-sm">
                  <div><dt className="text-xs text-[#69756d]">Date</dt><dd className="mt-1 font-semibold">{formatServiceDate(confirmation.date)}</dd></div>
                  <div><dt className="text-xs text-[#69756d]">Time</dt><dd className="mt-1 font-semibold">{confirmation.time}</dd></div>
                  <div><dt className="text-xs text-[#69756d]">Party</dt><dd className="mt-1 font-semibold">{confirmation.partySize} {confirmation.partySize === 1 ? "guest" : "guests"}</dd></div>
                  <div><dt className="text-xs text-[#69756d]">Name</dt><dd className="mt-1 font-semibold">{confirmation.guestName}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-[#69756d]">Contact</dt><dd className="mt-1 font-semibold">{confirmation.email} · {confirmation.phone}</dd></div>
                </dl>
                <p className="mt-4 text-sm leading-6 text-[#59675e]">Plans changed? You can review your reservation and confirm a cancellation on our <Link className="font-semibold text-[#a64f30] underline underline-offset-2" href={`/cancel?token=${encodeURIComponent(confirmation.token)}`}>cancellation page</Link>.</p>
                <button type="button" onClick={() => { setConfirmation(null); window.history.replaceState(null, "", "/"); }} className="mt-5 text-sm font-semibold text-[#a64f30] underline underline-offset-4">Make another reservation</button>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="font-serif text-2xl">Book a table</h2>
                  <p className="mt-1 text-sm text-[#69756d]">Choose a date and party size to see available times.</p>
                </div>
                <form onSubmit={submitBooking} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-medium">Service date
                      <select className={fieldClass} value={date} onChange={(event) => setDate(event.target.value)} required>
                        <option value="" disabled>Select a date</option>
                        {dates.map((day) => <option key={day} value={day}>{formatServiceDate(day, { weekday: "short", month: "short", day: "numeric" })}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-medium">Party size
                      <select className={fieldClass} value={partySize} onChange={(event) => setPartySize(event.target.value)}>
                        {PARTY_SIZES.map((size) => <option key={size} value={size}>{size} {size === 1 ? "guest" : "guests"}</option>)}
                      </select>
                    </label>
                  </div>
                  <fieldset>
                    <legend className="text-sm font-medium">Available time</legend>
                    {choices.length ? <div className="mt-2 grid grid-cols-4 gap-2">
                      {choices.map((slot) => <button key={slot} type="button" onClick={() => setTime(slot)} aria-pressed={time === slot} className={`min-h-10 rounded-lg border px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#b85c38] ${time === slot ? "border-[#b85c38] bg-[#b85c38] text-white" : "border-[#d9d1c2] bg-white text-[#405047] hover:border-[#b85c38]"}`}>{slot.replace(" ", "")}</button>)}
                    </div> : <p className="mt-2 rounded-lg bg-[#f7f2e8] px-3 py-2 text-sm text-[#68756c]">No times are available for this selection. Try another date or party size.</p>}
                  </fieldset>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium">Your name<input className={fieldClass} autoComplete="name" value={guestName} onChange={(event) => setGuestName(event.target.value)} required /></label>
                    <label className="text-sm font-medium">Email<input className={fieldClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                  </div>
                  <label className="block text-sm font-medium">Phone number<input className={fieldClass} type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></label>
                  {notice && <p role="alert" className="rounded-lg bg-[#f8e8df] px-3 py-2 text-sm text-[#8e3f27]">{notice}</p>}
                  <button type="submit" disabled={!ready || !time} className="w-full rounded-xl bg-[#b85c38] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#a64f30] focus:outline-none focus:ring-2 focus:ring-[#b85c38] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">Reserve my table</button>
                  <p className="text-center text-xs leading-5 text-[#758077]">No account needed. This demo saves reservations only in this browser.</p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-[#e5ddcf] bg-[#fffdf8]">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-9 sm:grid-cols-3 sm:px-8">
          <div><h2 className="font-serif text-xl">Find us</h2><p className="mt-2 text-sm leading-6 text-[#59675e]">214 Willow Street<br />Portland, OR 97205</p></div>
          <div><h2 className="font-serif text-xl">Say hello</h2><a className="mt-2 inline-block text-sm text-[#a64f30] underline underline-offset-2" href="tel:+15035550148">(503) 555-0148</a><br /><a className="mt-1 inline-block text-sm text-[#a64f30] underline underline-offset-2" href="mailto:hello@junipertable.example">hello@junipertable.example</a></div>
          <div><h2 className="font-serif text-xl">Opening hours</h2><p className="mt-2 text-sm leading-6 text-[#59675e]">Monday–Sunday<br />5:00 pm–9:00 pm</p></div>
        </div>
        <p className="border-t border-[#eee7da] px-5 py-4 text-center text-xs text-[#7b837c]">Reservations are stored in this browser only and do not sync between devices.</p>
      </section>
    </main>
  );
}
