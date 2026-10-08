"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Badge } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

export type CafeSettings = {
  cafeName: string;
  address: string;
  phone: string;
  email: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  maxCoversPerSlot: number;
  autoConfirm: boolean;
};

const CORNER_SETTINGS_KEY = "cornertable_settings";
const LEGACY_SETTINGS_KEY = "lastmile:table-booking-neighborhood:settings";

const DEFAULT_SETTINGS: CafeSettings = {
  cafeName: "The Corner Espresso & Bakery",
  address: "14 Alder Lane, Riverside",
  phone: "(555) 014-2288",
  email: "hello@cornertable.cafe",
  openTime: "08:00",
  closeTime: "17:00",
  slotMinutes: 30,
  maxCoversPerSlot: 16,
  autoConfirm: true,
};

function sanitizeSettings(raw: unknown): CafeSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  return {
    cafeName: typeof r.cafeName === "string" && r.cafeName ? r.cafeName : (typeof r.cafe_name === "string" && r.cafe_name ? r.cafe_name : base.cafeName),
    address: typeof r.address === "string" ? r.address : base.address,
    phone: typeof r.phone === "string" ? r.phone : base.phone,
    email: typeof r.email === "string" ? r.email : base.email,
    openTime: typeof r.openTime === "string" ? r.openTime : (typeof r.opening_time === "string" ? r.opening_time : base.openTime),
    closeTime: typeof r.closeTime === "string" ? r.closeTime : (typeof r.closing_time === "string" ? r.closing_time : base.closeTime),
    slotMinutes: typeof r.slotMinutes === "number" ? r.slotMinutes : (typeof r.slot_interval_minutes === "number" ? r.slot_interval_minutes : base.slotMinutes),
    maxCoversPerSlot: typeof r.maxCoversPerSlot === "number" ? r.maxCoversPerSlot : (typeof r.max_covers_per_slot === "number" ? r.max_covers_per_slot : base.maxCoversPerSlot),
    autoConfirm: typeof r.autoConfirm === "boolean" ? r.autoConfirm : (typeof r.auto_confirm === "boolean" ? r.auto_confirm : base.autoConfirm),
  };
}

export default function ManagerSettingsPage() {
  const [settings, setSettings] = useState<CafeSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loaded = readLocal<unknown>(CORNER_SETTINGS_KEY, readLocal<unknown>(LEGACY_SETTINGS_KEY, DEFAULT_SETTINGS));
    setSettings(sanitizeSettings(loaded));
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    writeLocal(CORNER_SETTINGS_KEY, settings);
    writeLocal(LEGACY_SETTINGS_KEY, settings);
    setSaved(true);
    setMessage("Settings saved successfully");
    setTimeout(() => setMessage(null), 3000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    writeLocal(CORNER_SETTINGS_KEY, DEFAULT_SETTINGS);
    writeLocal(LEGACY_SETTINGS_KEY, DEFAULT_SETTINGS);
    setMessage("Reset to default settings");
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1917] p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <Link href="/manager" className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline mb-1 inline-block">
              &larr; Back to Diary
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Manager Settings</h1>
            <p className="text-xs text-stone-500">Configure operating hours, slot duration, max capacity, and cafe information.</p>
          </div>
          <Badge tone="neutral">/manager/settings</Badge>
        </div>

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-4 bg-white border-stone-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Cafe Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Cafe Name</label>
                <input
                  type="text"
                  required
                  value={settings.cafeName}
                  onChange={(e) => setSettings({ ...settings, cafeName: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Address</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4 bg-white border-stone-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Operating Hours</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Opening Time</label>
                <input
                  type="time"
                  value={settings.openTime}
                  onChange={(e) => setSettings({ ...settings, openTime: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Closing Time</label>
                <input
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4 bg-white border-stone-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Capacity & Automation</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Slot Duration (Minutes)</label>
                <select
                  value={settings.slotMinutes}
                  onChange={(e) => setSettings({ ...settings, slotMinutes: parseInt(e.target.value, 10) })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Max Covers Per Slot</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={settings.maxCoversPerSlot}
                  onChange={(e) => setSettings({ ...settings, maxCoversPerSlot: parseInt(e.target.value, 10) || 16 })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-stone-100">
              <div>
                <p className="text-xs font-semibold text-stone-800">Auto-Confirm Bookings</p>
                <p className="text-[11px] text-stone-500">Automatically confirm incoming customer bookings when slot capacity is available.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoConfirm}
                onChange={(e) => setSettings({ ...settings, autoConfirm: e.target.checked })}
                className="h-4 w-4 accent-amber-600 rounded border-stone-300"
              />
            </div>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
