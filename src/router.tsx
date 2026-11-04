import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { RequireAuth } from "@/auth/AuthContext";
import { RepoProvider } from "@/data/RepoContext";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";

// The landing page ships on its own; the dashboard (charts, data layer) loads on demand.
const AppShell = lazy(() => import("@/components/app/AppShell"));
const IndiaPage = lazy(() => import("@/pages/IndiaPage"));
const RevolutPage = lazy(() => import("@/pages/RevolutPage"));
const PrivatePage = lazy(() => import("@/pages/PrivatePage"));
const HoldingPage = lazy(() => import("@/pages/HoldingPage"));
const KiteCallback = lazy(() => import("@/pages/KiteCallback"));
const Login = lazy(() => import("@/pages/Login"));

function Loading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="size-5 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
    </div>
  );
}

const page = (node: ReactNode) => <Suspense fallback={<Loading />}>{node}</Suspense>;

const sections = [
  { index: true, element: <Navigate to="india" replace /> },
  { path: "india", element: page(<IndiaPage />) },
  { path: "revolut", element: page(<RevolutPage />) },
  { path: "private", element: <Navigate to="global" replace /> },
  { path: "private/:region", element: page(<PrivatePage />) },
  { path: "holding/:symbol", element: page(<HoldingPage />) },
];

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: page(<Login />) },
  {
    path: "/app",
    element: (
      <RequireAuth>
        <RepoProvider mode="live">{page(<AppShell />)}</RepoProvider>
      </RequireAuth>
    ),
    children: sections,
  },
  {
    path: "/demo",
    element: <RepoProvider mode="demo">{page(<AppShell />)}</RepoProvider>,
    children: sections,
  },
  {
    path: "/kite/callback",
    element: (
      <RequireAuth>
        <RepoProvider mode="live">{page(<KiteCallback />)}</RepoProvider>
      </RequireAuth>
    ),
  },
  { path: "*", element: <NotFound /> },
]);
