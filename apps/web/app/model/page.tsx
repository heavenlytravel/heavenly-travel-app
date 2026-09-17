import type { Metadata } from "next";
import Link from "next/link";
import { IDEAS } from "../_lib/ideas";
import {
  MODELS,
  VARIATIONS,
  formatDuration,
  formatTokens,
  type ModelKey,
  type Run,
} from "../_lib/variations";

export const metadata: Metadata = {
  title: "Model stats | Heavenly Travel",
  description:
    "Generation metadata for the Heavenly Travel landing page variations and ideas built by Claude Opus 5 and Claude Fable 5.1.",
};

type Build = {
  href: string;
  title: string;
  /** One line under the title: the seed or the idea's booking control. */
  brief: string;
  concept: string;
  model: ModelKey;
  runs: Run[];
};

const VARIATION_BUILDS: Build[] = VARIATIONS.map((v) => ({
  href: v.href,
  title: `${MODELS[v.model].name}, option ${v.option}`,
  brief: `Seed: ${v.seed}`,
  concept: v.concept,
  model: v.model,
  runs: v.runs,
}));

const IDEA_BUILDS: Build[] = IDEAS.map((idea) => ({
  href: idea.href,
  title: `Idea ${idea.option}, ${idea.name}`,
  brief: `Control: ${idea.control}`,
  concept: idea.concept,
  model: "fable",
  runs: idea.runs,
}));

function sum(runs: Run[], key: "tokens" | "toolCalls" | "durationMs") {
  if (runs.some((r) => r[key] == null)) return null;
  return runs.reduce((total, r) => total + (r[key] ?? 0), 0);
}

function BuildCard({ build }: { build: Build }) {
  const { runs } = build;
  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-semibold">
          <Link
            href={build.href}
            className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {build.title}
          </Link>
        </h3>
        <code className="text-xs text-neutral-500">{build.href}</code>
      </div>
      <p className="mt-1 text-sm text-neutral-500">{build.brief}</p>
      <p className="mt-3 text-neutral-700">{build.concept}</p>

      <table className="mt-5 w-full text-left text-sm tabular-nums">
        <caption className="sr-only">
          Generation metadata for {build.title}
        </caption>
        <thead className="text-neutral-500">
          <tr className="border-b border-neutral-200">
            <th scope="col" className="py-2 font-medium">
              Run
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Tokens
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Tool calls
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.label} className="border-b border-neutral-100">
              <th scope="row" className="py-2 font-normal">
                {run.label}
              </th>
              <td className="py-2 text-right">{formatTokens(run.tokens)}</td>
              <td className="py-2 text-right">{run.toolCalls ?? "Pending"}</td>
              <td className="py-2 text-right">
                {formatDuration(run.durationMs)}
              </td>
            </tr>
          ))}
          <tr className="font-medium">
            <th scope="row" className="py-2">
              Total
            </th>
            <td className="py-2 text-right">
              {formatTokens(sum(runs, "tokens"))}
            </td>
            <td className="py-2 text-right">
              {sum(runs, "toolCalls") ?? "Pending"}
            </td>
            <td className="py-2 text-right">
              {formatDuration(sum(runs, "durationMs"))}
            </td>
          </tr>
        </tbody>
      </table>
      {runs.map(
        (run) =>
          run.notes && (
            <p key={run.label} className="mt-3 text-xs text-neutral-600">
              {run.label}: {run.notes}
            </p>
          ),
      )}
      <p className="mt-3 text-xs text-neutral-500">
        Model ID: {MODELS[build.model].id}
      </p>
    </li>
  );
}

export default function ModelStats() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <main className="mx-auto max-w-6xl px-5 pt-16 pb-32">
        <Link
          href="/"
          className="text-sm text-neutral-500 underline-offset-4 hover:underline"
        >
          Home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Model stats
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Tokens, tool calls and time for each page, as reported by the agent
          that built it.
        </p>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Landing page variations
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Three concepts per model: two built from the same brief and
            direction seeds, and a third that mixes the first two.
          </p>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {VARIATION_BUILDS.map((build) => (
              <BuildCard key={build.href} build={build} />
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Ideas</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Four pages that replace the platform layout, each built by its own
            Claude Fable 5.1 agent from a one-page concept brief, in parallel.
          </p>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {IDEA_BUILDS.map((build) => (
              <BuildCard key={build.href} build={build} />
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
