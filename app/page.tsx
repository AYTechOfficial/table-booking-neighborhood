"use client";

import { useState, useMemo, useCallback } from "react";
import { readLocal, writeLocal } from "@/lib/persist";
import { Button, Card, Badge } from "@/components/ui";

export default function Home() {
  const [count, setCount] = useState(0);

  const handleIncrement = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const memoizedValue = useMemo(() => count * 2, [count]);

  return (
    <main className="min-h-screen bg-[var(--background)] p-8">
      <Card>
        <h1 className="text-2xl font-bold text-white">Table Booking Neighborhood</h1>
        <p className="mt-2 text-white/60">Current count: {count}</p>
        <p className="mt-1 text-white/40">Memoized value: {memoizedValue}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleIncrement}>Increment</Button>
          <Badge tone="brand">Active</Badge>
        </div>
      </Card>
    </main>
  );
}
