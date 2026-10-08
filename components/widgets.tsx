"use client";

import React, { useState } from "react";
import { Button, Card, Badge, EmptyState, ListRow } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

// --- SHARED CONSTANTS & TYPES ---
export const STORAGE_KEY = "lastmile:table-booking-neighborhood:cafes";

export type RecordItem = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
};

export type TableZone = {
  id: string;
  name: string;
  zone: string;
  capacity: number;
  position: { x: number; y: number };
  status?: "available" | "reserved" | "seated" | "blocked";
};

export type Booking = {
  id: string;
  confirmationCode: string;
  guestName: string;
  email: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  tableId: string;
  zone: string;
  specialRequest: string;
  status: "confirmed" | "seated" | "completed" | "cancelled";
  createdAt: string;
};

export type CafeMetadata = {
  name: string;
  tagline: string;
  coverImage: string;
  openHours: string;
};

export type CafeData = {
  metadata: CafeMetadata;
  tables: TableZone[];
  bookings: Booking[];
};

// --- PERSISTENCE HELPERS ---
export function getTodayDateString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getDefaultCafeData(): CafeData {
  const todayStr = getTodayDateString();
  return {
    metadata: {
      name: "Nook & Table",
      tagline: "Artisanal Coffee & Cozy Dining Nooks",
      coverImage:
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1200",
      openHours: "7:00 AM - 9:00 PM Daily",
    },
    tables: [
      { id: "t1", name: "Table 1 (Window Nook)", zone: "Window Nook", capacity: 2, position: { x: 1, y: 1 } },
      { id: "t2", name: "Table 2 (Window Nook)", zone: "Window Nook", capacity: 2, position: { x: 2, y: 1 } },
      { id: "t3", name: "Table 3 (Main Dining)", zone: "Main Dining", capacity: 4, position: { x: 1, y: 2 } },
      { id: "t4", name: "Table 4 (Main Dining)", zone: "Main Dining", capacity: 4, position: { x: 2, y: 2 } },
      { id: "t5", name: "Table 5 (Main Dining)", zone: "Main Dining", capacity: 6, position: { x: 3, y: 2 } },
      { id: "t6", name: "Table 6 (Sunny Patio)", zone: "Sunny Patio", capacity: 4, position: { x: 1, y: 3 } },
      { id: "t7", name: "Table 7 (Sunny Patio)", zone: "Sunny Patio", capacity: 8, position: { x: 2, y: 3 } },
    ],
    bookings: [
      {
        id: "b-8821",
        confirmationCode: "NT-8821",
        guestName: "Elena Rostova",
        email: "elena@example.com",
        phone: "555-0192",
        partySize: 2,
        date: todayStr,
        time: "10:00 AM",
        tableId: "t1",
        zone: "Window Nook",
        specialRequest: "High chair needed",
        status: "confirmed",
        createdAt: new Date().toISOString(),
      },
      {
        id: "b-1042",
        confirmationCode: "NT-1042",
        guestName: "Marcus Vance",
        email: "marcus@example.com",
        phone: "555-0841",
        partySize: 4,
        date: todayStr,
        time: "12:30 PM",
        tableId: "t3",
        zone: "Main Dining",
        specialRequest: "Quiet corner requested for lunch meeting",
        status: "seated",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function loadCafeData(): CafeData {
  return readLocal<CafeData>(STORAGE_KEY, getDefaultCafeData());
}

export function saveCafeData(data: CafeData): void {
  writeLocal(STORAGE_KEY, data);
}

// --- ICONS ---
export function CoffeeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  );
}

export function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function UsersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

export function MapPinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// --- UI COMPONENTS --- 

export function CafeHeader({
  metadata,
  activeTab,
  onTabChange,
}: {
  metadata: CafeMetadata;
  activeTab?: "guest" | "host" | "settings";
  onTabChange?: (tab: "guest" | "host" | "settings") => void;
}) {
  return (
    <header className="relative bg-stone-900 text-stone-100 rounded-2xl overflow-hidden shadow-xl mb-6 border border-stone-800">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay filter blur-[1px]"
        style={{ backgroundImage: `url(${metadata.coverImage})` }}
      />
      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-t from-stone-950/90 via-stone-900/60 to-transparent">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              <CoffeeIcon className="w-3.5 h-3.5" />
              Artisanal Booking Hub
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              <ClockIcon className="w-3.5 h-3.5" />
              {metadata.openHours}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-white">
            {metadata.name}
          </h1>
          <p className="text-stone-300 text-sm md:text-base mt-1 font-light max-w-xl">
            {metadata.tagline}
          </p>
        </div>

        {onTabChange && (
          <div className="flex items-center gap-1.5 bg-stone-900/80 p-1.5 rounded-xl border border-stone-800/80 backdrop-blur-md self-start md:self-center">
            <button
              onClick={() => onTabChange("guest")}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${'guest' === activeTab ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-white hover:bg-stone-800/60'}`}
            >
              Guest View
            </button>
            <button
              onClick={() => onTabChange("host")}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${'host' === activeTab ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-white hover:bg-stone-800/60'}`}
            >
              Host Stand
            </button>
            <button
              onClick={() => onTabChange("settings")}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${'settings' === activeTab ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-white hover:bg-stone-800/60'}`}
            >
              Cafe Setup
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function StatCard({
  label,
  value,
  icon,
  subtext,
  accentColor = "amber",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subtext?: string;
  accentColor?: "amber" | "emerald" | "blue" | "stone";
}) {
  const accentStyles = {
    amber: "border-amber-200 text-amber-700 bg-amber-50/50",
    emerald: "border-emerald-200 text-emerald-700 bg-emerald-50/50",
    blue: "border-blue-200 text-blue-700 bg-blue-50/50",
    stone: "border-stone-200 text-stone-700 bg-stone-50/50",
  };

  return (
    <Card className="p-4 flex items-center gap-4 bg-white border border-stone-200 shadow-sm rounded-xl hover:shadow-md transition-shadow">
      {icon && (
        <div className={`p-3 rounded-lg border ${accentStyles[accentColor]}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-stone-900 font-serif tracking-tight mt-0.5">{value}</p>
        {subtext && <p className="text-xs text-stone-500 mt-0.5">{subtext}</p>}
      </div>
    </Card>
  );
}

export function ZoneCard({
  zoneName,
  capacityText,
  availableCount,
  isSelected,
  onClick,
}: {
  zoneName: string;
  capacityText: string;
  availableCount: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const zoneImageMap: Record<string, string> = {
    "Window Nook": "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=400",
    "Main Dining": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400",
    "Sunny Patio": "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=400",
  };

  const imageUrl = zoneImageMap[zoneName] || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400";

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer relative overflow-hidden rounded-xl border transition-all duration-200 ${isSelected ? 'ring-2 ring-amber-600 border-amber-600 shadow-lg bg-stone-50' : 'border-stone-200 hover:border-stone-400 bg-white hover:shadow-md'}`}
    >
      <div className="relative h-28 overflow-hidden">
        <img
          src={imageUrl}
          alt={zoneName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white">
          <span className="font-serif font-bold text-base tracking-wide">{zoneName}</span>
          <Badge tone={availableCount > 0 ? "pass" : "neutral"}>
            {availableCount > 0 ? `${availableCount} Open` : "Full"}
          </Badge>
        </div>
      </div>
      <div className="p-3 flex items-center justify-between text-xs text-stone-600">
        <span className="flex items-center gap-1 text-stone-600">
          <UsersIcon className="w-3.5 h-3.5 text-stone-400" />
          {capacityText}
        </span>
        <span className={`font-semibold ${isSelected ? 'text-amber-700' : 'text-stone-500'}`}>
          {isSelected ? "✓ Selected Zone" : "Click to Select"}
        </span>
      </div>
    </div>
  );
}

export function InteractiveFloorPlan({
  tables,
  bookingsForDate,
  selectedTableId,
  onSelectTable,
}: {
  tables: TableZone[];
  bookingsForDate: Booking[];
  selectedTableId?: string;
  onSelectTable?: (table: TableZone) => void;
}) {
  // Group tables by zone
  const zones = Array.from(new Set(tables.map((t) => t.zone)));

  const getTableStatus = (tableId: string): {
    status: "available" | "reserved" | "seated";
    booking?: Booking;
  } => {
    const activeBooking = bookingsForDate.find(
      (b) => b.tableId === tableId && (b.status === "confirmed" || b.status === "seated")
    );
    if (!activeBooking) return { status: "available" };
    if (activeBooking.status === "seated") return { status: "seated", booking: activeBooking };
    return { status: "reserved", booking: activeBooking };
  };

  return (
    <Card className="p-5 bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-stone-800 pb-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
            <MapPinIcon className="text-amber-500" />
            Host Interactive Floor Plan
          </h3>
          <p className="text-xs text-stone-400">
            Click a table to highlight guest timeline record or inspect details
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-stone-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-emerald-500/50 shadow-sm" />
            Available
          </span>
          <span className="flex items-center gap-1.5 text-stone-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-amber-500/50 shadow-sm ring-2 ring-amber-500/30 animate-pulse" />
            Reserved (Amber glow)
          </span>
          <span className="flex items-center gap-1.5 text-stone-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-emerald-400/50 shadow-sm ring-2 ring-emerald-400/30" />
            Seated (Emerald glow)
          </span>
        </div>
      </div>

      {zones.length === 0 ? (
        <EmptyState
          title="No Tables Configured"
          message="There are no dining tables available on the floor plan."
          description="Visit Cafe Setup to configure tables and seating zones."
        />
      ) : (
        <div className="space-y-6">
          {zones.map((zone) => {
            const zoneTables = tables.filter((t) => t.zone === zone);
            return (
              <div key={zone} className="bg-stone-950/50 p-4 rounded-xl border border-stone-800/80">
                <h4 className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                  {zone}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {zoneTables.map((table) => {
                    const { status, booking } = getTableStatus(table.id);
                    const isSelected = selectedTableId === table.id;

                    let statusClasses = "bg-stone-800/80 border-stone-700 text-stone-300 hover:border-stone-500";
                    if (status === "reserved") {
                      statusClasses = "bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-lg shadow-amber-950/50 ring-1 ring-amber-500/40";
                    } else if (status === "seated") {
                      statusClasses = "bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/40";
                    }

                    if (isSelected) {
                      statusClasses += " ring-2 ring-amber-400 scale-[1.02]";
                    }

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => onSelectTable && onSelectTable(table)}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-28 relative overflow-hidden group ${statusClasses}`}
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="font-semibold text-xs tracking-tight text-stone-100 group-hover:text-white truncate">
                            {table.name}
                          </span>
                          <Badge
                            tone={
                              status === "seated"
                                ? "pass"
                                : status === "reserved"
                                ? "warn"
                                : "neutral"
                            }
                          >
                            {status === "seated" ? "Seated" : status === "reserved" ? "Reserved" : "Open"}
                          </Badge>
                        </div>

                        <div className="my-1">
                          {booking ? (
                            <p className="text-xs font-semibold text-stone-200 truncate">
                              {booking.guestName}
                            </p>
                          ) : (
                            <p className="text-[11px] text-stone-400 font-light">
                              {table.capacity} Guests Max
                            </p>
                          )}
                          {booking && (
                            <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                              <ClockIcon className="w-3 h-3 text-amber-400" />
                              {booking.time}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-800 pt-1.5 mt-auto">
                          <span>Cap: {table.capacity}</span>
                          {isSelected && <span className="text-amber-400 font-bold">Focused</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function BookingReceiptCard({
  booking,
  cafeName,
  onDone,
}: {
  booking: Booking;
  cafeName: string;
  onDone?: () => void;
}) {
  return (
    <Card className="max-w-lg mx-auto bg-white border border-stone-200 shadow-2xl rounded-2xl overflow-hidden animate-fadeIn">
      {/* Receipt Top Header */}
      <div className="bg-stone-900 text-stone-100 p-6 text-center relative">
        <div className="w-12 h-12 bg-amber-600/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
          <CheckCircleIcon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-serif font-bold text-white">Table Reserved Successfully</h3>
        <p className="text-stone-400 text-xs mt-1">{cafeName} — Confirmation Code</p>
        <div className="mt-3 inline-block bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-lg px-4 py-1.5 rounded-lg">
          {booking.confirmationCode}
        </div>
      </div>

      {/* Receipt Details */}
      <div className="p-6 space-y-4 text-stone-700 text-sm">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-100">
          <div>
            <span className="block text-xs text-stone-400 uppercase tracking-wider font-medium">Guest Name</span>
            <span className="font-semibold text-stone-900">{booking.guestName}</span>
          </div>
          <div>
            <span className="block text-xs text-stone-400 uppercase tracking-wider font-medium">Party Size</span>
            <span className="font-semibold text-stone-900">{booking.partySize} Guests</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-100">
          <div>
            <span className="block text-xs text-stone-400 uppercase tracking-wider font-medium">Date & Time</span>
            <span className="font-semibold text-stone-900">{booking.date} at {booking.time}</span>
          </div>
          <div>
            <span className="block text-xs text-stone-400 uppercase tracking-wider font-medium">Assigned Zone</span>
            <span className="font-semibold text-stone-900">{booking.zone}</span>
          </div>
        </div>

        {booking.specialRequest && (
          <div className="pb-4 border-b border-stone-100">
            <span className="block text-xs text-stone-400 uppercase tracking-wider font-medium">Special Requests</span>
            <span className="text-stone-700 italic text-xs mt-0.5 block">"{booking.specialRequest}"</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => window.print()}
          >
            Print Receipt
          </Button>
          {onDone && (
            <Button
              variant="primary"
              className="w-full bg-amber-600 text-white hover:bg-amber-700"
              onClick={onDone}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
