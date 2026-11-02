"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteClassAction,
  deleteLevelAction,
  deleteSubjectAction,
  deleteTermAction,
  toggleTermActiveAction,
} from "@/lib/teacher-actions";

export function DeleteLevelBtn({ id, label }: { id: number; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this grade level and its classes?")) return;
        start(async () => {
          await deleteLevelAction(id);
          router.refresh();
        });
      }}
      className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
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
      className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
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
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="flex items-center gap-2">
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
          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-500/10 dark:text-blue-300"
        >
          {setActiveLabel}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this term?")) return;
          start(async () => {
            await deleteTermAction(id);
            router.refresh();
          });
        }}
        className="text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
      >
        {deleteLabelText}
      </button>
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
      className="text-xs font-bold text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
