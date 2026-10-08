"use client";

import { useEffect, useMemo, useState } from "react";
import { readLocal, writeLocal } from "@/lib/persist";

type Reservation = {
  id: string;
  cancellationToken: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
};

const STORAGE_KEY = "juniper-table:reservations";
const SEATS_PER_TIME = 24;
const PARTY_SIZES = [1, 2, 3, 4, 5, 6];
const TIME_SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];

function makeServiceDates() {
  const dates: string[] = [];
  const today = new Date();
  for (let offset = 0; offset < 21 && dates.length < 14; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    if (date.getDay() !== 1) {
      dates.push(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      );
    }
  }
  return dates;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function Page() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [serviceDates, setServiceDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<Reservation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const dates = makeServiceDates();
    const saved = readLocal<Reservation[]>(STORAGE_KEY, []);
    setServiceDates(dates);
    setSelectedDate(dates[0] ?? "");
    setReservations(Array.isArray(saved) ? saved : []);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeLocal(STORAGE_KEY, reservations);
  }, [reservations, ready]);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const cancellationToken = params.get("cancel");
    if (cancellationToken) {
      const current = readLocal<Reservation[]>(STORAGE_KEY, []);
      const reservation = current.find((item) => item.cancellationToken === cancellationToken);
      if (reservation && reservation.status === "confirmed") {
        const cancelled = { ...reservation, status: "cancelled" as const };
        const updated = current.map((item) => item.id === cancelled.id ? cancelled : item);
        writeLocal(STORAGE_KEY, updated);
        setReservations(updated);
        setConfirmation(cancelled);
        setMessage("Your reservation has been cancelled. We hope to welcome you another time.");
        window.history.replaceState({}, "", `/?reservation=${encodeURIComponent(cancelled.id)}`);
      } else {
        setMessage("That cancellation link is no longer active. Please contact the cafe if you need help.");
        window.history.replaceState({}, "", window.location.pathname);
      }
      return;
    }
    const reservationId = params.get("reservation");
    if (reservationId) {
      const reservation = reservations.find((item) => item.id === reservationId);
      if (reservation) setConfirmation(reservation);
    }
  }, [ready, reservations]);

  const availableTimes = useMemo(() => {
    const size = Number(partySize);
    return TIME_SLOTS.filter((time) => {
      const bookedSeats = reservations
        .filter((item) => item.date === selectedDate && item.time === time && item.status === "confirmed")
        .reduce((total, item) => total + item.partySize, 0);
      return SEATS_PER_TIME - bookedSeats >= size;
    });
  }, [partySize, reservations, selectedDate]);

  function changeDate(value: string) {
    setSelectedDate(value);
    setSelectedTime("");
    setMessage("");
  }

  function changePartySize(value: string) {
    setPartySize(value);
    setSelectedTime("");
    setMessage("");
  }

  function submitReservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const current = readLocal<Reservation[]>(STORAGE_KEY, []);
    const currentReservations = Array.isArray(current) ? current : [];
    const size = Number(partySize);

    if (!selectedDate || !serviceDates.includes(selectedDate)) {
      setMessage("Please choose an available service date.");
      return;
    }
    if (!selectedTime || !TIME_SLOTS.includes(selectedTime)) {
      setMessage("Please choose one of the available times.");
      return;
    }

    const bookedSeats = currentReservations
      .filter((item) => item.date === selectedDate && item.time === selectedTime && item.status === "confirmed")
      .reduce((total, item) => total + item.partySize, 0);
    if (SEATS_PER_TIME - bookedSeats < size) {
      setReservations(currentReservations);
      setSelectedTime("");
      setMessage("That time has just filled up. Please choose another available time.");
      return;
    }

    try {
      const reservation: Reservation = {
        id: crypto.randomUUID(),
        cancellationToken: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date: selectedDate,
        time: selectedTime,
        partySize: size,
        status: "confirmed",
        createdAt: new Date().toISOString(),
      };
      const updated = [reservation, ...currentReservations];
      writeLocal(STORAGE_KEY, updated);
      setReservations(updated);
      setConfirmation(reservation);
      setName("");
      setEmail("");
      setPhone("");
      setSelectedTime("");
      window.history.pushState({}, "", `/?reservation=${encodeURIComponent(reservation.id)}`);
    } catch {
      setMessage("We couldn’t save your reservation in this browser. Please check your details and try again.");
    }
  }

  const inputClass = "mt-2 h-12 w-full rounded-xl border border-[#d9d0c2] bg-white px-3 text-base text-[#26362f] outline-none transition placeholder:text-[#91877a] focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20";

  return (
    <main className="min-h-screen bg-[#f7f2e8] text-[#26362f]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="text-xl font-semibold tracking-tight" aria-label="Juniper Table home">
          <span className="mr-2 text-[#b85c38]">✳</span>Juniper Table
        </a>
        <a href="/manage" className="rounded-full border border-[#cfc5b6] px-4 py-2 text-sm font-medium transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#b85c38]">
          Staff view
        </a>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-8 px-5 pb-12 pt-3 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12 lg:pb-16">
        <div className="order-2 lg:order-1">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[.22em] text-[#8b684e]">A neighborhood cafe, made for lingering</p>
          <h1 className="max-w-xl text-5xl leading-[1.08] tracking-tight sm:text-6xl" style={{ fontFamily: "Georgia, serif" }}>
            A little more room for <span className="text-[#b85c38]">good company.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#5f665e]">
            Meet us at Juniper Table for carefully made coffee, something lovely from the oven, and an unhurried seat at the table.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-sm text-[#526257]">
            <span className="rounded-full bg-[#dce7d5] px-3 py-1.5">Thoughtful food &amp; coffee</span>
            <span className="rounded-full bg-[#dce7d5] px-3 py-1.5">Reservations for 1–6</span>
          </div>
        </div>
        <div className="order-1 relative min-h-[270px] overflow-hidden rounded-[24px] shadow-[0_18px_45px_rgba(62,54,40,.12)] sm:min-h-[390px] lg:order-2">
          <img
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1800&q=85"
            alt="Sunlit neighborhood cafe with wooden tables and warm pendant lights"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#26362f]/35 via-transparent to-white/5" />
          <p className="absolute bottom-5 left-5 rounded-full bg-[#fffdf8]/90 px-4 py-2 text-xs font-medium text-[#35463b]">Your neighborhood, around the table</p>
        </div>
      </section>

      <section id="booking" className="mx-auto grid max-w-7xl gap-7 px-5 pb-14 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-10">
        <div className="rounded-[20px] border border-[#e4dbcd] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(62,54,40,.06)] sm:p-8">
          {confirmation ? (
            <div className="mb-7 rounded-2xl border border-[#b9cdb0] bg-[#edf3e9] p-5 sm:p-6" role="status">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#58704f]">
                {confirmation.status === "cancelled" ? "Reservation cancelled" : "You’re on our list"}
              </p>
              <h2 className="mt-2 text-2xl" style={{ fontFamily: "Georgia, serif" }}>
                {confirmation.status === "cancelled" ? "We’ll miss you." : "We can’t wait to see you."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#536052]">
                {confirmation.status === "cancelled"
                  ? "Your Juniper Table reservation is cancelled."
                  : "Your table at Juniper Table is confirmed. A reminder of your details is below."}
              </p>
              <dl className="mt-4 grid gap-x-5 gap-y-3 border-t border-[#cbd8c4] pt-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-[#687363]">Guest</dt><dd className="mt-1 font-medium">{confirmation.name}</dd></div>
                <div><dt className="text-xs text-[#687363]">Party size</dt><dd className="mt-1 font-medium">{confirmation.partySize} {confirmation.partySize === 1 ? "guest" : "guests"}</dd></div>
                <div><dt className="text-xs text-[#687363]">Date &amp; time</dt><dd className="mt-1 font-medium">{formatDate(confirmation.date)} · {formatTime(confirmation.time)}</dd></div>
                <div><dt className="text-xs text-[#687363]">Contact</dt><dd className="mt-1 break-words font-medium">{confirmation.email}{confirmation.phone ? ` · ${confirmation.phone}` : ""}</dd></div>
              </dl>
              {confirmation.status === "confirmed" ? (
                <p className="mt-4 border-t border-[#cbd8c4] pt-3 text-xs leading-5 text-[#536052]">
                  Need to change your plans? <a className="font-semibold text-[#9b482d] underline underline-offset-2" href={`/?cancel=${encodeURIComponent(confirmation.cancellationToken)}`}>Cancel this reservation</a>. This link is specific to your booking.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#9b654c]">Make yourself at home</p>
            <h2 className="mt-2 text-3xl tracking-tight" style={{ fontFamily: "Georgia, serif" }}>Reserve a table</h2>
            <p className="mt-2 text-sm leading-6 text-[#687066]">Choose a date and party size to see times with room for your whole party.</p>
          </div>

          <form onSubmit={submitReservation} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium" htmlFor="service-date">
                Service date
                <select id="service-date" required value={selectedDate} onChange={(event) => changeDate(event.target.value)} className={inputClass}>
                  {serviceDates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium" htmlFor="party-size">
                Party size
                <select id="party-size" required value={partySize} onChange={(event) => changePartySize(event.target.value)} className={inputClass}>
                  {PARTY_SIZES.map((size) => <option key={size} value={size}>{size} {size === 1 ? "guest" : "guests"}</option>)}
                </select>
              </label>
            </div>

            <fieldset>
              <legend className="text-sm font-medium">Available times</legend>
              <p className="mt-1 text-xs text-[#74786f]">Times are offered only when there is space for your full party.</p>
              {availableTimes.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {availableTimes.map((time) => (
                    <button
                      key={time}
                      type="button"
                      aria-pressed={selectedTime === time}
                      onClick={() => { setSelectedTime(time); setMessage(""); }}
                      className={`min-h-11 rounded-xl border px-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#b85c38] focus:ring-offset-2 ${selectedTime === time ? "border-[#b85c38] bg-[#b85c38] text-white" : "border-[#d9d0c2] bg-white text-[#35463b] hover:border-[#b85c38] hover:bg-[#fbf3eb]"}`}
                    >{formatTime(time)}</button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-[#f5eee2] px-4 py-3 text-sm text-[#715d4d">There are no times left for this party on this date. Please choose another date or party size.</p>
              )}
            </fieldset>

            <div className="border-t border-[#ece4d8] pt-5">
              <p className="mb-4 text-sm font-medium">Your details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium" htmlFor="guest-name">
                  Name
                  <input id="guest-name" autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Your name" />
                </label>
                <label className="block text-sm font-medium" htmlFor="guest-phone">
                  Phone <span className="font-normal text-[#85877f]">(optional)</span>
                  <input id="guest-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} placeholder="(555) 123-4567" />
                </label>
                <label className="block text-sm font-medium sm:col-span-2" htmlFor="guest-email">
                  Email
                  <input id="guest-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" />
                </label>
              </div>
            </div>

            {message ? <p className="rounded-xl border border-[#d8b5a4] bg-[#fbf0e9] px-4 py-3 text-sm text-[#843e2b]" role="alert">{message}</p> : null}
            <button type="submit" disabled={!ready || !selectedTime || availableTimes.length === 0} className="min-h-12 w-full rounded-xl bg-[#b85c38] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9f4d30] focus:outline-none focus:ring-2 focus:ring-[#b85c38] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none">
              Confirm reservation
            </button>
            <p className="text-center text-xs leading-5 text-[#77776e]">No account needed. This demo saves reservations only in this browser.</p>
          </form>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[20px] bg-[#dce7d5] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#58704f]">Come find us</p>
            <h2 className="mt-2 text-2xl" style={{ fontFamily: "Georgia, serif" }}>A seat is waiting.</h2>
            <address className="mt-5 not-italic text-sm leading-6 text-[#3f5145]">
              184 Willow Street<br />Brooklyn, NY 11201
            </address>
            <a className="mt-4 inline-block text-sm font-semibold text-[#85442f] underline underline-offset-4" href="tel:+17185550184">(718) 555-0184</a>
            <br />
            <a className="mt-2 inline-block text-sm text-[#3f5145] underline underline-offset-4" href="mailto:hello@junipertable.example">hello@junipertable.example</a>
          </div>
          <div className="rounded-[20px] border border-[#e4dbcd] bg-[#fffdf8] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#9b654c]">Hours &amp; booking notes</p>
            <h2 className="mt-2 text-2xl" style={{ fontFamily: "Georgia, serif" }}>Drop by or stay awhile.</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-[#eee7dc] pb-3"><dt className="text-[#697067]">Tuesday–Sunday</dt><dd className="text-right font-medium">8:00 am–6:00 pm</dd></div>
              <div className="flex justify-between gap-4 border-b border-[#eee7dc] pb-3"><dt className="text-[#697067]">Monday</dt><dd className="text-right font-medium">Closed</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#697067]">Reservations</dt><dd className="text-right font-medium">1–6 guests</dd></div>
            </dl>
            <p className="mt-5 rounded-xl bg-[#f5f1e9] p-3 text-xs leading-5 text-[#687066]">We offer six seating times each open day. Availability is limited to 24 guests per time, so only times that fit your party are shown.</p>
          </div>
        </aside>
      </section>

      <footer className="border-t border-[#e5dccf] px-5 py-5 text-center text-xs text-[#77776e]">
        Juniper Table · 184 Willow Street, Brooklyn · A neighborhood cafe, one table at a time.
      </footer>
    </main>
  );
}
