"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteRunButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (confirming) {
    return (
      <span className="row" style={{ gap: 4 }} onClick={(e) => e.preventDefault()}>
        <button
          className="btn sm danger"
          disabled={deleting}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDeleting(true);
            try {
              await fetch(`/api/session/${runId}`, { method: "DELETE" });
              router.refresh();
            } catch {
              setDeleting(false);
              setConfirming(false);
            }
          }}
        >
          {deleting ? "..." : "confirm"}
        </button>
        <button
          className="btn sm ghost"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(false);
          }}
        >
          cancel
        </button>
      </span>
    );
  }

  return (
    <button
      className="btn sm ghost"
      style={{ fontSize: 10, padding: "2px 6px" }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirming(true);
      }}
    >
      delete
    </button>
  );
}
