"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";

const HOURS = [
  { day: "Monday to Thursday", open: "7:30 am", close: "4:00 pm", note: "Counter and table service" },
  { day: "Friday", open: "7:30 am", close: "9:00 pm", note: "Small plates from 5 pm" },
  { day: "Saturday", open: "8:00 am", close: "9:00 pm", note: "Brunch until 2 pm" },
  { day: "Sunday", open: "8:00 am", close: "3:00 pm", note: "Roast and records" },
];

const FACTS = [
  { label: "Seats", value: "34" },
  { label: "Table held", value: "15 min" },
  { label: "Roaster", value: "Alder & Ash" },
];

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    alt: "A flat white in a stoneware cup on a saucer beside an open notebook",
  },
  {
    src: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
    alt: "Almond croissants cooling on a wire rack in the CornerTable kitchen",
  },
  {
    src: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=900&q=80",
    alt: "Two guests talking across a small round table by the window",
  },
];

const TICKET_ROWS = [
  { label: "Service", value: "Thu to Sat, 6:00 pm" },
  { label: "Counter", value: "6 stools" },
  { label: "Held for", value: "15 minutes" },
  { label: "Reference", value: "NC-XXXXXX" },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className='ct-body min-h-screen overflow-x-hidden bg-[#faf9f7] text-[#1a1d21]'>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .ct-body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
        .ct-display { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; font-optical-sizing: auto; letter-spacing: -0.01em; }
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      <a
        href='#main'
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#1a1d21] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[#faf9f7]'
      >
        Skip to content
      </a>

      <header className='sticky top-0 z-30 border-b border-[#e7e3dc] bg-[#faf9f7]/90 backdrop-blur'>
        <div className='mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6'>
          <Link
            href='/'
            className='flex items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
          >
            <span className='ct-display grid h-9 w-9 place-items-center rounded-full bg-[#1a1d21] text-lg font-semibold text-[#faf9f7]'>
              C
            </span>
            <span className='ct-display hidden text-lg font-semibold sm:inline'>CornerTable</span>
          </Link>
          <nav aria-label='Main' className='flex items-center gap-0.5 sm:gap-1'>
            <Link
              href='/book'
              className='rounded-full px-3 py-2 text-sm font-medium text-[#1a1d21] hover:bg-[#efece6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
            >
              Book
            </Link>
            <Link
              href='/lookup'
              className='rounded-full px-3 py-2 text-sm font-medium text-[#1a1d21] hover:bg-[#efece6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
            >
              Lookup
            </Link>
            <Link
              href='/manage'
              className='rounded-full px-3 py-2 text-sm font-medium text-[#1a1d21] hover:bg-[#efece6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
            >
              Diary
            </Link>
          </nav>
        </div>
      </header>

      <main id='main'>
        <section className='mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-14'>
          <div className='grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12'>
            <div>
              <Badge tone='neutral'>Neighborhood cafe · Alder and 4th</Badge>
              <h1 className='ct-display mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl'>
                A corner table, kept warm for you.
              </h1>
              <p className='mt-5 max-w-xl text-base leading-relaxed text-[#4a4f57] sm:text-lg'>
                CornerTable is a 34-seat cafe on the corner of Alder and 4th. Reserve a table in under a
                minute, or look up a booking you already made. We hold every table for 15 minutes past
                the booked time.
              </p>

              <div className='mt-7 flex flex-col gap-3 sm:flex-row'>
                <Button variant='primary' size='lg' onClick={() => router.push("/book")}>
                  Reserve a table
                </Button>
                <Button variant='outline' size='lg' onClick={() => router.push("/lookup")}>
                  Find my booking
                </Button>
              </div>

              <dl className='mt-9 grid grid-cols-3 gap-4 border-t border-[#e7e3dc] pt-6'>
                {FACTS.map((fact) => (
                  <div key={fact.label}>
                    <dt className='text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7078]'>
                      {fact.label}
                    </dt>
                    <dd className='ct-display mt-1 text-xl font-semibold'>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className='relative'>
              <div className='overflow-hidden rounded-[28px] border border-[#e7e3dc] bg-white shadow-[0_30px_60px_-30px_rgba(26,29,33,0.45)]'>
                <img
                  src='https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'
                  alt='Sunlit CornerTable dining room with walnut tables and bentwood chairs'
                  className='h-64 w-full object-cover sm:h-80 lg:h-[420px]'
                />
              </div>
              <div className='absolute -bottom-6 -left-2 hidden w-40 overflow-hidden rounded-2xl border-4 border-[#faf9f7] shadow-lg sm:block lg:w-48'>
                <img
                  src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80'
                  alt='A flat white in a stoneware cup resting on the CornerTable counter'
                  className='h-28 w-full object-cover lg:h-32'
                />
              </div>
            </div>
          </div>
        </section>

        <section className='mx-auto max-w-6xl px-4 pb-6 sm:px-6'>
          <Card className='relative overflow-hidden rounded-3xl border border-[#e7e3dc] bg-white p-0 shadow-[0_24px_50px_-32px_rgba(26,29,33,0.5)]'>
            <div className='grid sm:grid-cols-[1.4fr_1fr]'>
              <div className='p-6 sm:p-8'>
                <Badge tone='brand'>Tonight at the counter</Badge>
                <h2 className='ct-display mt-3 text-2xl sm:text-3xl'>
                  Six stools, one long walnut counter, no rush.
                </h2>
                <p className='mt-3 max-w-lg text-sm leading-relaxed text-[#4a4f57] sm:text-base'>
                  Our chef counter runs Thursday to Saturday from 6 pm. Take a single stool and watch
                  the pass, or book the whole counter for six. Small plates change weekly with whatever
                  the Alder Street market has that morning.
                </p>
                <div className='mt-6 flex flex-wrap gap-3'>
                  <Button variant='primary' onClick={() => router.push("/book")}>
                    Reserve the counter
                  </Button>
                  <Button variant='ghost' onClick={() => router.push("/lookup")}>
                    I already booked
                  </Button>
                </div>
              </div>

              <div className='relative border-t border-dashed border-[#d9d3c8] bg-[#fbfaf8] p-6 sm:border-l sm:border-t-0 sm:p-8'>
                <span
                  aria-hidden='true'
                  className='absolute -left-2.5 -top-2.5 hidden h-5 w-5 rounded-full bg-[#faf9f7] sm:block'
                />
                <span
                  aria-hidden='true'
                  className='absolute -bottom-2.5 -left-2.5 hidden h-5 w-5 rounded-full bg-[#faf9f7] sm:block'
                />
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7078]'>
                  Table ticket
                </p>
                <dl className='mt-4 space-y-3 text-sm'>
                  {TICKET_ROWS.map((row) => (
                    <div key={row.label} className='flex items-baseline justify-between gap-4'>
                      <dt className='text-[#6b7078]'>{row.label}</dt>
                      <dd className='font-medium tabular-nums'>{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className='mt-5 text-xs leading-relaxed text-[#6b7078]'>
                  Your reference is issued the moment a booking is confirmed. Bring it to the host
                  stand, or cancel it yourself from the lookup page.
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className='mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20'>
          <div className='grid items-center gap-10 lg:grid-cols-2'>
            <div className='order-2 lg:order-1'>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#2f6bd8]'>
                Our story
              </p>
              <h2 className='ct-display mt-3 text-3xl sm:text-4xl'>
                Nine seats on Alder Street, and a very stubborn espresso machine.
              </h2>
              <div className='mt-5 space-y-4 text-base leading-relaxed text-[#4a4f57]'>
                <p>
                  CornerTable opened in 2016 with nine seats, a secondhand lever machine and a
                  hand-written menu taped to the window. The machine still runs. The menu is still
                  hand-written, though it now changes every week.
                </p>
                <p>
                  We bake in the back before the neighborhood wakes up, roast with Alder and Ash two
                  blocks over, and keep the front room quiet enough to read in until the evening
                  service starts. Regulars get the corner banquette; everyone else gets a warm table
                  and a proper cup.
                </p>
              </div>
              <div className='mt-6 flex flex-wrap gap-2'>
                <Badge tone='neutral'>Single origin espresso</Badge>
                <Badge tone='neutral'>Baked in house</Badge>
                <Badge tone='neutral'>Dog friendly patio</Badge>
              </div>
            </div>
            <div className='order-1 lg:order-2'>
              <div className='overflow-hidden rounded-[28px] border border-[#e7e3dc] bg-white shadow-[0_24px_50px_-32px_rgba(26,29,33,0.4)]'>
                <img
                  src='https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1100&q=80'
                  alt='Barista pulling a shot behind the CornerTable espresso bar'
                  className='h-64 w-full object-cover sm:h-80 lg:h-[380px]'
                />
              </div>
            </div>
          </div>
        </section>

        <section className='border-y border-[#e7e3dc] bg-white'>
          <div className='mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20'>
            <div className='grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#2f6bd8]'>
                  Hours and visiting
                </p>
                <h2 className='ct-display mt-3 text-3xl sm:text-4xl'>
                  Open early, closed before the neighborhood gets loud.
                </h2>
                <p className='mt-4 text-base leading-relaxed text-[#4a4f57]'>
                  Walk-ins are always welcome, but weekend brunch fills fast. Bookings open 14 days
                  ahead and every slot shows how many seats are still free.
                </p>
                <address className='mt-6 not-italic text-sm leading-relaxed text-[#4a4f57]'>
                  <span className='block font-medium text-[#1a1d21]'>214 Alder Street</span>
                  Corner of 4th, Portland OR
                  <a
                    href='tel:+15035550142'
                    className='mt-2 block font-medium text-[#2f6bd8] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
                  >
                    (503) 555-0142
                  </a>
                </address>
                <div className='mt-6 flex flex-wrap gap-3'>
                  <Button variant='primary' onClick={() => router.push("/book")}>
                    Reserve a table
                  </Button>
                  <Button variant='outline' onClick={() => router.push("/manage/settings")}>
                    Service settings
                  </Button>
                </div>
              </div>

              <ul className='space-y-3'>
                {HOURS.map((entry) => (
                  <li key={entry.day}>
                    <Card className='flex flex-col gap-1 rounded-2xl border border-[#e7e3dc] bg-[#faf9f7] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                      <div>
                        <p className='font-medium'>{entry.day}</p>
                        <p className='text-sm text-[#6b7078]'>{entry.note}</p>
                      </div>
                      <p className='text-sm font-medium tabular-nums sm:text-right'>
                        {entry.open} to {entry.close}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className='mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20'>
          <div className='flex flex-wrap items-end justify-between gap-4'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#2f6bd8]'>
                Inside the room
              </p>
              <h2 className='ct-display mt-3 text-3xl sm:text-4xl'>
                Warm light, worn tables, good noise.
              </h2>
            </div>
            <Button variant='outline' onClick={() => router.push("/book")}>
              Reserve a table
            </Button>
          </div>
          <div className='mt-8 grid gap-4 sm:grid-cols-3'>
            {GALLERY.map((shot) => (
              <figure
                key={shot.src}
                className='overflow-hidden rounded-2xl border border-[#e7e3dc] bg-white'
              >
                <img
                  src={shot.src}
                  alt={shot.alt}
                  loading='lazy'
                  className='h-48 w-full object-cover sm:h-56'
                />
              </figure>
            ))}
          </div>
        </section>

        <section className='mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24'>
          <div className='relative overflow-hidden rounded-3xl bg-[#1a1d21] px-6 py-10 text-[#faf9f7] sm:px-10 sm:py-14'>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#4f8cff]/25 blur-2xl'
            />
            <div className='relative max-w-2xl'>
              <h2 className='ct-display text-3xl sm:text-4xl'>
                Pick a time. We will keep the table warm.
              </h2>
              <p className='mt-4 text-base leading-relaxed text-[#d7d5d0]'>
                Choose a party size, a date in the next 14 days and a slot inside service hours. You
                get a reference code straight away, and you can cancel it yourself if plans change.
              </p>
              <div className='mt-7 flex flex-col gap-3 sm:flex-row'>
                <Button variant='primary' size='lg' onClick={() => router.push("/book")}>
                  Reserve a table
                </Button>
                <Button variant='secondary' size='lg' onClick={() => router.push("/lookup")}>
                  Look up a booking
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className='border-t border-[#e7e3dc] bg-white'>
        <div className='mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3'>
          <div>
            <p className='ct-display text-lg font-semibold'>CornerTable</p>
            <p className='mt-2 max-w-xs text-sm leading-relaxed text-[#4a4f57]'>
              A neighborhood cafe on Alder and 4th. Bookings live in this browser only, so export the
              diary from the owner view if you need a copy.
            </p>
          </div>
          <nav aria-label='Guest links' className='text-sm'>
            <p className='font-semibold'>Guests</p>
            <ul className='mt-3 space-y-2'>
              <li>
                <Link
                  href='/book'
                  className='text-[#2f6bd8] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
                >
                  Reserve a table
                </Link>
              </li>
              <li>
                <Link
                  href='/lookup'
                  className='text-[#2f6bd8] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
                >
                  Find or cancel a booking
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label='Owner links' className='text-sm'>
            <p className='font-semibold'>Owner</p>
            <ul className='mt-3 space-y-2'>
              <li>
                <Link
                  href='/manage'
                  className='text-[#2f6bd8] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
                >
                  Digital diary
                </Link>
              </li>
              <li>
                <Link
                  href='/manage/settings'
                  className='text-[#2f6bd8] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8cff]'
                >
                  Service settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className='border-t border-[#e7e3dc] px-4 py-5 text-center text-xs text-[#6b7078] sm:px-6'>
          CornerTable · 214 Alder Street, Portland OR · Open seven days
        </div>
      </footer>
    </div>
  );
}
