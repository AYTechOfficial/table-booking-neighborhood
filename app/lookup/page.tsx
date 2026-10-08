"use client";

import { useState } from "react";
import { Button, Card, Badge, EmptyState } from "@/components/ui";
import { readLocal } from "@/lib/persist";
import { useRouter } from "next/navigation";

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

export default function Lookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Booking | null | "none">(null);

  function search() {
    const all = readLocal<Booking[]>("ct_bookings", []);
    const found = all.find((b) => b.ref.toLowerCase() === code.trim().toLowerCase());
    setResult(found ?? "none");
  }

  return (
    <main className="min-h-screen bg-[#FAF5EE] px-6 py-12 text-[#2E2118]">
      <div className="mx-auto max-w-md">
        <h1 className="font-[Fraunces] text-4xl">Find my booking</h1>
        <p className="mt-2 text-sm text-[#6B5D4F]">Enter the reference code from your confirmation.</p>

        <Card className="mt-6 shadow-[0_1px_2px_rgba(46,33,24,.06),0_8px_24px_rgba(46,33,24,.06)]">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="flex-1 rounded-[10px] border border-[#E8DFD2] bg-white px-3 py-2 text-sm uppercase tracking-wider outline-none focus:border-[#A8431F] focus:ring-2 focus:ring-[#A8431F]/30"
              placeholder="CT-XXXXXX"
            />
            <Button onClick={search}>Find</Button>
          </div>

          {result === "none" && (
            <div className="mt-4">
              <EmptyState title="No booking found" message="Check the code and try again." />
            </div>
          )}

          {result !== null && result !== "none" && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-[Fraunces] text-xl">{result.ref}</span>
                <Badge tone={result.status === "confirmed" ? "pass" : "warn"}>
                  {result.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#6B5D4F]">Name</p>
                  <p className="font-medium">{result.name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B5D4F]">Party</p>
                  <p className="font-medium">{result.party}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B5D4F]">Date</p>
                  <p className="font-medium">{result.date}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B5D4F]">Time</p>
                  <p className="font-medium">{result.time}</p>
                </div>
              </div>
              {result.notes && (
                <div>
                  <p className="text-xs text-[#6B5D4F]">Request</p>
                  <p className="text-sm">{result.notes}</p>
                </div>
              )}
              <Button variant="secondary" className="w-full" onClick={() => router.push("/book")}>
                Make another booking
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
