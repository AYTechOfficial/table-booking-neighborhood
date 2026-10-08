"use client";

import React, { useState, useEffect, useMemo } from "react";
import { readLocal, writeLocal } from "@/lib/persist";
import { Button, Card, Badge, EmptyState, ListRow } from "@/components/ui";

const STORAGE_KEY = "lastmile:table-booking-neighborhood:cafes";

export type RecordItem = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
};

export interface TableItem {
  id: string;
  name: string;
  zone: string;
  capacity: number;
  status: "available" | "reserved" | "seated" | "dirty";
}

export interface BookingItem {
  id: string;
  confirmationCode: string;
  guestName: string;
  email: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  zone: string;
  tableId?: string;
  specialRequest?: string;
  status: "confirmed" | "seated" | "completed" | "cancelled";
  vip?: boolean;
  notes?: string;
  createdAt: string;
}

export interface CafeData {
  id: string;
  name: string;
  tagline: string;
  coverImage: string;
  hours: string;
  tables: TableItem[];
  bookings: BookingItem[];
  diaryNotes?: { [date: string]: string };
}

const getTodayString = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const DEFAULT_CAFE: CafeData = {
  id: "nook-table-main",
  name: "Nook & Table",
  tagline: "Artisanal Kitchen & Neighborhood Hearth",
  coverImage:
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
  hours: "08:00 AM - 10:00 PM",
  diaryNotes: {},
  tables: [
    { id: "t1", name: "Table 1", zone: "Window Nook", capacity: 2, status: "reserved" },
    { id: "t2", name: "Table 2", zone: "Window Nook", capacity: 4, status: "seated" },
    { id: "t3", name: "Table 3", zone: "Main Dining", capacity: 4, status: "available" },
    { id: "t4", name: "Table 4", zone: "Main Dining", capacity: 6, status: "reserved" },
    { id: "t5", name: "Table 5", zone: "Main Dining", capacity: 2, status: "dirty" },
    { id: "t6", name: "Table 6", zone: "Sunny Patio", capacity: 4, status: "available" },
    { id: "t7", name: "Table 7", zone: "Sunny Patio", capacity: 2, status: "reserved" },
  ],
  bookings: [
    {
      id: "b-101",
      confirmationCode: "NT-8821",
      guestName: "Elena Rostova",
      email: "elena@example.com",
      phone: "555-0192",
      partySize: 2,
      date: getTodayString(),
      time: "18:30",
      zone: "Window Nook",
      tableId: "t1",
      specialRequest: "High chair needed",
      status: "confirmed",
      vip: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "b-102",
      confirmationCode: "NT-4419",
      guestName: "Marcus Vance",
      email: "marcus.vance@example.com",
      phone: "555-0821",
      partySize: 4,
      date: getTodayString(),
      time: "19:00",
      zone: "Main Dining",
      tableId: "t4",
      specialRequest: "Anniversary celebration",
      status: "confirmed",
      vip: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "b-103",
      confirmationCode: "NT-3022",
      guestName: "Sarah Chen",
      email: "sarah.c@example.com",
      phone: "555-0341",
      partySize: 2,
      date: getTodayString(),
      time: "17:45",
      zone: "Window Nook",
      tableId: "t2",
      specialRequest: "Quiet corner preferred",
      status: "seated",
      vip: true,
      createdAt: new Date().toISOString(),
    },
  ],
};

