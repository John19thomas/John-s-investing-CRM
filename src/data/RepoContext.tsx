import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Repo } from "./types";

type RepoCtx = { repo: Repo; base: "/app" | "/demo" };

const Ctx = createContext<RepoCtx | null>(null);

// One demo store per page load, so edits in demo mode persist while you click around.
let demoSingleton: Repo | null = null;

async function loadRepo(mode: "live" | "demo"): Promise<Repo> {
  if (mode === "live") return (await import("./liveRepo")).liveRepo;
  demoSingleton ??= (await import("./demoRepo")).createDemoRepo();
  return demoSingleton;
}

export function RepoProvider({ mode, children }: { mode: "live" | "demo"; children: ReactNode }) {
  const [repo, setRepo] = useState<Repo | null>(null);
  useEffect(() => {
    let alive = true;
    void loadRepo(mode).then((r) => alive && setRepo(r));
    return () => {
      alive = false;
    };
  }, [mode]);
  if (!repo || repo.mode !== mode) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
      </div>
    );
  }
  return (
    <Ctx.Provider value={{ repo, base: mode === "live" ? "/app" : "/demo" }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRepo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRepo must be used inside <RepoProvider>");
  return ctx;
}
