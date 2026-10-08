'use client';

import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { readLocal, writeLocal } from '@/lib/persist';

type Zone = 'Window Nook' | 'Main Dining' | 'Sunny Patio';

type CafeSettings = {
  id: string;
  name: string;
  tagline: string;
  cover_image: string;
  open_time: string;
  close_time: string;
  slot_duration_mins: number;
};

type CafeTable = {
  id: string;
  name: string;
  zone_name: Zone;
  capacity: number;
  x_position: number;
  y_position: number;
};

const CAFE_KEY = 'nook-table:cafe';
const TABLES_KEY = 'nook-table:tables';
const ZONES: Zone[] = ['Window Nook', 'Main Dining', 'Sunny Patio'];
const CAPACITIES: number[] = [2, 4, 6, 8];
const SLOT_OPTIONS: number[] = [30, 45, 60];
const GRID_COLS = 6;
const GRID_ROWS = 4;

const DEFAULT_CAFE: CafeSettings = {
  id: 'cafe-1',
  name: 'The Roasted Nook',
  tagline: 'Artisan Coffee & Sunlit Small Plates',
  cover_image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
  open_time: '07:00',
  close_time: '16:00',
  slot_duration_mins: 45,
};

const DEFAULT_TABLES: CafeTable[] = [
  { id: 'tbl-1', name: 'Table 1 (Window)', zone_name: 'Window Nook', capacity: 2, x_position: 1, y_position: 1 },
  { id: 'tbl-2', name: 'Table 2 (Window)', zone_name: 'Window Nook', capacity: 2, x_position: 2, y_position: 1 },
  { id: 'tbl-3', name: 'Table 3 (Main)', zone_name: 'Main Dining', capacity: 4, x_position: 3, y_position: 2 },
  { id: 'tbl-4', name: 'Table 4 (Main)', zone_name: 'Main Dining', capacity: 6, x_position: 4, y_position: 2 },
  { id: 'tbl-5', name: 'Table 5 (Patio)', zone_name: 'Sunny Patio', capacity: 4, x_position: 5, y_position: 3 },
  { id: 'tbl-6', name: 'Table 6 (Patio)', zone_name: 'Sunny Patio', capacity: 8, x_position: 6, y_position: 4 },
];

