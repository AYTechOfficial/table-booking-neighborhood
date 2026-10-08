"use client";

import { useState, useMemo } from "react";
import { Button, Card, Badge } from "@/components/ui";
import { CoffeeRing } from "@/components/coffee-ring";
import { readLocal, writeLocal } from "@/lib/persist";
import { useRouter } from "next/navigation";

const MAX_PARTY = 8;
const WINDOW_DAYS = 14;
const OPEN = 8;
const CLOSE = 17;
const INTERVAL = 30;
const CAPACITY = 12;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function slotLabel(h: number, m: number) {
  const ampm = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${ampm}`;
}
function makeRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "CT-" + s;
}

type Booking = {
  ref: string;
  name: string;
  phone: string;
  party: number;
  date: string;
  time: string;
  notes: string;
  status: string;
  createdAt: string;
};

export default function Book() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [party, setParty] = useState(2);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const dates = useMemo(() => {
    const out: { key: string; label: string; day: string; month: string; disabled: boolean }[] = [];
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      out.push({
        key,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        day: d.getDate().toString(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        disabled: false,
      });
    }
    return out;
  }, []);

  const slots = useMemo(() => {
    const out: { key: string; label: string; left: number }[] = [];
    for (let h = OPEN; h < CLOSE; h++) {
      for (let m = 0; m < 60; m += INTERVAL) {
        const key = `${pad(h)}:${pad(m)}`;
        const left = Math.max(0, CAPACITY - ((h * 7 + m) % 9));
        out.push({ key, label: slotLabel(h, m), left });
      }
    }
    return out;
  }, []);

  const canNext =
    step === 1 ? party > 0 : step === 2 ? date != null : step === 3 ? time != null : name.trim().length > 0;

  function submit() {
    const booking: Booking = {
      ref: makeRef(),
      name: name.trim(),
      phone: phone.trim(),
      party,
      date: date!,
      time: time!,
      notes: notes.trim(),
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    const all = readLocal<Booking[]>("ct_bookings", []);
    writeLocal("ct_bookings", [...all, booking]);
    setConfirmed(booking);
  }

  if (confirmed) {
    return (
      <main className="min-h-screen bg-[#FAF5EE] px-6 py-16 text-[#2E2118]">
        <div className="mx-auto max-w-md">
          <Card className="text-center shadow-[0_1px_2px_rgba(46,33,24,.06),0_8px_24px_rgba(46,33,24,.06)]">
            <div className="mb-4 flex justify-center">
              <Steam />
            </div>
            <h1 className="font-[Fraunces] text-3xl">You&apos;re booked</h1>
            <p className="mt-2 text-sm text-[#6B5D4F]">
              {confirmed.name}, table for {confirmed.party} on {confirmed.date} at {confirmed.time}.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 rounded-xl bg-[#E7EDE3] px-4 py-4">
              <CoffeeRing className="h-8 w-8 opacity-60" />
              <span className="font-[Fraunces] text-2xl tracking-wider text-[#3C5538]">
                {confirmed.ref}
              </span>
            </div>
            <p className="mt-3 text-xs text-[#6B5D4F]">Keep this code to find or change your booking.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => router.push("/lookup")}>
                Find my booking
              </Button>
              <Button onClick={() => router.push("/")}>Back home</Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  const steps = ["Party", "Date", "Time", "Details"];

  return (
    <main className="min-h-screen bg-[#FAF5EE] px-6 py-12 text-[#2E2118]">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-[Fraunces] text-4xl">Reserve a table</h1>
        <div className="mt-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={
                  "h-1.5 w-full rounded-full transition-colors " +
                  (i + 1 <= step ? "bg-[#A8431F]" : "bg-[#E8DFD2]")
                }
              />
              <span
                className={
                  "text-[11px] font-medium " + (i + 1 <= step ? "text-[#A8431F]" : "text-[#6B5D4F]")
                }
              >
                {s}
              </span>
            </div>
          ))}
        </div>

        <Card className="mt-8 shadow-[0_1px_2px_rgba(46,33,24,.06),0_8px_24px_rgba(46,33,24,.06)]">
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold">How many in your party?</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: MAX_PARTY }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setParty(n)}
                    className={
                      "h-11 w-11 rounded-full border text-sm font-medium transition-all " +
                      (party === n
                        ? "border-[#A8431F] bg-[#A8431F] text-white"
                        : "border-[#E8DFD2] bg-white text-[#2E2118] hover:border-[#A8431F]/50")
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold">Pick a day</h2>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {dates.map((d) => (
                  <button
                    key={d.key}
                    disabled={d.disabled}
                    onClick={() => setDate(d.key)}
                    className={
                      "flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 transition-all " +
                      (date === d.key
                        ? "border-[#A8431F] bg-[#A8431F] text-white"
                        : "border-[#E8DFD2] bg-white text-[#2E2118] hover:border-[#A8431F]/50")
                    }
                  >
                    <span className="text-[11px] uppercase opacity-70">{d.label}</span>
                    <span className="font-[Fraunces] text-xl">{d.day}</span>
                    <span className="text-[11px] opacity-70">{d.month}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold">Choose a time</h2>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => {
                  const full = s.left <= 0;
                  return (
                    <button
                      key={s.key}
                      disabled={full}
                      aria-disabled={full}
                      onClick={() => setTime(s.key)}
                      className={
                        "flex flex-col items-center rounded-lg border px-2 py-2 transition-all " +
                        (full
                          ? "cursor-not-allowed border-[#E8DFD2] bg-[#FAF5EE] opacity-50"
                          : time === s.key
                          ? "border-[#A8431F] bg-[#A8431F] text-white"
                          : "border-[#E8DFD2] bg-white text-[#2E2118] hover:border-[#A8431F]/50")
                      }
                    >
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className={"text-[11px] " + (full ? "text-[#6B5D4F]" : time === s.key ? "text-white/80" : "text-[#3C5538]")}>
                        {full ? "Full" : `${s.left} left`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Your details</h2>
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#E8DFD2] bg-white px-3 py-2 text-sm outline-none focus:border-[#A8431F] focus:ring-2 focus:ring-[#A8431F]/30"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone (optional)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-[#E8DFD2] bg-white px-3 py-2 text-sm outline-none focus:border-[#A8431F] focus:ring-2 focus:ring-[#A8431F]/30"
                  placeholder="For a quick call if plans change"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Special request (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-[10px] border border-[#E8DFD2] bg-white px-3 py-2 text-sm outline-none focus:border-[#A8431F] focus:ring-2 focus:ring-[#A8431F]/30"
                  placeholder="Window seat, birthday, allergies…"
                />
              </div>
              <div className="rounded-lg bg-[#E7EDE3] px-3 py-2 text-sm text-[#3C5538]">
                Party of {party} · {date} · {time}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Continue
              </Button>
            ) : (
              <Button disabled={!canNext} onClick={submit}>
                Confirm booking
              </Button>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

function Steam() {
  return (
    <div className="relative h-16 w-16" aria-hidden="true">
      <svg viewBox="0 0 64 64" className="h-16 w-16">
        <path d="M18 40h28v6a10 10 0 0 1-10 10H28a10 10 0 0 1-10-10z" fill="#A8431F" opacity="0.9" />
        <path d="M46 42h6a6 6 0 0 1 0 12h-6" fill="none" stroke="#A8431F" strokeWidth="3" />
      </svg>
      <span className="steam steam-1" />
      <span className="steam steam-2" />
      <span className="steam steam-3" />
    </div>
  );
}
