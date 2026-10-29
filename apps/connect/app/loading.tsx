import { Panel } from "./_ui/parts";

/**
 * Any Connect screen while it loads: the ink band with its heading in
 * outline, and two panels, so the screen does not jump when it arrives.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="min-h-dvh">
      <div className="connect-band">
        <div className="mx-auto grid max-w-xl gap-5 px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-14">
          <div className="flex h-12 items-center justify-between">
            <span className="h-7 w-32 rounded-lg bg-white/10" />
            <span className="size-10 rounded-full bg-white/10" />
          </div>
          <div className="grid gap-2 motion-safe:animate-pulse">
            <span className="h-4 w-36 rounded bg-white/10" />
            <span className="h-8 w-56 rounded-lg bg-white/15" />
          </div>
        </div>
      </div>
      <div className="relative mx-auto -mt-9 grid max-w-xl gap-6 px-4 motion-safe:animate-pulse">
        <Panel className="grid gap-4 p-5">
          <span className="h-3 w-20 rounded bg-slate-200" />
          <span className="h-12 w-40 rounded-lg bg-slate-200" />
          <span className="h-4 w-56 rounded bg-slate-100" />
          <span className="h-4 w-48 rounded bg-slate-100" />
        </Panel>
        <Panel className="grid gap-3 p-5">
          <span className="h-4 w-full rounded bg-slate-100" />
          <span className="h-4 w-3/4 rounded bg-slate-100" />
        </Panel>
      </div>
    </div>
  );
}
