"use client";

import PageHeader from "@/components/PageHeader";
import { useState } from "react";

type Step = "before" | "after" | "verifying" | "result";

export default function NewCleanupPage() {
  const [step, setStep] = useState<Step>("before");

  return (
    <>
      <PageHeader
        title="Cleanup"
        subtitle={
          step === "before"
            ? "Take a before photo"
            : step === "after"
              ? "Now take an after photo"
              : step === "verifying"
                ? "AI is verifying your cleanup…"
                : "Nice work!"
        }
      />
      <div className="mx-auto max-w-md px-5 py-6">
        {step === "before" && (
          <PhotoSlot label="Before photo" onCapture={() => setStep("after")} />
        )}
        {step === "after" && (
          <PhotoSlot label="After photo" onCapture={() => setStep("verifying")} />
        )}
        {step === "verifying" && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-brand" />
            <p className="text-sm text-neutral-600">
              Checking photos with Claude…
            </p>
            <button
              type="button"
              onClick={() => setStep("result")}
              className="mt-6 text-xs text-neutral-400 underline"
            >
              (demo: skip to results)
            </button>
          </div>
        )}
        {step === "result" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-brand">Verified ✓</p>
              <p className="mt-2 text-4xl font-bold">+120 pts</p>
              <p className="mt-1 text-sm text-neutral-600">
                3 bottles, 2 wrappers, 1 can
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep("before")}
              className="w-full rounded-xl border border-neutral-300 py-3 font-medium text-neutral-800 transition hover:bg-neutral-100"
            >
              Start another cleanup
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PhotoSlot({
  label,
  onCapture,
}: {
  label: string;
  onCapture: () => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-medium">{label}</p>
      <div className="mb-4 flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400">
        camera placeholder
      </div>
      <button
        type="button"
        onClick={onCapture}
        className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark"
      >
        Capture
      </button>
    </div>
  );
}
