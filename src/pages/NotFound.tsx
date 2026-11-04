import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-medium tracking-[0.14em] text-ink-3 uppercase">404</p>
      <h1 className="font-display text-5xl">This page doesn't exist</h1>
      <Link to="/" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">
        Go home
      </Link>
    </div>
  );
}
