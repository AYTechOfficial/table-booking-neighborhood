"use client";

import { readLocal, writeLocal } from '@/lib/persist';
import { redirect } from 'next/navigation';
import { Fragment, useState } from 'react';

type Step = 'party' | 'date' | 'time' | 'details';
type Booking = {
  partySize: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  name: string;
  email: string;
  notes: string;
};

export default function BookPage() {
  const [step, setStep] = useState<Step>('party');
  const [booking, setBooking] = useState<Booking>({
    partySize: 2,
    date: '',
    time: '',
    name: '',
    email: '',
    notes: '',
  });

  const handleNext = () => {
    const steps: Step[] = ['party', 'date', 'time', 'details'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
    } else {
      // Submit
      writeLocal('lastBooking', booking);
      redirect('/confirmation');
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['party', 'date', 'time', 'details'];
    const idx = steps.indexOf(step);
    if (idx > 0) {
      setStep(steps[idx - 1]);
    }
  };

  const updateBooking = <K extends keyof Booking>(key: K, value: Booking[K]) => {
    setBooking((prev) => ({ ...prev, [key]: value }));
  };

  const lastBooking = readLocal<Booking | null>('lastBooking', null);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Book a Table</h1>

      <div className="flex justify-between mb-8">
        {(['party', 'date', 'time', 'details'] as const).map((s) => (
          <Fragment key={s}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step === s
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {['1', '2', '3', '4'][(['party', 'date', 'time', 'details'] as const).indexOf(s)]}
              </div>
              <span className="mt-2 text-xs capitalize">{s}</span>
            </div>
            {s !== 'details' && (
              <div className="flex-1 h-px bg-gray-800 mt-4 mx-2" />
            )}
          </Fragment>
        ))}
      </div>

      {step === 'party' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Party Size</h2>
          <div className="flex gap-2">
            {[2, 4, 6, 8].map((size) => (
              <button
                key={size}
                className={`px-4 py-2 rounded-lg border ${
                  booking.partySize === size
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700'
                }`}
                onClick={() => updateBooking('partySize', size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'date' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Date</h2>
          <input
            type="date"
            className="w-full p-2 rounded-lg border border-gray-700 bg-gray-900"
            value={booking.date}
            onChange={(e) => updateBooking('date', e.target.value)}
          />
        </div>
      )}

      {step === 'time' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Time</h2>
          <div className="grid grid-cols-3 gap-2">
            {['18:00', '19:00', '20:00', '21:00'].map((t) => (
              <button
                key={t}
                className={`p-2 rounded-lg border ${
                  booking.time === t
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700'
                }`}
                onClick={() => updateBooking('time', t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Your Details</h2>
          <input
            type="text"
            placeholder="Name"
            className="w-full p-2 rounded-lg border border-gray-700 bg-gray-900"
            value={booking.name}
            onChange={(e) => updateBooking('name', e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 rounded-lg border border-gray-700 bg-gray-900"
            value={booking.email}
            onChange={(e) => updateBooking('email', e.target.value)}
          />
          <textarea
            placeholder="Notes (optional)"
            className="w-full p-2 rounded-lg border border-gray-700 bg-gray-900"
            rows={3}
            value={booking.notes}
            onChange={(e) => updateBooking('notes', e.target.value)}
          />
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          className="px-4 py-2 rounded-lg border border-gray-700 disabled:opacity-30"
          onClick={handleBack}
          disabled={step === 'party'}
        >
          Back
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-blue-500 text-white"
          onClick={handleNext}
        >
          {step === 'details' ? 'Confirm Booking' : 'Next'}
        </button>
      </div>

      {lastBooking && (
        <div className="mt-8 p-4 border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">Last booking: {lastBooking.partySize} people on {lastBooking.date} at {lastBooking.time}</p>
        </div>
      )}
    </div>
  );
}
