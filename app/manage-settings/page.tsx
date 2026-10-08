"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Badge, EmptyState, ListRow } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

type RecordItem = { id: string; title: string; notes: string; createdAt: string };

const BOOKINGS_KEY = "lastmile:table-booking-neighborhood:bookings";
const SETTINGS_KEY = "lastmile:table-booking-neighborhood:settings";

const DEFAULT_SETTINGS = {
  openingTime: "11:00",
  closingTime: "22:00",
  slotInterval: 30,
  seatCapacity: 40,
  maxPartySize: 8,
  blockedDates: [] as string[],
};

type Settings = typeof DEFAULT_SETTINGS;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function next14Days(): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function ManageSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedInput, setBlockedInput] = useState("");
  const [bookings, setBookings] = useState<RecordItem[]>([]);

  useEffect(() => {
    const stored = readLocal<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS, ...stored, blockedDates: stored.blockedDates ?? [] });
    setBookings(readLocal<RecordItem[]>(BOOKINGS_KEY, []));
    setLoaded(true);
  }, []);

  const upcomingDates = useMemo(() => next14Days(), []);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings) {
      const date = b.notes.match(/date:(\d{4}-\d{2}-\d{2})/)?.[1];
      if (date) map[date] = (map[date] ?? 0) + 1;
    }
    return map;
  }, [bookings]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function handleSave() {
    const open = timeToMinutes(settings.openingTime);
    const close = timeToMinutes(settings.closingTime);
    if (close <= open) {
      setError("Closing time must be after opening time. Settings were not saved.");
      setSaved(false);
      return;
    }
    if (settings.slotInterval < 5 || settings.slotInterval > 120) {
      setError("Slot interval must be between 5 and 120 minutes.");
      setSaved(false);
      return;
    }
    if (settings.seatCapacity < 1) {
      setError("Seat capacity must be at least 1.");
      setSaved(false);
      return;
    }
    if (settings.maxPartySize < 1 || settings.maxPartySize > settings.seatCapacity) {
      setError("Max party size must be between 1 and the total seat capacity.");
      setSaved(false);
      return;
    }
    writeLocal(SETTINGS_KEY, settings);
    setError(null);
    setSaved(true);
  }

  function addBlockedDate() {
    if (!blockedInput) return;
    if (settings.blockedDates.includes(blockedInput)) {
      setBlockedInput("");
      return;
    }
    update("blockedDates", [...settings.blockedDates, blockedInput].sort());
    setBlockedInput("");
  }

  function removeBlockedDate(date: string) {
    update(
      "blockedDates",
      settings.blockedDates.filter((d) => d !== date)
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-neutral-500">Loading settings…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#4f8cff]">
              CornerTable
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1a1d21]">
              Service settings
            </h1>
            <p className="mt-2 max-w-xl text-sm text-neutral-600">
              Configure the hours, pacing, and capacity that guests see on the booking screen.
            </p>
          </div>
          <Link
            href="/manage"
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-[#1a1d21] transition hover:border-[#4f8cff] hover:text-[#4f8cff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] focus-visible:ring-offset-2"
          >
            Back to diary
          </Link>
        </div>

        {saved && (
          <div
            role="status"
            className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <Badge tone="pass">Saved</Badge>
            <span>Settings saved. The booking screen now uses these values.</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <Badge tone="bad">Error</Badge>
            <span>{error}</span>
          </div>
        )}

        <Card className="mb-6 p-6">
          <h2 className="font-serif text-xl font-semibold text-[#1a1d21]">Service hours</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Guests can only book slots that fall inside these hours.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#1a1d21]">Opening time</span>
              <input
                type="time"
                value={settings.openingTime}
                onChange={(e) => update("openingTime", e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:border-[#4f8cff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#1a1d21]">Closing time</span>
              <input
                type="time"
                value={settings.closingTime}
                onChange={(e) => update("closingTime", e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:border-[#4f8cff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]"
              />
            </label>
          </div>
        </Card>

        <Card className="mb-6 p-6">
          <h2 className="font-serif text-xl font-semibold text-[#1a1d21]">Pacing &amp; capacity</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Slot interval controls how finely the booking screen divides the day.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#1a1d21]">Slot interval</span>
              <select
                value={settings.slotInterval}
                onChange={(e) => update("slotInterval", Number(e.target.value))}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:border-[#4f8cff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#1a1d21]">Total seats</span>
              <input
                type="number"
                min={1}
                value={settings.seatCapacity}
                onChange={(e) => update("seatCapacity", Number(e.target.value))}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:border-[#4f8cff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#1a1d21]">Max party size</span>
              <input
                type="number"
                min={1}
                max={settings.seatCapacity}
                value={settings.maxPartySize}
                onChange={(e) => update("maxPartySize", Number(e.target.value))}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:border-[#4f8cff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]"
              />
            </label>
          </div>
        </Card>

        <Card className="mb-6 p-6">
          <h2 className="font-serif text-xl font-semibold text-[#1a1d21]">Blocked dates</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Guests cannot book on these dates. Existing bookings are not removed.
          </p>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#1a1d21]">Add a date</span>
              <input
                type="date"
                min={todayISO()}
                value={blockedInput}
                onChange={(e) => setBlockedInput(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:border-[#4f8cff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff]"
              />
            </label>
            <Button variant="secondary" size="md" onClick={addBlockedDate}>
              Block date
            </Button>
          </div>

          <div className="mt-5">
            {settings.blockedDates.length === 0 ? (
              <EmptyState
                title="No blocked dates"
                message="Every upcoming day is open for reservations."
              />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {settings.blockedDates.map((date) => (
                  <ListRow
                    key={date}
                    title={formatDateLabel(date)}
                    subtitle={
                      bookingsByDate[date]
                        ? `${bookingsByDate[date]} existing booking${bookingsByDate[date] > 1 ? "s" : ""} on this date`
                        : "No existing bookings"
                    }
                    trailing={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBlockedDate(date)}
                        aria-label={`Unblock ${formatDateLabel(date)}`}
                      >
                        Unblock
                      </Button>
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="mb-6 p-6">
          <h2 className="font-serif text-xl font-semibold text-[#1a1d21]">Upcoming preview</h2>
          <p className="mt-1 text-sm text-neutral-600">
            How the next two weeks look with the current settings.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {upcomingDates.map((date) => {
              const blocked = settings.blockedDates.includes(date);
              return (
                <div
                  key={date}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    blocked
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-neutral-200 bg-white text-neutral-700"
                  }`}
                >
                  <div className="font-medium">{formatDateLabel(date)}</div>
                  <div className="mt-1">{blocked ? "Blocked" : "Open"}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" onClick={handleSave}>
            Save settings
          </Button>
          <Link
            href="/book"
            className="rounded-md px-4 py-2 text-sm font-medium text-[#4f8cff] underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] focus-visible:ring-offset-2"
          >
            Preview booking screen
          </Link>
        </div>
      </div>
    </main>
  );
}
