"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteClassAction,
  deleteLevelAction,
  deleteSubjectAction,
  deleteTermAction,
  toggleTermActiveAction,
} from "@/lib/teacher-actions";

export function DeleteLevelBtn({ id, label }: { id: number; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteLevelAction(id);
              setConfirming(false);
              router.refresh();
            })
          }
          className="cursor-pointer rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "…" : label}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="cursor-pointer rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => setConfirming(true)}
      className="cursor-pointer text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function DeleteClassBtn({ id, label }: { id: number; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteClassAction(id);
          router.refresh();
        })
      }
      className="cursor-pointer text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function TermButtons({
  id,
  isActive,
  setActiveLabel,
  deleteLabelText,
}: {
  id: number;
  isActive: boolean;
  setActiveLabel: string;
  deleteLabelText: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="flex flex-wrap items-center gap-2">
      {!isActive && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await toggleTermActiveAction(id);
              router.refresh();
            })
          }
          className="cursor-pointer rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-500/10 dark:text-blue-300"
        >
          {setActiveLabel}
        </button>
      )}
      {confirming ? (
        <span className="inline-flex items-center gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteTermAction(id);
                setConfirming(false);
                router.refresh();
              })
            }
            className="cursor-pointer rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "…" : deleteLabelText}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="cursor-pointer rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
          >
            ×
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          className="cursor-pointer text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {deleteLabelText}
        </button>
      )}
    </span>
  );
}

export function DeleteSubjectBtn({ id, label, inUse, inUseMsg }: { id: number; label: string; inUse: boolean; inUseMsg: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending || inUse}
      title={inUse ? inUseMsg : undefined}
      onClick={() =>
        start(async () => {
          await deleteSubjectAction(id);
          router.refresh();
        })
      }
      className="cursor-pointer text-xs font-bold text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
