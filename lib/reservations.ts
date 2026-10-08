import { readLocal, writeLocal } from "@/lib/persist";

export type ReservationStatus = "confirmed" | "cancelled";

export type Reservation = {
  id: string;
  token: string;
  date: string;
  time: string;
  partySize: number;
  guestName: string;
  email: string;
  phone: string;
  status: ReservationStatus;
  createdAt: string;
};

export const RESERVATIONS_KEY = "juniper-table-reservations";
export const SERVICE_TIMES = ["5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM"];
export const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];
export const SLOT_CAPACITY = 24;

export function loadReservations(): Reservation[] {
  const value = readLocal<Reservation[]>(RESERVATIONS_KEY, []);
  return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string") : [];
}

export function saveReservations(reservations: Reservation[]): void {
  writeLocal(RESERVATIONS_KEY, reservations);
}

export function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function serviceDateOptions(days = 14): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return localDateString(date);
  });
}

export function formatServiceDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", options ?? { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function availableTimes(reservations: Reservation[], date: string, partySize: number, ignoreId?: string): string[] {
  return SERVICE_TIMES.filter((time) => {
    const booked = reservations
      .filter((reservation) => reservation.id !== ignoreId && reservation.status === "confirmed" && reservation.date === date && reservation.time === time)
      .reduce((total, reservation) => total + reservation.partySize, 0);
    return booked + partySize <= SLOT_CAPACITY;
  });
}