export default function HostStandPage() {
  const [cafe, setCafe] = useState<CafeData>(DEFAULT_CAFE);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedTableId, setSelectedTableId] = useState<string | null>("t1");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>("b-101");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"floorplan" | "diary" | "runsheet">("floorplan");
  const [shiftNoteInput, setShiftNoteInput] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const saved = readLocal<CafeData>(STORAGE_KEY, DEFAULT_CAFE);
    if (saved) {
      if (!saved.bookings.some((b) => b.confirmationCode === "NT-8821")) {
        const updatedBookings = [
          ...saved.bookings,
          {
            id: "b-101",
            confirmationCode: "NT-8821",
            guestName: "Elena Rostova",
            email: "elena@example.com",
            phone: "555-0192",
            partySize: 2,
            date: getTodayString(),
            time: "18:30",
            zone: "Window Nook",
            tableId: "t1",
            specialRequest: "High chair needed",
            status: "confirmed" as const,
            vip: true,
            createdAt: new Date().toISOString(),
          },
        ];
        const merged = { ...saved, bookings: updatedBookings };
        setCafe(merged);
        writeLocal(STORAGE_KEY, merged);
      } else {
        setCafe(saved);
      }
    }
  }, []);

  const updateCafeData = (newCafe: CafeData) => {
    setCafe(newCafe);
    writeLocal(STORAGE_KEY, newCafe);
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredBookings = useMemo(() => {
    return cafe.bookings.filter((b) => {
      const matchesDate = b.date === selectedDate;
      const matchesStatus =
        statusFilter === "all" ? true : b.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        b.guestName.toLowerCase().includes(q) ||
        b.confirmationCode.toLowerCase().includes(q) ||
        b.phone.includes(q) ||
        b.zone.toLowerCase().includes(q);
      return matchesDate && matchesStatus && matchesQuery;
    });
  }, [cafe.bookings, selectedDate, statusFilter, searchQuery]);

  const selectedBooking = useMemo(() => {
    return cafe.bookings.find((b) => b.id === selectedBookingId) || null;
  }, [cafe.bookings, selectedBookingId]);

  const selectedTable = useMemo(() => {
    return cafe.tables.find((t) => t.id === selectedTableId) || null;
  }, [cafe.tables, selectedTableId]);

  const handleSelectTable = (tableId: string) => {
    setSelectedTableId(tableId);
    const linkedBooking = cafe.bookings.find(
      (b) => b.tableId === tableId && b.date === selectedDate
    );
    if (linkedBooking) {
      setSelectedBookingId(linkedBooking.id);
    } else {
      setSelectedBookingId(null);
    }
  };

  const handleSelectBooking = (booking: BookingItem) => {
    setSelectedBookingId(booking.id);
    if (booking.tableId) {
      setSelectedTableId(booking.tableId);
    }
  };

  const handleStatusChange =
    (bookingId: string, newBookingStatus: "confirmed" | "seated" | "completed" | "cancelled") => {
      const targetBooking = cafe.bookings.find((b) => b.id === bookingId);
      if (!targetBooking) return;

      let newTableStatus: "available" | "reserved" | "seated" | "dirty" = "available";
      if (newBookingStatus === "seated") newTableStatus = "seated";
      else if (newBookingStatus === "confirmed") newTableStatus = "reserved";
      else if (newBookingStatus === "completed") newTableStatus = "dirty";

      const updatedBookings = cafe.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: newBookingStatus } : b
      );

      const updatedTables = cafe.tables.map((t) =>
        t.id === targetBooking.tableId ? { ...t, status: newTableStatus } : t
      );

      const updatedCafe = { ...cafe, bookings: updatedBookings, tables: updatedTables };
      updateCafeData(updatedCafe);
      showToast(`Updated ${targetBooking.guestName} to ${newBookingStatus.toUpperCase()}`);
    };

  const handleTableStatusDirect = (
    tableId: string,
    newStatus: "available" | "reserved" | "seated" | "dirty"
  ) => {
    const updatedTables = cafe.tables.map((t) =>
      t.id === tableId ? { ...t, status: newStatus } : t
    );
    const updatedCafe = { ...cafe, tables: updatedTables };
    updateCafeData(updatedCafe);
    showToast(`Table status changed to ${newStatus}`);
  };

  const handleSaveDiaryNote = () => {
    if (!shiftNoteInput.trim()) return;
    const existingNotes = cafe.diaryNotes || {};
    const newNotes = {
      ...existingNotes,
      [selectedDate]: shiftNoteInput,
    };
    const updatedCafe = { ...cafe, diaryNotes: newNotes };
    updateCafeData(updatedCafe);
    setShiftNoteInput("");
    showToast("Diary note saved for selected date");
  };

  const zones = Array.from(new Set(cafe.tables.map((t) => t.zone)));
  const todayDiary = (cafe.diaryNotes && cafe.diaryNotes[selectedDate]) || "";

  const stats = useMemo(() => {
    const todayBookings = cafe.bookings.filter((b) => b.date === selectedDate);
    const totalGuests = todayBookings.reduce((sum, b) => sum + b.partySize, 0);
    const seatedCount = todayBookings.filter((b) => b.status === "seated").length;
    const confirmedCount = todayBookings.filter((b) => b.status === "confirmed").length;
    const vipCount = todayBookings.filter((b) => b.vip).length;
    return { totalBookings: todayBookings.length, totalGuests, seatedCount, confirmedCount, vipCount };
  }, [cafe.bookings, selectedDate]);

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1d21] flex flex-col font-sans">
      {/* Top Banner & Header */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur sticky top-0 z-30 px-4 py-3 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-serif text-xl font-bold shadow-md">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900">
                  {cafe.name}
                </h1>
                <Badge tone="brand">Host Stand</Badge>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                {cafe.tagline} • Hours: {cafe.hours}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-lg border border-stone-200">
              <span className="text-xs font-semibold text-stone-600 pl-1">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white text-xs text-stone-900 border border-stone-300 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-stone-800"
              />
            </div>

            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs font-medium">
              <button
                onClick={() => setActiveTab("floorplan")}
                className={`px-3 py-1.5 rounded-md transition-all ${' '}
                  ${activeTab === "floorplan" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
              >
                Floor Plan
              </button>
              <button
                onClick={() => setActiveTab("runsheet")}
                className={`px-3 py-1.5 rounded-md transition-all ${' '}
                  ${activeTab === "runsheet" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
              >
                Daily Run-Sheet
              </button>
              <button
                onClick={() => setActiveTab("diary")}
                className={`px-3 py-1.5 rounded-md transition-all ${' '}
                  ${activeTab === "diary" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
              >
                Shift Diary
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-stone-700 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {notification}
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-6">
        {/* Shift Summary Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-3 bg-white border border-stone-200/80 rounded-xl flex flex-col justify-between shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Total Reservations</span>
            <span className="text-2xl font-bold font-serif text-stone-900 mt-1">{stats.totalBookings}</span>
          </Card>
          <Card className="p-3 bg-white border border-stone-200/80 rounded-xl flex flex-col justify-between shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Expected Guests</span>
            <span className="text-2xl font-bold font-serif text-stone-900 mt-1">{stats.totalGuests}</span>
          </Card>
          <Card className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col justify-between shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Upcoming / Confirmed</span>
            <span className="text-2xl font-bold font-serif text-amber-900 mt-1">{stats.confirmedCount}</span>
          </Card>
          <Card className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col justify-between shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Currently Seated</span>
            <span className="text-2xl font-bold font-serif text-emerald-900 mt-1">{stats.seatedCount}</span>
          </Card>
          <Card className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl flex flex-col justify-between shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-800">VIP Guests</span>
            <span className="text-2xl font-bold font-serif text-purple-900 mt-1">{stats.vipCount}</span>
          </Card>
        </div>

        {/* TAB 1: VISUAL FLOOR PLAN & TIMELINE */}
        {activeTab === "floorplan" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Visual Floor Plan Grid (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <Card className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-stone-900">Interactive Floor Plan</h2>
                    <p className="text-xs text-stone-500">Select a table to inspect live status or jump to assigned guest booking.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span> Seated</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span> Reserved</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span> Open</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200"></span> Dirty</span>
                  </div>
                </div>

                {zones.length === 0 ? (
                  <EmptyState title="No Seating Zones Configured" description="Add tables in Settings to render the floor plan." />
                ) : (
                  <div className="space-y-6">
                    {zones.map((zone) => {
                      const zoneTables = cafe.tables.filter((t) => t.zone === zone);
                      return (
                        <div key={zone} className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/60">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 font-mono">
                              📍 {zone}
                            </span>
                            <span className="text-[11px] text-stone-400 font-medium">{zoneTables.length} tables</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {zoneTables.map((tbl) => {
                              const assignedBooking = cafe.bookings.find(
                                (b) => b.tableId === tbl.id && b.date === selectedDate
                              );
                              const isSelected = selectedTableId === tbl.id;

                              let borderStyle = "border-stone-200 bg-white hover:border-stone-400";
                              let badgeTone: "pass" | "warn" | "neutral" | "bad" = "neutral";
                              let glowEffect = "";

                              if (tbl.status === "seated") {
                                borderStyle = "border-emerald-300 bg-emerald-50/40 hover:border-emerald-500";
                                badgeTone = "pass";
                                glowEffect = "shadow-[0_0_12px_rgba(16,185,129,0.25)]";
                              } else if (tbl.status === "reserved") {
                                borderStyle = "border-amber-300 bg-amber-50/40 hover:border-amber-500";
                                badgeTone = "warn";
                                glowEffect = "shadow-[0_0_12px_rgba(245,158,11,0.25)]";
                              } else if (tbl.status === "dirty") {
                                borderStyle = "border-rose-300 bg-rose-50/40 hover:border-rose-500";
                                badgeTone = "bad";
                              }

                              if (isSelected) {
                                borderStyle += " ring-2 ring-stone-900 border-stone-900";
                              }

                              return (
                                <button
                                  key={tbl.id}
                                  onClick={() => handleSelectTable(tbl.id)}
                                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${borderStyle} ${glowEffect}`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1.5">
                                      <span className="font-serif font-bold text-stone-900 text-sm">{tbl.name}</span>
                                      <Badge tone={badgeTone}>{tbl.status.toUpperCase()}</Badge>
                                    </div>
                                    <span className="text-[11px] text-stone-500 font-medium block">
                                      {tbl.capacity} Seats
                                    </span>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-stone-100 text-xs">
                                    {assignedBooking ? (
                                      <div className="truncate">
                                        <p className="font-medium text-stone-800 truncate">
                                          {assignedBooking.guestName}
                                        </p>
                                        <p className="text-[10px] text-stone-500 font-mono">
                                          {assignedBooking.time} • {assignedBooking.partySize} guests
                                        </p>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-stone-400 italic">Unassigned / Open</span>
                                    )}
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

              {/* Direct Table Actions Bar */}
              {selectedTable && (
                <Card className="p-4 bg-stone-900 text-white rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Selected Table Controls</span>
                    <h3 className="font-serif text-base font-bold text-white">{selectedTable.name} ({selectedTable.zone})</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => handleTableStatusDirect(selectedTable.id, "seated")}>
                      Mark Seated
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleTableStatusDirect(selectedTable.id, "reserved")}>
                      Mark Reserved
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleTableStatusDirect(selectedTable.id, "available")}>
                      Mark Open
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleTableStatusDirect(selectedTable.id, "dirty")}>
                      Mark Dirty
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Timeline Panel & Booking Details (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Timeline Header & Filters */}
              <Card className="p-4 bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-lg font-bold text-stone-900">Daily Timeline</h2>
                  <span className="text-xs font-mono font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                    {selectedDate}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search guest, phone, code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-stone-50 text-xs border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-stone-50 text-xs border border-stone-200 rounded-lg px-2.5 py-2 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800"
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="seated">Seated</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Booking List Timeline */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredBookings.length === 0 ? (
                    <EmptyState
                      title="No Reservations Found"
                      description={`No bookings match criteria for date ${selectedDate}.`}
                    />
                  ) : (
                    filteredBookings.map((b) => {
                      const isSelected = selectedBookingId === b.id;
                      let badgeTone: "pass" | "warn" | "neutral" | "bad" = "warn";
                      if (b.status === "seated") badgeTone = "pass";
                      if (b.status === "completed") badgeTone = "neutral";
                      if (b.status === "cancelled") badgeTone = "bad";

                      return (
                        <div
                          key={b.id}
                          onClick={() => handleSelectBooking(b)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${' '}
                            ${isSelected ? "bg-stone-900 text-white border-stone-900 shadow-sm" : "bg-stone-50/80 border-stone-200 hover:bg-stone-100/80 text-stone-900"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs tracking-wide">
                                {b.time}
                              </span>
                              <span className="font-bold text-sm truncate max-w-[140px]">
                                {b.guestName}
                              </span>
                              {b.vip && (
                                <span className="bg-amber-400 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                  VIP
                                </span>
                              )}
                            </div>
                            <Badge tone={badgeTone}>{b.status.toUpperCase()}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs opacity-80 mt-1">
                            <span>{b.partySize} Guests • {b.zone}</span>
                            <span className="font-mono text-[10px]">#{b.confirmationCode}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* Inspector Panel for Selected Booking */}
              {selectedBooking ? (
                <Card className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-stone-900">
                          {selectedBooking.guestName}
                        </h3>
                        {selectedBooking.vip && (
                          <Badge tone="warn">VIP GUEST</Badge>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 font-mono">
                        Confirmation Code: {selectedBooking.confirmationCode}
                      </p>
                    </div>
                    <Badge
                      tone={
                        selectedBooking.status === "seated"
                          ? "pass"
                          : selectedBooking.status === "confirmed"
                          ? "warn"
                          : "neutral"
                      }
                    >
                      {selectedBooking.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">Party Size</span>
                      <span className="font-semibold text-stone-900 text-sm">👥 {selectedBooking.partySize} Guests</span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">Time Slot</span>
                      <span className="font-semibold text-stone-900 text-sm">🕒 {selectedBooking.time}</span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">Seating Zone</span>
                      <span className="font-semibold text-stone-900 text-sm">📍 {selectedBooking.zone}</span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">Assigned Table</span>
                      <span className="font-semibold text-stone-900 text-sm">
                        {selectedBooking.tableId
                          ? cafe.tables.find((t) => t.id === selectedBooking.tableId)?.name || selectedBooking.tableId
                          : "Unassigned"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100">
                    <p><strong className="text-stone-800">Phone:</strong> {selectedBooking.phone}</p>
                    <p><strong className="text-stone-800">Email:</strong> {selectedBooking.email}</p>
                    {selectedBooking.specialRequest && (
                      <p className="mt-1 pt-1 border-t border-stone-200 text-amber-900 font-medium">
                        💬 Special Request: "{selectedBooking.specialRequest}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2 flex-wrap">
                    {selectedBooking.status !== "seated" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusChange(selectedBooking.id, "seated")}
                      >
                        Mark as Seated
                      </Button>
                    )}
                    {selectedBooking.status === "seated" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(selectedBooking.id, "completed")}
                      >
                        Complete & Clear Table
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedBooking.id, "confirmed")}
                    >
                      Reset Confirmed
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleStatusChange(selectedBooking.id, "cancelled")}
                    >
                      Cancel Booking
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 bg-white border border-stone-200 rounded-2xl shadow-sm text-center text-stone-500 text-xs">
                  Select a booking from the timeline or click a table to view details and control seating.
                </Card>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DAILY RUN-SHEET VIEW */}
        {activeTab === "runsheet" && (
          <Card className="p-6 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">Daily Run-Sheet Checklist</h2>
                <p className="text-xs text-stone-500">Complete chronological listing of reservations for {selectedDate}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Print Run-Sheet
              </Button>
            </div>

            {filteredBookings.length === 0 ? (
              <EmptyState title="No Bookings Scheduled" description="No guest reservations exist for this date." />
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredBookings.map((b) => (
                  <ListRow
                    key={b.id}
                    title={`${b.time} — ${b.guestName} (${b.partySize} Guests)`}
                    subtitle={`Zone: ${b.zone} • Table: ${b.tableId || "Pending"} • Contact: ${b.phone} • Note: ${b.specialRequest || "None"}`}
                    trailing={
                      <div className="flex items-center gap-2">
                        {b.vip && <Badge tone="warn">VIP</Badge>}
                        <Badge tone={b.status === "seated" ? "pass" : b.status === "confirmed" ? "warn" : "neutral"}>
                          {b.status.toUpperCase()}
                        </Badge>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* TAB 3: SHIFT DIARY & NOTES */}
        {activeTab === "diary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-900">Host Stand Digital Diary</h2>
                <p className="text-xs text-stone-500">Log shift notes, VIP preferences, weather warnings, or floor notes for {selectedDate}.</p>
              </div>

              <textarea
                rows={6}
                value={shiftNoteInput}
                onChange={(e) => setShiftNoteInput(e.target.value)}
                placeholder="Type shift notes here (e.g. Patio heaters active, VIP party arriving at 8 PM, high demand for Window Nook)..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800 font-sans leading-relaxed"
              />

              <div className="flex justify-end">
                <Button variant="primary" size="sm" onClick={handleSaveDiaryNote}>
                  Save Shift Note
                </Button>
              </div>
            </Card>

            <Card className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-stone-900">Saved Note for {selectedDate}</h3>
              {todayDiary ? (
                <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl text-xs text-amber-900 leading-relaxed font-serif italic shadow-inner">
                  "{todayDiary}"
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No host diary notes recorded for this date yet.</p>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
