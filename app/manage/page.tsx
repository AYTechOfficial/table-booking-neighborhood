"use client";

import { useEffect, useMemo, useState } from "react";
import { readLocal, writeLocal } from "@/lib/persist";
import { Button, Card, Badge, EmptyState, ListRow } from "@/components/ui";

const STORAGE_KEY = "lastmile:table-booking-neighborhood:bookings";

type BookingRecord = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
  reference: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests: string;
  status: "Confirmed" | "Seated" | "No-show" | "Cancelled";
};

export default function OwnerManagePage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    const loaded = readLocal<BookingRecord[]>(STORAGE_KEY, []);
    setBookings(loaded);
    
    // Default to today or the earliest date available
    if (loaded.length > 0 && !selectedDate) {
      const dates = Array.from(new Set(loaded.map(b => b.date))).sort();
      const todayStr = new Date().toISOString().split("T")[0];
      if (dates.includes(todayStr)) {
        setSelectedDate(todayStr);
      } else {
        setSelectedDate(dates[0]);
      }
    }
  }, [selectedDate]);

  const saveBookings = (updated: BookingRecord[]) => {
    setBookings(updated);
    writeLocal(STORAGE_KEY, updated);
  };

  const availableDates = useMemo(() => {
    const set = new Set(bookings.map(b => b.date));
    return Array.from(set).sort();
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchDate = !selectedDate || b.date === selectedDate;
      const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch = !q || b.name.toLowerCase().includes(q) || b.reference.toLowerCase().includes(q) || b.phone.includes(q);
      return matchDate && matchStatus && matchSearch;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }, [bookings, selectedDate, statusFilter, searchTerm]);

  const dailyCovers = useMemo(() => {
    return filteredBookings
      .filter(b => b.status !== "Cancelled" && b.status !== "No-show")
      .reduce((sum, b) => sum + b.partySize, 0);
  }, [filteredBookings]);

  const handleStatusChange = (id: string, newStatus: BookingRecord["status"]) => {
    const updated = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b);
    saveBookings(updated);
  };

  const handleExportCSV = () => {
    const headers = ["Reference", "Guest Name", "Phone", "Email", "Date", "Time", "Party Size", "Status", "Special Requests"];
    const rows = filteredBookings.map(b => [
      b.reference,
      `"${b.name.replace(/"/g, '""')}"`,
      b.phone,
      b.email,
      b.date,
      b.time,
      b.partySize,
      b.status,
      `"${b.specialRequests.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cornertable-bookings-${selectedDate || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#1a1d21] font-sans pb-16">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif font-bold text-[#1a1d21]">CornerTable</h1>
              <span className="text-xs bg-[#4f8cff]/10 text-[#4f8cff] font-semibold px-2 py-0.5 rounded-full">Owner Diary</span>
            </div>
            <p className="text-sm text-gray-500">Manage bookings, track live covers, and review guest preferences.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/manage/settings"}>
              Settings
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.location.href = "/book"}>
              New Booking
            </Button>
            <Button variant="primary" size="sm" onClick={handleExportCSV} disabled={filteredBookings.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        {/* Controls & Filters Card */}
        <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Filter by Date</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:outline-none focus:ring-2 focus:ring-[#4f8cff]"
              >
                <option value="">All Dates ({bookings.length})</option>
                {availableDates.map(d => (
                  <option key={d} value={d}>
                    {d} ({bookings.filter(b => b.date === d).length})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:outline-none focus:ring-2 focus:ring-[#4f8cff]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Seated">Seated</option>
                <option value="No-show">No-show</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Search Guest</label>
              <input
                type="text"
                placeholder="Name, ref, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1a1d21] focus:outline-none focus:ring-2 focus:ring-[#4f8cff]"
              />
            </div>

            <div className="bg-[#faf9f7] border border-gray-200 rounded-md p-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block">Active Covers</span>
                <span className="text-xl font-bold text-[#1a1d21]">{dailyCovers}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 block">Parties</span>
                <span className="text-xl font-bold text-[#1a1d21]">
                  {filteredBookings.filter(b => b.status !== "Cancelled" && b.status !== "No-show").length}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Bookings List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-[#1a1d21]">
              {selectedDate ? `Bookings for ${selectedDate}` : "All Bookings"}
              <span className="ml-2 text-sm font-sans font-normal text-gray-500">({filteredBookings.length} results)</span>
            </h2>
          </div>

          {filteredBookings.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                title="No bookings found"
                description="There are no reservations matching your current filter criteria."
                action={
                  selectedDate || statusFilter !== "ALL" || searchTerm ? (
                    <Button variant="outline" size="sm" onClick={() => { setSelectedDate(""); setStatusFilter("ALL"); setSearchTerm(""); }}>
                      Reset filters
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((b) => (
                <Card key={b.id} className="p-4 hover:border-gray-300 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {b.reference}
                        </span>
                        <span className="font-bold text-base text-[#1a1d21]">{b.name}</span>
                        <Badge tone={
                          b.status === "Confirmed" ? "pass" :
                          b.status === "Seated" ? "brand" :
                          b.status === "No-show" ? "warn" : "bad"
                        }>
                          {b.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                        <span>📅 {b.date}</span>
                        <span>⏰ {b.time}</span>
                        <span>👥 {b.partySize} {b.partySize === 1 ? "guest" : "guests"}</span>
                        <span>📞 {b.phone}</span>
                        <span>✉️ {b.email}</span>
                      </div>

                      {b.specialRequests && (
                        <div className="text-xs bg-amber-50 text-amber-900 border border-amber-200/60 p-2 rounded mt-2">
                          <strong className="font-semibold">Special Requests:</strong> {b.specialRequests}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto justify-end">
                      {b.status !== "Confirmed" && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(b.id, "Confirmed")}>
                          Confirm
                        </Button>
                      )}
                      {b.status !== "Seated" && (
                        <Button variant="secondary" size="sm" onClick={() => handleStatusChange(b.id, "Seated")}>
                          Seat
                        </Button>
                      )}
                      {b.status !== "No-show" && (
                        <Button variant="ghost" size="sm" onClick={() => handleStatusChange(b.id, "No-show")}>
                          No-show
                        </Button>
                      )}
                      {b.status !== "Cancelled" && (
                        <Button variant="danger" size="sm" onClick={() => handleStatusChange(b.id, "Cancelled")}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
