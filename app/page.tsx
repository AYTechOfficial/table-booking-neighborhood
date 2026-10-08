"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readLocal, writeLocal } from "@/lib/persist";

type Reservation = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: "confirmed" | "cancelled";
  cancellationCode: string;
};

const STORAGE_KEY =
  "lastmile:table-booking-neighborhood:CafeConfig (client-side localStorage)";
const TIMES = ["11:30 AM", "12:15 PM", "1:00 PM", "1:45 PM", "5:00 PM", "5:45 PM", "6:30 PM", "7:15 PM", "8:00 PM"];
const SLOT_CAPACITY = 20;
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readReservations(): Reservation[] {
  const saved = readLocal<Reservation[]>(STORAGE_KEY, []);
  return Array.isArray(saved) ? saved.filter((item) => item && typeof item.id === "string") : [];
}

function prettyDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function availableSeats(reservations: Reservation[], date: string, time: string) {
  return SLOT_CAPACITY - reservations
    .filter((booking) => booking.date === date && booking.time === time && booking.status === "confirmed")
    .reduce((sum, booking) => sum + (Number(booking.partySize) || 0), 0);
}

export default function HomePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [time, setTime] = useState("");
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState<Reservation | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const refreshReservations = useCallback(() => {
    setReservations(readReservations());
  }, []);

  useEffect(() => {
    const today = localDateString(new Date());
    setDate(today);
    setReservations(readReservations());
    const refresh = () => setReservations(readReservations());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const dateOptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 21 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      return localDateString(day);
    });
  }, []);

  const availableTimes = useMemo(
    () => TIMES.filter((slot) => availableSeats(reservations, date, slot) >= partySize),
    [reservations, date, partySize],
  );

  useEffect(() => {
    if (time && !availableTimes.includes(time)) setTime("");
  }, [availableTimes, time]);

  function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!date || !time || !guestName.trim() || !email.trim() || !phone.trim()) {
      setMessage("Please complete each field and choose an available time.");
      return;
    }
    setSaving(true);
    const latest = readReservations();
    if (availableSeats(latest, date, time) < partySize) {
      setReservations(latest);
      setTime("");
      setMessage("That time has just become unavailable. Please choose another available time.");
      setSaving(false);
      return;
    }
    const booking: Reservation = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      title: guestName.trim(),
      notes: JSON.stringify({ date, time, partySize, email: email.trim(), phone: phone.trim() }),
      createdAt: new Date().toISOString(),
      guestName: guestName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      date,
      time,
      partySize,
      status: "confirmed",
      cancellationCode: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    };
    const updated = [...latest, booking];
    writeLocal(STORAGE_KEY, updated);
    setReservations(updated);
    setConfirmed(booking);
    setSaving(false);
    setMessage("");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#faf9f7] text-[#1a1d21]">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#home" className="flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1d21] text-[#f4d6a0]" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M7 5c0-1 1-1.2 1-2.2M12 5c0-1 1-1.2 1-2.2"/></svg>
          </span>
          <span>
            <span className="block font-['Playfair_Display',serif] text-xl font-semibold tracking-tight">Juniper Table</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#77766f]">Cafe · Market Street</span>
          </span>
        </a>
        <a href="#reserve" className="rounded-full border border-[#d9d7d1] px-4 py-2 text-sm font-semibold transition hover:border-[#1a1d21] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]">Book a table</a>
      </header>

      <section id="home" className="mx-auto grid max-w-7xl items-center gap-9 px-5 pb-14 pt-5 sm:px-8 md:grid-cols-[1.02fr_.98fr] md:gap-12 md:pb-20 md:pt-10 lg:px-12">
        <div className="order-2 md:order-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e9eee6] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#47624b]"><span className="h-1.5 w-1.5 rounded-full bg-[#66886a]" /> GOOD FOOD, GOOD COMPANY</div>
          <h1 className="max-w-xl font-['Playfair_Display',serif] text-5xl font-medium leading-[1.06] tracking-[-0.04em] sm:text-6xl lg:text-[72px]">A little room<br />for <span className="italic text-[#56735a]">a lot of life.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#64645f] sm:text-lg sm:leading-8">A neighborhood cafe for slow mornings, long lunches, and one more thing for the table. Seasonal plates, thoughtful coffee, always a seat for you.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href="#reserve" className="inline-flex items-center gap-3 rounded-full bg-[#1a1d21] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#353b40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] focus-visible:ring-offset-2">Find your table <span aria-hidden="true">↗</span></a>
            <span className="text-sm text-[#77766f]">Walk-ins welcome, reservations loved.</span>
          </div>
          <div className="mt-11 flex items-center gap-4 border-t border-[#e5e2dc] pt-6 text-sm text-[#6b6b65]">
            <span className="flex -space-x-2" aria-hidden="true"><span className="h-8 w-8 rounded-full border-2 border-[#faf9f7] bg-[#e8c9a5]"/><span className="h-8 w-8 rounded-full border-2 border-[#faf9f7] bg-[#819477]"/><span className="h-8 w-8 rounded-full border-2 border-[#faf9f7] bg-[#d78f75]"/></span>
            <span><strong className="text-[#1a1d21]">Your neighborhood,</strong> since 2018</span>
          </div>
        </div>
        <div className="relative order-1 md:order-2">
          <div className="absolute -right-3 -top-3 z-10 flex h-24 w-24 rotate-6 flex-col items-center justify-center rounded-full bg-[#dce7d9] text-center text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-[#385440] shadow-sm sm:-right-5 sm:-top-4 sm:h-28 sm:w-28">Made with<br />the season<span className="mt-1 text-lg leading-none">✳</span></div>
          <div className="overflow-hidden rounded-[2rem] bg-[#ded7ca] shadow-[0_24px_70px_-32px_rgba(37,36,31,0.35)]">
            <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=85" alt="Warm, sunlit neighborhood cafe with wooden tables and leafy plants" className="h-[330px] w-full object-cover sm:h-[430px] lg:h-[520px]" />
          </div>
          <div className="absolute -bottom-5 left-4 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-[#eeece7] bg-white px-4 py-3 shadow-lg sm:bottom-7 sm:-left-8 sm:px-5 sm:py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7eee2] text-xl" aria-hidden="true">☕</span>
            <span><span className="block text-xs text-[#77766f]">TODAY’S LITTLE PLEASURE</span><span className="mt-0.5 block text-sm font-semibold">Coffee, then whatever happens.</span></span>
          </div>
        </div>
      </section>

      <section id="reserve" className="relative bg-[#e9eee6] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#55715a]">PULL UP A CHAIR</p><h2 className="mt-2 font-['Playfair_Display',serif] text-4xl tracking-tight sm:text-5xl">Make it a date.</h2></div>
            <p className="max-w-sm text-sm leading-6 text-[#62675f]">A few details and we’ll have your table ready. Planning ahead? You can book up to three weeks out.</p>
          </div>

          {confirmed && (
            <div className="mb-7 rounded-3xl border border-[#c8dac8] bg-white p-5 shadow-[0_12px_40px_-30px_rgba(26,29,33,0.4)] sm:p-7" role="status" aria-live="polite">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e6f1e5] text-xl text-[#476b4c]" aria-hidden="true">✓</span>
                  <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#56735a]">YOU’RE ON OUR LIST</p><h3 className="mt-1 font-['Playfair_Display',serif] text-2xl">See you at Juniper Table.</h3><p className="mt-2 break-words text-sm leading-6 text-[#64645f]">A table for <strong>{confirmed.partySize}</strong> on <strong>{prettyDate(confirmed.date)}</strong> at <strong>{confirmed.time}</strong>, under <strong>{confirmed.guestName}</strong>.</p><p className="mt-1 break-words text-sm text-[#64645f]">We’ll be in touch at {confirmed.phone} or {confirmed.email} if anything changes.</p></div>
                </div>
                <button type="button" onClick={() => setConfirmed(null)} className="self-start rounded-full px-3 py-2 text-sm font-semibold text-[#666] underline underline-offset-4 hover:text-[#1a1d21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]">Book another</button>
              </div>
              <div className="mt-5 flex flex-col gap-2 border-t border-[#eeeee9] pt-4 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="text-[#696b65]">Need to change plans?</span><a className="break-all font-semibold text-[#416b4a] underline underline-offset-4 hover:text-[#1a1d21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]" href={`/cancel?code=${encodeURIComponent(confirmed.cancellationCode)}`}>Cancel this reservation <span aria-hidden="true">↗</span></a></div>
            </div>
          )}

          <div className="grid gap-7 lg:grid-cols-[1fr_310px]">
            <form onSubmit={submitBooking} className="rounded-3xl bg-white p-5 shadow-[0_18px_60px_-40px_rgba(26,29,33,0.3)] sm:p-8">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Date
                  <select value={date} onChange={(event) => { setDate(event.target.value); setTime(""); }} required className="mt-2 w-full rounded-xl border border-[#deded8] bg-white px-4 py-3 text-sm font-normal text-[#1a1d21] outline-none transition focus:border-[#4f8cff] focus:ring-2 focus:ring-[#4f8cff]/25">
                    {dateOptions.map((option, index) => <option key={option} value={option}>{index === 0 ? `Today · ${prettyDate(option)}` : index === 1 ? `Tomorrow · ${prettyDate(option)}` : prettyDate(option)}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">Party size
                  <select value={partySize} onChange={(event) => { setPartySize(Number(event.target.value)); setTime(""); }} className="mt-2 w-full rounded-xl border border-[#deded8] bg-white px-4 py-3 text-sm font-normal text-[#1a1d21] outline-none transition focus:border-[#4f8cff] focus:ring-2 focus:ring-[#4f8cff]/25">
                    {PARTY_SIZES.map((size) => <option key={size} value={size}>{size} {size === 1 ? "guest" : "guests"}</option>)}
                  </select>
                </label>
                <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold">Available times <span className="font-normal text-[#7b7b74]">· your table is yours for 90 minutes</span></legend>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {TIMES.map((slot) => {
                      const seats = availableSeats(reservations, date, slot);
                      const isAvailable = seats >= partySize;
                      const selected = time === slot;
                      return <button key={slot} type="button" disabled={!isAvailable} onClick={() => { setTime(slot); setMessage(""); }} aria-pressed={selected} className={`rounded-xl border px-2 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] focus-visible:ring-offset-2 ${selected ? "border-[#1a1d21] bg-[#1a1d21] text-white" : isAvailable ? "border-[#e0e0da] bg-white text-[#1a1d21] hover:border-[#56735a] hover:bg-[#f7faf6]" : "cursor-not-allowed border-[#ecebe7] bg-[#f6f5f2] text-[#aaa9a2] line-through"}`}>
                        {slot}
                      </button>;
                    })}
                  </div>
                  {availableTimes.length === 0 && <p className="mt-3 text-sm text-[#8b5547]">There aren’t any times left for this party size. Try another date or a smaller party.</p>}
                </fieldset>
                <label className="block text-sm font-semibold">Your name
                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} autoComplete="name" maxLength={200} required placeholder="First and last name" className="mt-2 w-full rounded-xl border border-[#deded8] px-4 py-3 text-sm font-normal outline-none transition placeholder:text-[#aaa9a2] focus:border-[#4f8cff] focus:ring-2 focus:ring-[#4f8cff]/25" />
                </label>
                <label className="block text-sm font-semibold">Phone
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" maxLength={200} required placeholder="(555) 123-4567" className="mt-2 w-full rounded-xl border border-[#deded8] px-4 py-3 text-sm font-normal outline-none transition placeholder:text-[#aaa9a2] focus:border-[#4f8cff] focus:ring-2 focus:ring-[#4f8cff]/25" />
                </label>
                <label className="block text-sm font-semibold sm:col-span-2">Email
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={200} required placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[#deded8] px-4 py-3 text-sm font-normal outline-none transition placeholder:text-[#aaa9a2] focus:border-[#4f8cff] focus:ring-2 focus:ring-[#4f8cff]/25" />
                </label>
              </div>
              {message && <p className="mt-4 rounded-xl bg-[#fff1ed] px-4 py-3 text-sm leading-5 text-[#914b3b]" role="alert">{message}</p>}
              <div className="mt-6 flex flex-col gap-3 border-t border-[#eeeee9] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#77766f]">A reservation is held for 15 minutes after your selected time.</p><button type="submit" disabled={saving || !time} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1a1d21] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#353b40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#a9aaa5]">{saving ? "Saving…" : "Reserve my table"}<span aria-hidden="true">→</span></button></div>
            </form>

            <aside className="flex flex-col gap-4">
              <div className="rounded-3xl bg-[#1a1d21] p-6 text-white sm:p-7">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#b8c9b4]">COME ON IN</span>
                <h3 className="mt-3 font-['Playfair_Display',serif] text-2xl">Juniper Table</h3>
                <p className="mt-2 text-sm leading-6 text-[#d0d0cb]">1847 Market Street<br />San Francisco, CA 94103</p>
                <div className="mt-5 space-y-2 border-t border-white/15 pt-4 text-sm"><a href="tel:+14155550184" className="block text-[#e7e9e3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]">(415) 555-0184</a><a href="mailto:hello@junipertable.cafe" className="block break-all text-[#e7e9e3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]">hello@junipertable.cafe</a></div>
              </div>
              <div className="rounded-3xl border border-[#e8e5df] bg-white p-6 sm:p-7">
                <h3 className="font-['Playfair_Display',serif] text-xl">Hours at the table</h3>
                <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-[#72726c]">Monday – Friday</span><span className="text-right font-medium">11:30–2:30 · 5–9</span></div><div className="flex justify-between gap-3"><span className="text-[#72726c]">Saturday – Sunday</span><span className="text-right font-medium">9–3 · 5–9</span></div></div>
                <p className="mt-4 border-t border-[#eeece7] pt-4 text-xs leading-5 text-[#77766f]">Brunch on weekends. Dinner every day. Our kitchen takes a little pause between services.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-[#77766f] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><span>© 2025 Juniper Table · Made for the neighborhood.</span><span>Reservations are stored on this device for this demo.</span></footer>
    </main>
  );
}