const INPUT = 'h-10 w-full rounded-lg border border-[#E8E2D5] bg-white px-3 text-sm text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#C85A32]';
const LABEL = 'mb-1 block text-xs font-medium text-[#786C66]';

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export default function SettingsPage() {
  const [cafe, setCafe] = useState<CafeSettings>(DEFAULT_CAFE);
  const [tables, setTables] = useState<CafeTable[]>(DEFAULT_TABLES);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setCafe(readLocal<CafeSettings>(CAFE_KEY, DEFAULT_CAFE));
    setTables(readLocal<CafeTable[]>(TABLES_KEY, DEFAULT_TABLES));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeLocal(CAFE_KEY, cafe);
    writeLocal(TABLES_KEY, tables);
  }, [cafe, tables, loaded]);

  function flash(message: string) {
    setNotice(message);
    setError(null);
  }

  function fail(message: string) {
    setError(message);
    setNotice(null);
  }

  function updateCafe<K extends keyof CafeSettings>(key: K, value: CafeSettings[K]) {
    setCafe(prev => ({ ...prev, [key]: value }));
  }

  function saveCafe() {
    if (cafe.name.trim() === '') {
      fail('Cafe name is required.');
      return;
    }
    if (!cafe.open_time || !cafe.close_time) {
      fail('Opening and closing hours are required.');
      return;
    }
    if (cafe.close_time <= cafe.open_time) {
      fail('Closing hour must be after opening hour.');
      return;
    }
    flash('Cafe details saved.');
  }

  function occupiedBy(x: number, y: number, excludeId: string): CafeTable | undefined {
    return tables.find(t => t.id !== excludeId && t.x_position === x && t.y_position === y);
  }

  function commitTable(id: string, patch: Partial<CafeTable>): boolean {
    const current = tables.find(t => t.id === id);
    if (!current) return false;
    const next: CafeTable = { ...current, ...patch };
    if (next.name.trim() === '') {
      fail('Table name is required.');
      return false;
    }
    if (next.x_position < 1 || next.x_position > GRID_COLS || next.y_position < 1 || next.y_position > GRID_ROWS) {
      fail(`Grid position must stay within ${GRID_COLS} columns and ${GRID_ROWS} rows.`);
      return false;
    }
    const clash = occupiedBy(next.x_position, next.y_position, id);
    if (clash) {
      fail(`${clash.name} already occupies column ${next.x_position}, row ${next.y_position}.`);
      return false;
    }
    setTables(prev => prev.map(t => (t.id === id ? next : t)));
    setError(null);
    setNotice(null);
    return true;
  }

  function moveTable(id: string, x: number, y: number) {
    commitTable(id, { x_position: x, y_position: y });
  }

  function addTable() {
    for (let y = 1; y <= GRID_ROWS; y++) {
      for (let x = 1; x <= GRID_COLS; x++) {
        if (!occupiedBy(x, y, '')) {
          const table: CafeTable = {
            id: `tbl-${Date.now()}`,
            name: `Table ${tables.length + 1}`,
            zone_name: 'Sunny Patio',
            capacity: 4,
            x_position: x,
            y_position: y,
          };
          setTables(prev => [...prev, table]);
          flash(`${table.name} added to the floor plan.`);
          return;
        }
      }
    }
    fail('The floor plan grid is full. Move or remove a table first.');
  }

  function removeTable(id: string) {
    setTables(prev => prev.filter(t => t.id !== id));
    flash('Table removed.');
  }

  function onDragStart(e: DragEvent<HTMLButtonElement>, id: string) {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  }

  function onDropCell(e: DragEvent<HTMLDivElement>, x: number, y: number) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setDragId(null);
    if (id) moveTable(id, x, y);
  }

  return (
    <main className='min-h-screen bg-[#FDFBF7] px-4 py-8 text-[#2C221E] sm:px-8'>
      <div className='mx-auto flex max-w-6xl flex-col gap-6'>
        <header className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-xs uppercase tracking-widest text-[#786C66]'>Cafe Setup</p>
            <h1 className='font-serif text-3xl'>Settings &amp; Floor Plan</h1>
          </div>
          <div className='flex gap-2'>
            <Link href='/host'><Button variant='secondary' size='sm'>Host Stand</Button></Link>
            <Link href='/'><Button variant='outline' size='sm'>Guest Booking</Button></Link>
          </div>
        </header>

        {error ? <div role='alert' className='rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700'>{error}</div> : null}
        {notice ? <div className='rounded-lg border border-[#7A8B6E]/40 bg-[#7A8B6E]/10 px-4 py-3 text-sm text-[#4f5d45]'>{notice}</div> : null}

        <Card className='flex flex-col gap-4 bg-white/80 backdrop-blur-md'>
          <h2 className='font-serif text-xl'>Cafe Details</h2>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <label className={LABEL} htmlFor='cafe-name'>Cafe Name</label>
              <input id='cafe-name' className={INPUT} value={cafe.name} onChange={e => updateCafe('name', e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor='cafe-tagline'>Tagline</label>
              <input id='cafe-tagline' className={INPUT} value={cafe.tagline} onChange={e => updateCafe('tagline', e.target.value)} />
            </div>
            <div className='sm:col-span-2'>
              <label className={LABEL} htmlFor='cafe-cover'>Cover Image URL</label>
              <input id='cafe-cover' className={INPUT} value={cafe.cover_image} onChange={e => updateCafe('cover_image', e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor='cafe-open'>Opening Hour</label>
              <input id='cafe-open' type='time' className={INPUT} value={cafe.open_time} onChange={e => updateCafe('open_time', e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor='cafe-close'>Closing Hour</label>
              <input id='cafe-close' type='time' className={INPUT} value={cafe.close_time} onChange={e => updateCafe('close_time', e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor='cafe-slot'>Reservation Slot Duration</label>
              <select id='cafe-slot' className={INPUT} value={cafe.slot_duration_mins} onChange={e => updateCafe('slot_duration_mins', clampInt(e.target.value, 30, 60, cafe.slot_duration_mins))}>
                {SLOT_OPTIONS.map(m => (<option key={m} value={m}>{m} minutes</option>))}
              </select>
            </div>
          </div>
          <div>
            <Button variant='primary' onClick={saveCafe}>Save Cafe Details</Button>
          </div>
        </Card>

        <Card className='flex flex-col gap-4 bg-white/80 backdrop-blur-md'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='font-serif text-xl'>Visual Floor Plan</h2>
            <Button variant='primary' size='sm' onClick={addTable}>+ Add New Table</Button>
          </div>
          <p className='text-xs text-[#786C66]'>Drag a table onto any grid cell to reposition it. Two tables cannot share a cell.</p>
          <div className='grid gap-1.5' style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
            {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
              const x = (i % GRID_COLS) + 1;
              const y = Math.floor(i / GRID_COLS) + 1;
              const table = tables.find(t => t.x_position === x && t.y_position === y);
              return (
                <div
                  key={`cell-${x}-${y}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => onDropCell(e, x, y)}
                  className='flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-[#E8E2D5] bg-[#F7F4EE] p-1'
                >
                  {table ? (
                    <button
                      type='button'
                      draggable
                      onDragStart={e => onDragStart(e, table.id)}
                      onDragEnd={() => setDragId(null)}
                      title={`${table.name} - ${table.zone_name} - seats ${table.capacity}`}
                      className='flex h-full w-full cursor-grab flex-col items-center justify-center overflow-hidden rounded-md border border-[#C85A32]/40 bg-white px-1 text-center shadow-sm transition-transform hover:scale-105 active:cursor-grabbing'
                    >
                      <span className='w-full truncate text-xs font-medium'>{table.name}</span>
                      <span className='text-[10px] text-[#786C66]'>{table.capacity} seats</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        <section className='flex flex-col gap-3'>
          <h2 className='font-serif text-xl'>Tables</h2>
          {tables.length === 0 ? (
            <EmptyState
              title='No tables configured'
              message='Add your first table to start taking bookings.'
              action={<Button variant='primary' size='sm' onClick={addTable}>+ Add New Table</Button>}
            />
          ) : null}
          {tables.map(table => (
            <Card key={table.id} className='grid gap-3 bg-white/80 backdrop-blur-md sm:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] sm:items-end'>
              <div>
                <label className={LABEL} htmlFor={`name-${table.id}`}>Table Name</label>
                <input id={`name-${table.id}`} className={INPUT} value={table.name} onChange={e => commitTable(table.id, { name: e.target.value })} />
              </div>
              <div>
                <label className={LABEL} htmlFor={`zone-${table.id}`}>Zone</label>
                <select id={`zone-${table.id}`} className={INPUT} value={table.zone_name} onChange={e => commitTable(table.id, { zone_name: e.target.value === 'Window Nook' || e.target.value === 'Main Dining' || e.target.value === 'Sunny Patio' ? e.target.value : table.zone_name })}>
                  {ZONES.map(z => (<option key={z} value={z}>{z}</option>))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor={`cap-${table.id}`}>Capacity</label>
                <select id={`cap-${table.id}`} className={INPUT} value={table.capacity} onChange={e => commitTable(table.id, { capacity: clampInt(e.target.value, 1, 8, table.capacity) })}>
                  {CAPACITIES.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor={`x-${table.id}`}>X (col)</label>
                <input id={`x-${table.id}`} type='number' min={1} max={GRID_COLS} className={INPUT} value={table.x_position} onChange={e => commitTable(table.id, { x_position: clampInt(e.target.value, 1, GRID_COLS, table.x_position) })} />
              </div>
              <div>
                <label className={LABEL} htmlFor={`y-${table.id}`}>Y (row)</label>
                <input id={`y-${table.id}`} type='number' min={1} max={GRID_ROWS} className={INPUT} value={table.y_position} onChange={e => commitTable(table.id, { y_position: clampInt(e.target.value, 1, GRID_ROWS, table.y_position) })} />
              </div>
              <div className='flex items-center gap-2'>
                <Badge tone={table.zone_name === 'Sunny Patio' ? 'pass' : table.zone_name === 'Window Nook' ? 'brand' : 'neutral'}>{table.zone_name}</Badge>
                <Button variant='danger' size='sm' onClick={() => removeTable(table.id)}>Remove</Button>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
