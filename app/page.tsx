"use client";

import { useState, useEffect } from "react";
import { Button, Card, Badge, EmptyState, ListRow } from "@/components/ui";
import { readLocal, writeLocal } from "@/lib/persist";

interface Restaurant {
  id: string;
  name: string;
  neighborhood: string;
  cuisine: string;
  availableTables: number;
}

interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  partySize: number;
  date: string;
  time: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
}

const INITIAL_RESTAURANTS: Restaurant[] = [
  { id: "1", name: "The Corner Bistro", neighborhood: "Downtown", cuisine: "French", availableTables: 5 },
  { id: "2", name: "Sakura Sushi Bar", neighborhood: "West End", cuisine: "Japanese", availableTables: 3 },
  { id: "3", name: "Trattoria Bella", neighborhood: "Downtown", cuisine: "Italian", availableTables: 4 },
  { id: "4", name: "El Barrio Taqueria", neighborhood: "Eastside", cuisine: "Mexican", availableTables: 6 },
  { id: "5", name: "Green Garden Cafe", neighborhood: "West End", cuisine: "Vegetarian", availableTables: 2 },
];

const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: "res-1",
    restaurantId: "1",
    restaurantName: "The Corner Bistro",
    customerName: "Alex Morgan",
    partySize: 2,
    date: "2025-05-20",
    time: "19:00",
    status: "confirmed",
    createdAt: "2025-05-01 10:00",
  },
];

export default function Home() {
  const [restaurants] = useState<Restaurant[]>(INITIAL_RESTAURANTS);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("All");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState("2025-05-21");
  const [time, setTime] = useState("18:30");

  useEffect(() => {
    const saved = readLocal<Reservation[]>("neighborhood_bookings", INITIAL_RESERVATIONS);
    setReservations(saved);
  }, []);

  const saveBookings = (updated: Reservation[]) => {
    setReservations(updated);
    writeLocal("neighborhood_bookings", updated);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant || !customerName.trim()) return;

    const newBooking: Reservation = {
      id: `res-${Date.now()}`,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      customerName: customerName.trim(),
      partySize,
      date,
      time,
      status: "confirmed",
      createdAt: new Date().toLocaleString(),
    };

    const updated = [newBooking, ...reservations];
    saveBookings(updated);

    setSelectedRestaurant(null);
    setCustomerName("");
    setPartySize(2);
  };

  const handleCancelBooking = (id: string) => {
    const updated = reservations.map((res) =>
      res.id === id ? { ...res, status: "cancelled" as const } : res
    );
    saveBookings(updated);
  };

  const neighborhoods = ["All", ...Array.from(new Set(restaurants.map((r) => r.neighborhood)))];

  const filteredRestaurants =
    selectedNeighborhood === "All"
      ? restaurants
      : restaurants.filter((r) => r.neighborhood === selectedNeighborhood);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neighborhood Table Booking</h1>
          <p className="text-sm text-white/60">Reserve tables at your favorite local dining spots</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {neighborhoods.map((nh) => (
            <Button
              key={nh}
              variant={selectedNeighborhood === nh ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedNeighborhood(nh)}
            >
              {nh}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-white/90">Available Restaurants</h2>
          <div className="grid gap-3">
            {filteredRestaurants.map((r) => (
              <Card key={r.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-white">{r.name}</h3>
                    <Badge tone="brand">{r.cuisine}</Badge>
                    <Badge tone="neutral">{r.neighborhood}</Badge>
                  </div>
                  <p className="text-xs text-white/60">
                    {r.availableTables} tables currently open for booking
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRestaurant(r)}
                >
                  Book Table
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/90">
            {selectedRestaurant ? `Book at ${selectedRestaurant.name}` : "Reservation Form"}
          </h2>
          {selectedRestaurant ? (
            <Card>
              <form onSubmit={handleCreateBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Party Size</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" variant="primary" className="flex-1">
                    Confirm Reservation
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedRestaurant(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="p-6 text-center text-white/50 text-sm">
              Select a restaurant from the list to make a reservation.
            </Card>
          )}
        </div>
      </div>

      <section className="space-y-4 pt-4 border-t border-white/10">
        <h2 className="text-lg font-semibold text-white/90">Your Reservations</h2>
        {reservations.length === 0 ? (
          <EmptyState
            title="No reservations found"
            description="Select a restaurant above to make your first booking."
          />
        ) : (
          <div className="space-y-2">
            {reservations.map((res) => (
              <ListRow
                key={res.id}
                title={`${res.restaurantName} — Party of ${res.partySize}`}
                subtitle={`Reserved for ${res.customerName} on ${res.date} at ${res.time}`}
                trailing={
                  <div className="flex items-center gap-3">
                    <Badge tone={res.status === "confirmed" ? "pass" : "bad"}>
                      {res.status}
                    </Badge>
                    {res.status === "confirmed" && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleCancelBooking(res.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
