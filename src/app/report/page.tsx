"use client";

import PageHeader from "@/components/PageHeader";
import { useState } from "react";

export default function ReportPage() {
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <PageHeader
        title="Report a hotspot"
        subtitle="Help others find trash to pick up"
      />
      <div className="mx-auto max-w-md px-5 py-6">
        {submitted ? (
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5 text-center">
            <p className="font-medium text-brand">Thanks! Pin submitted.</p>
            <p className="mt-2 text-xs text-neutral-500">
              (Placeholder — writes to Supabase in phase 4.)
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400">
              location + photo capture (phase 4)
            </div>
            <label className="block">
              <span className="text-sm font-medium">What&apos;s there?</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                placeholder="e.g. pile of bottles behind the bench"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">
                Difficulty: {difficulty}/5
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="mt-2 w-full accent-brand"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Submit hotspot
            </button>
          </form>
        )}
      </div>
    </>
  );
}
