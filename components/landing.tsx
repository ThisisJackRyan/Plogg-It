import Link from 'next/link';

/** A few subtle accents — kept minimal so they don't compete with the hero. */
function AccentShapes() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5%" cy="30%" r="5" fill="oklch(0.62 0.2 145)" opacity="0.35" />
      <rect
        x="93%"
        y="78%"
        width="14"
        height="14"
        rx="3"
        fill="none"
        stroke="oklch(0.62 0.2 145)"
        strokeWidth="1.5"
        transform="rotate(30 1000 750)"
      />
      <circle
        cx="88%"
        cy="12%"
        r="6"
        fill="none"
        stroke="oklch(0.52 0.2 145)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Soft green atmospheric blob anchored to the right half on desktop. */
function AmbientBlobs() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="ambientBlob1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.72 0.18 145)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 145)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="1100" cy="360" rx="580" ry="500" fill="url(#ambientBlob1)" />
    </svg>
  );
}

/**
 * A concrete, map-snippet illustration: rounded card with terrain, a winding road,
 * a few pins, and labels attached to specific pins. The visual that sells the product.
 */
function MapSnippet() {
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-[380px] lg:max-w-[460px] xl:max-w-[520px]">
      {/* The map card */}
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-brand-600/15 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.3)] ring-1 ring-black/5">
        <svg
          viewBox="0 0 400 480"
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <radialGradient id="terrain1" cx="30%" cy="25%" r="40%">
              <stop offset="0%" stopColor="oklch(0.72 0.18 145)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="oklch(0.72 0.18 145)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="terrain2" cx="75%" cy="75%" r="35%">
              <stop offset="0%" stopColor="oklch(0.62 0.2 145)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="oklch(0.62 0.2 145)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Terrain patches — suggest parks/green space */}
          <ellipse cx="120" cy="110" rx="110" ry="90" fill="url(#terrain1)" />
          <ellipse cx="300" cy="360" rx="130" ry="100" fill="url(#terrain2)" />

          {/* Roads — winding paths */}
          <path
            d="M -20 140 C 80 130, 180 200, 240 180 S 360 140, 440 170"
            fill="none"
            stroke="white"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M -20 140 C 80 130, 180 200, 240 180 S 360 140, 440 170"
            fill="none"
            stroke="oklch(0.92 0.01 145)"
            strokeWidth="1"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <path
            d="M 200 -20 C 210 80, 170 180, 220 260 S 290 400, 260 500"
            fill="none"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M 60 260 C 140 270, 220 310, 320 300"
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Subtle grid specks for map texture */}
          <g fill="oklch(0.52 0.2 145)" opacity="0.15">
            <circle cx="70" cy="360" r="2" />
            <circle cx="100" cy="400" r="1.5" />
            <circle cx="340" cy="100" r="2" />
            <circle cx="360" cy="220" r="1.5" />
            <circle cx="150" cy="430" r="2" />
            <circle cx="40" cy="220" r="1.5" />
          </g>
        </svg>

        {/* Pin 1 — upper left */}
        <Pin className="absolute left-[18%] top-[22%]" />
        {/* Pin 2 — center (the "active" one) */}
        <Pin className="absolute left-[48%] top-[46%]" size="lg" pulse />
        {/* Pin 3 — lower right */}
        <Pin className="absolute left-[68%] top-[72%]" variant="cleaned" />
      </div>

      {/* Chips — anchored to specific pins with soft connector lines via positioning */}
      <div className="absolute left-[5%] top-[14%] flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md ring-1 ring-black/5">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-600"></span>
        Hotspot reported
      </div>

      <div className="absolute right-[4%] top-[40%] flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-md ring-1 ring-black/5">
        🧹 +5 pts
      </div>

      <div className="absolute bottom-[12%] left-[6%] flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md ring-1 ring-black/5">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
        Cleaned
      </div>
    </div>
  );
}

function Pin({
  className = '',
  size = 'md',
  variant = 'active',
  pulse = false,
}: {
  className?: string;
  size?: 'md' | 'lg';
  variant?: 'active' | 'cleaned';
  pulse?: boolean;
}) {
  const px = size === 'lg' ? 40 : 32;
  const fill = variant === 'cleaned' ? 'oklch(0.72 0.14 145)' : 'oklch(0.62 0.2 145)';
  const ringFill = variant === 'cleaned' ? 'oklch(0.72 0.14 145)' : 'oklch(0.62 0.2 145)';

  return (
    <div className={className}>
      <div className="relative -translate-x-1/2 -translate-y-full">
        {pulse ? (
          <span
            className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping"
            style={{ backgroundColor: ringFill, opacity: 0.4 }}
            aria-hidden
          />
        ) : null}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width={px}
          height={px}
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.2))' }}
        >
          <path
            d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 11 7.3 11.24a1 1 0 001.4 0C13 21 20 15.25 20 10c0-4.42-3.58-8-8-8z"
            fill={fill}
          />
          <circle cx="12" cy="10" r="3" fill="white" />
        </svg>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-white">
      <AccentShapes />
      <AmbientBlobs />

      {/* Top bar — wordmark + sign-in, offset for iOS dynamic island / notch */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-5 sm:px-10 sm:pt-8"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <Link
          href="/"
          className="text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl"
          aria-label="Plogg.Club home"
        >
          Plogg.Club
        </Link>
        <Link
          href="/sign-in"
          className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white shadow-md ring-1 ring-brand-700/20 transition hover:bg-brand-700/90 active:scale-95"
        >
          Sign in
        </Link>
      </div>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-24 sm:px-10 sm:pb-24 sm:pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-16 lg:pt-24 xl:gap-24">
        {/* Copy column */}
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Cleaner streets, one <span className="text-brand-600">pin</span> at a time.
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base text-gray-600 lg:mx-0 lg:text-lg">
            Drop a pin on trash. Clean it up. Earn points. A community map for spotting and
            clearing litter in your neighbourhood.
          </p>

          {/* Single primary CTA */}
          <div className="mx-auto mt-8 w-full max-w-xs lg:mx-0">
            <Link
              href="/sign-up"
              className="block rounded-full bg-brand-600 px-8 py-4 text-center text-base font-semibold text-white shadow-md transition hover:bg-brand-700 active:scale-95"
            >
              Get started
            </Link>
          </div>

          {/* Supporting flourish — definition, de-emphasized and tucked below */}
          <div className="mx-auto mt-10 max-w-xs border-l-2 border-brand-500/40 pl-4 text-left lg:mx-0">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-brand-600">
              plog·ging
            </p>
            <p className="text-xs text-gray-500">
              <span className="italic">n.</span> Picking up litter while jogging — from Swedish{' '}
              <span className="text-gray-700">plocka upp</span> + jogging. We built the club around
              it.
            </p>
          </div>
        </div>

        {/* Visual column */}
        <div className="order-1 lg:order-2">
          <MapSnippet />
        </div>
      </section>
    </main>
  );
}
