"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { availableTimes, formatServiceDate, loadReservations, localDateString, PARTY_SIZES, Reservation, saveReservations, serviceDateOptions, SERVICE_TIMES } from "@/lib/reservations";

const inputClass = "mt-1 w-full rounded-lg border border-[#d9d1c2] bg-white px-3 py-2.5 text-sm text-[#26362f] outline-none focus:border-[#b85c38] focus:ring-2 focus:ring-[#b85c38]/20";

type EditValues = Pick<Reservation, "guestName" | "email" | "phone" | "date" | "time" | "partySize">;

export default function ManagePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [createValues, setCreateValues] = useState<EditValues>({ guestName: "", email: "", phone: "", date: "", time: SERVICE_TIMES[0], partySize: 2 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadReservations();
    const today = localDateString(new Date());
    setReservations(saved);
    setSelectedDate(saved.some((item) => item.date === today) ? today : saved[0]?.date ?? today);
    setCreateValues((value) => ({ ...value, date: today }));
    setReady(true);
  }, []);

  const dateOptions = useMemo(() => {
    const values = new Set([...serviceDateOptions(30), ...reservations.map((item) => item.date)]);
    return Array.from(values).sort();
  }, [reservations]);
  const dayReservations = reservations.filter((item) => item.date === selectedDate).sort((a, b) => SERVICE_TIMES.indexOf(a.time) - SERVICE_TIMES.indexOf(b.time));
  const activeCount = dayReservations.filter((item) => item.status === "confirmed").length;
  const guestCount = dayReservations.filter((item) => item.status === "confirmed").reduce((total, item) => total + item.partySize, 0);

  function commit(next: Reservation[]) {
    saveReservations(next);
    setReservations(next);
    setNotice("Changes saved in this browser.");
  }

  function startEdit(reservation: Reservation) {
    setEditingId(reservation.id);
    setEditValues({ guestName: reservation.guestName, email: reservation.email, phone: reservation.phone, date: reservation.date, time: reservation.time, partySize: reservation.partySize });
    setNotice("");
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editValues || !editingId) return;
    const latest = loadReservations();
    if (!availableTimes(latest, editValues.date, editValues.partySize, editingId).includes(editValues.time)) {
      setNotice("That service time no longer has enough capacity. Choose another time.");
      return;
    }
    const updated = latest.map((item) => item.id === editingId ? { ...item, ...editValues } : item);
    commit(updated);
    setEditingId("");
    setEditValues(null);
  }

  function createReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const latest = loadReservations();
    if (!availableTimes(latest, createValues.date, createValues.partySize).includes(createValues.time)) {
      setNotice("That service time is full. Choose another time.");
      return;
    }
    const reservation: Reservation = { ...createValues, id: crypto.randomUUID(), token: crypto.randomUUID(), status: "confirmed", createdAt: new Date().toISOString() };
    commit([...latest, reservation]);
    setSelectedDate(reservation.date);
    setShowCreate(false);
    setCreateValues({ guestName: "", email: "", phone: "", date: localDateString(new Date()), time: SERVICE_TIMES[0], partySize: 2 });
  }

  function changeStatus(reservation: Reservation, status: Reservation["status"]) {
    const latest = loadReservations();
    commit(latest.map((item) => item.id === reservation.id ? { ...item, status } : item));
  }

  function formFields(values: EditValues, update: (next: EditValues) => void, idPrefix: string) {
    const times = availableTimes(reservations, values.date, values.partySize, editingId || undefined);
    return <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-[#526158]">Guest name<input className={inputClass} value={values.guestName} onChange={(event) => update({ ...values, guestName: event.target.value })} required /></label>
      <label className="text-xs font-semibold text-[#526158]">Party size<select className={inputClass} value={values.partySize} onChange={(event) => update({ ...values, partySize: Number(event.target.value) })}>{PARTY_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      <label className="text-xs font-semibold text-[#526158]">Email<input className={inputClass} type="email" value={values.email} onChange={(event) => update({ ...values, email: event.target.value })} required /></label>
      <label className="text-xs font-semibold text-[#526158]">Phone<input className={inputClass} type="tel" value={values.phone} onChange={(event) => update({ ...values, phone: event.target.value })} required /></label>
      <label className="text-xs font-semibold text-[#526158]">Service date<input className={inputClass} type="date" value={values.date} onChange={(event) => update({ ...values, date: event.target.value })} required /></label>
      <label className="text-xs font-semibold text-[#526158]">Service time<select className={inputClass} value={values.time} onChange={(event) => update({ ...values, time: event.target.value })} required>
        {SERVICE_TIMES.map((slot) => <option key={`${idPrefix}-${slot}`} value={slot} disabled={!times.includes(slot) && slot !== values.time}>{slot}{!times.includes(slot) && slot !== values.time ? " — full" : ""}</option>)}
      </select></label>
    </div>;
  }

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-5 py-7 text-[#26362f] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><Link href="/" className="font-serif text-2xl font-semibold tracking-tight">Juniper Table<span className="text-[#b85c38]">.</span></Link><p className="mt-1 text-sm text-[#69756d]">Staff reservation desk</p></div>
          <Link href="/" className="rounded-lg border border-[#d9d1c2] bg-[#fffdf8] px-4 py-2.5 text-sm font-semibold transition hover:border-[#b85c38]">Guest booking page</Link>
        </header>

        <section className="mt-8 flex flex-col gap-5 rounded-[20px] border border-[#e4dccd] bg-[#fffdf8] p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b85c38]">Reservations</p><h1 className="mt-2 font-serif text-3xl">Service overview</h1><p className="mt-1 text-sm text-[#69756d]">Review and manage bookings saved in this browser.</p></div>
          <label className="w-full text-sm font-semibold sm:max-w-xs">Service date<select className={inputClass} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
            {dateOptions.map((day) => <option key={day} value={day}>{formatServiceDate(day, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</option>)}
          </select></label>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e4dccd] bg-[#fffdf8] p-5"><p className="text-sm text-[#69756d]">Active reservations</p><p className="mt-1 font-serif text-3xl">{ready ? activeCount : "—"}</p></div>
          <div className="rounded-2xl border border-[#e4dccd] bg-[#fffdf8] p-5"><p className="text-sm text-[#69756d]">Guests expected</p><p className="mt-1 font-serif text-3xl">{ready ? guestCount : "—"}</p></div>
          <div className="flex items-center justify-between rounded-2xl border border-[#e4dccd] bg-[#fffdf8] p-5"><div><p className="text-sm text-[#69756d]">Selected service</p><p className="mt-1 font-serif text-xl">{selectedDate ? formatServiceDate(selectedDate, { month: "short", day: "numeric" }) : "—"}</p></div><button type="button" onClick={() => { setShowCreate((value) => !value); setNotice(""); }} className="rounded-lg bg-[#b85c38] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#a64f30] focus:outline-none focus:ring-2 focus:ring-[#b85c38] focus:ring-offset-2">{showCreate ? "Close" : "Add booking"}</button></div>
        </section>

        {notice && <p role="status" className="mt-4 rounded-lg bg-[#dce7d5] px-4 py-3 text-sm text-[#31503a]">{notice}</p>}

        {showCreate && <form onSubmit={createReservation} className="mt-5 rounded-2xl border border-[#e4dccd] bg-[#fffdf8] p-5 sm:p-6">
          <h2 className="mb-4 font-serif text-2xl">Create reservation</h2>
          {formFields(createValues, setCreateValues, "create")}
          <div className="mt-4 flex gap-2"><button className="rounded-lg bg-[#b85c38] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#a64f30]" type="submit">Save reservation</button><button className="rounded-lg border border-[#d9d1c2] px-4 py-2.5 text-sm font-semibold" type="button" onClick={() => setShowCreate(false)}>Cancel</button></div>
        </form>}

        <section className="mt-6 overflow-hidden rounded-[20px] border border-[#e4dccd] bg-[#fffdf8]">
          <div className="border-b border-[#eee7da] px-5 py-4 sm:px-6"><h2 className="font-serif text-2xl">{selectedDate ? formatServiceDate(selectedDate) : "Service reservations"}</h2><p className="mt-1 text-sm text-[#69756d]">{dayReservations.length} {dayReservations.length === 1 ? "booking" : "bookings"} · cancelled bookings remain visible below</p></div>
          {!ready ? <p className="px-6 py-10 text-sm text-[#69756d]">Loading reservations…</p> : dayReservations.length === 0 ? <div className="px-6 py-12 text-center"><p className="font-serif text-xl">No reservations for this service.</p><p className="mt-2 text-sm text-[#69756d]">Add a booking or choose another date.</p></div> : <div className="divide-y divide-[#eee7da]">
            {dayReservations.map((reservation) => editingId === reservation.id && editValues ? <form key={reservation.id} onSubmit={saveEdit} className="space-y-4 bg-[#f8f5ee] p-5 sm:p-6">
              <h3 className="font-serif text-xl">Edit reservation</h3>{formFields(editValues, setEditValues, reservation.id)}
              <div className="flex gap-2"><button type="submit" className="rounded-lg bg-[#b85c38] px-4 py-2 text-sm font-bold text-white">Save changes</button><button type="button" onClick={() => { setEditingId(""); setEditValues(null); }} className="rounded-lg border border-[#d9d1c2] px-4 py-2 text-sm font-semibold">Discard</button></div>
            </form> : <article key={reservation.id} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${reservation.status === "cancelled" ? "bg-[#f5f2eb] opacity-75" : ""}`}>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{reservation.guestName}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${reservation.status === "confirmed" ? "bg-[#dce7d5] text-[#31503a]" : "bg-[#eee5dd] text-[#795846]"}`}>{reservation.status === "confirmed" ? "Confirmed" : "Cancelled"}</span></div><p className="mt-1 text-sm text-[#526158]">{reservation.time} · {reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}</p><p className="mt-1 break-all text-xs text-[#69756d]">{reservation.email} · {reservation.phone}</p></div>
              <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => startEdit(reservation)} className="rounded-lg border border-[#d9d1c2] px-3 py-2 text-xs font-semibold hover:border-[#b85c38]">Edit</button>{reservation.status === "confirmed" ? <button type="button" onClick={() => changeStatus(reservation, "cancelled")} className="rounded-lg border border-[#c99884] px-3 py-2 text-xs font-semibold text-[#91452d] hover:bg-[#f8e8df]">Cancel booking</button> : <button type="button" onClick={() => changeStatus(reservation, "confirmed")} className="rounded-lg border border-[#9daf98] px-3 py-2 text-xs font-semibold text-[#31503a] hover:bg-[#dce7d5]">Restore booking</button>}</div>
            </article>)}
          </div>}
        </section>
        <p className="mt-5 text-center text-xs text-[#758077]">Staff changes are stored locally in this browser and are not shared across devices.</p>
      </div>
    </main>
  );
}
