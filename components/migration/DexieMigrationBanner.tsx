"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { fitnessKeys } from "@/hooks/useFitnessState";
import {
  findMigrationCandidate,
  runMigration,
  writeMigrationState,
  type MigrationProgress,
  type MigrationResult,
} from "@/lib/migration/migrateFromDexie";
import type { DexieSnapshot } from "@/lib/migration/dexieSnapshot";
import { Button } from "@/components/ui/button";

export function DexieMigrationBanner() {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const [candidate, setCandidate] = useState<DexieSnapshot | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    void findMigrationCandidate().then((snap) => {
      if (!cancelled) setCandidate(snap);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!user || !candidate || result?.errors.length === 0) {
    return null;
  }

  const count =
    candidate.dailyLogs.length +
    candidate.weightEntries.length +
    candidate.goalPlans.length;

  async function handleImport() {
    if (!user || !candidate) return;
    setBusy(true);
    try {
      const r = await runMigration(user.id, candidate, setProgress);
      setResult(r);
      if (r.errors.length === 0) {
        qc.invalidateQueries({ queryKey: fitnessKeys.all(user.id) });
        // Sakrij banner za 2s pa ukloni
        setTimeout(() => setCandidate(null), 2_000);
      }
    } catch {
      // Errors uhvaćeni unutar runMigration. Bilo šta neočekivano — ignorišemo.
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    writeMigrationState({ status: "dismissed" });
    setCandidate(null);
  }

  return (
    <div className="m-4 rounded-[var(--rounded-md)] border border-mint-border bg-mint/10 p-4 shadow-sm">
      <p className="font-heading-md text-ink">Imamo lokalne podatke</p>
      <p className="mt-1 text-sm text-charcoal">
        Pronašli smo {count} stavki dnevnika i težine na ovom uređaju. Želiš li
        da ih prebacimo u tvoj novi nalog?
      </p>

      {result?.errors.length ? (
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium text-purple">
            Migracija je djelomično uspjela. Greške:
          </p>
          <ul className="list-disc pl-5 text-xs text-purple">
            {result.errors.slice(0, 5).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {result.errors.length > 5 ? <li>… i još {result.errors.length - 5}</li> : null}
          </ul>
        </div>
      ) : null}

      {progress && busy ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-mint">
          <Loader2 className="size-4 animate-spin" />
          {progress.step} · {progress.done}/{progress.total}
        </p>
      ) : null}

      {result && !result.errors.length ? (
        <p className="mt-3 text-sm text-mint">
          Prebacili smo {result.uploaded.dailyLogs} dana, {result.uploaded.weightEntries}{" "}
          težina i {result.uploaded.goalPlans} planova.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleImport()}>
            Uvezi u nalog
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={handleDismiss}>
            Preskoči
          </Button>
        </div>
      )}
    </div>
  );
}
