import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createWeddingDraft,
  getPersonHints,
  getWedding,
  searchPeople,
  updateLineage,
  updateWeddingMeta,
  WeddingLineageDto,
  WeddingLineageSlotDto,
  WeddingRole,
  type WeddingRoleValue,
} from "../api";
import type { PersonSummaryDto } from "../api";

type SlotDraft = {
  role: WeddingRoleValue;
  personId: number | null;
  displayName: string;
  label: string;
  hasConflict: boolean;
};

function slotFromDto(s: WeddingLineageSlotDto): SlotDraft {
  return {
    role: s.role,
    personId: s.personId,
    displayName: s.displayName,
    label: s.label,
    hasConflict: s.hasConflict,
  };
}

function applyHintsToSlots(prev: SlotDraft[], role: WeddingRoleValue, hints: Awaited<ReturnType<typeof getPersonHints>>): SlotDraft[] {
  const next = prev.map((s) => ({ ...s }));
  const setSlot = (r: WeddingRoleValue, pid: number | null, name: string) => {
    const i = next.findIndex((x) => x.role === r);
    if (i < 0) return;
    next[i] = { ...next[i], personId: pid, displayName: name };
  };

  if (role === WeddingRole.Groom) {
    if (hints.father) setSlot(WeddingRole.FatherOfGroom, hints.father.id, hints.father.fullName);
    if (hints.mother) setSlot(WeddingRole.MotherOfGroom, hints.mother.id, hints.mother.fullName);
  } else if (role === WeddingRole.FatherOfGroom) {
    if (hints.father) setSlot(WeddingRole.PaternalGrandfatherGroom, hints.father.id, hints.father.fullName);
    if (hints.mother) setSlot(WeddingRole.PaternalGrandmotherGroom, hints.mother.id, hints.mother.fullName);
  } else if (role === WeddingRole.MotherOfGroom) {
    if (hints.father) setSlot(WeddingRole.MaternalGrandfatherGroom, hints.father.id, hints.father.fullName);
    if (hints.mother) setSlot(WeddingRole.MaternalGrandmotherGroom, hints.mother.id, hints.mother.fullName);
  } else if (role === WeddingRole.Bride) {
    if (hints.father) setSlot(WeddingRole.FatherOfBride, hints.father.id, hints.father.fullName);
    if (hints.mother) setSlot(WeddingRole.MotherOfBride, hints.mother.id, hints.mother.fullName);
  } else if (role === WeddingRole.FatherOfBride) {
    if (hints.father) setSlot(WeddingRole.PaternalGrandfatherBride, hints.father.id, hints.father.fullName);
    if (hints.mother) setSlot(WeddingRole.PaternalGrandmotherBride, hints.mother.id, hints.mother.fullName);
  } else if (role === WeddingRole.MotherOfBride) {
    if (hints.father) setSlot(WeddingRole.MaternalGrandfatherBride, hints.father.id, hints.father.fullName);
    if (hints.mother) setSlot(WeddingRole.MaternalGrandmotherBride, hints.mother.id, hints.mother.fullName);
  }

  return next;
}

function TreeCard(props: {
  slot: SlotDraft;
  side: "groom" | "bride";
  query: string;
  suggestions: PersonSummaryDto[];
  suggestOpen: boolean;
  onQueryChange: (role: WeddingRoleValue, q: string) => void;
  onPickPerson: (role: WeddingRoleValue, p: PersonSummaryDto) => void;
  onFocus: (role: WeddingRoleValue) => void;
  onBlur: () => void;
}) {
  const { slot, side, query, suggestions, suggestOpen } = props;
  const showName = slot.displayName.trim() || "Empty";
  const accent = side === "groom" ? "var(--groom)" : "var(--bride)";

  return (
    <div className={`tree-card ${side}`} style={{ borderBottomColor: accent }}>
      <div className="tree-card__iconRow">
        <span className="tree-card__personIcon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
              fill="currentColor"
            />
          </svg>
        </span>
        {slot.hasConflict ? (
          <span className="tree-card__warn" title="Same person appears in more than one role for this wedding.">
            !
          </span>
        ) : null}
      </div>
      <div className="tree-card__role">{slot.label}</div>
      <div className="tree-card__edit">
        <label className="sr-only" htmlFor={`name-${slot.role}`}>
          Name for {slot.label}
        </label>
        <span className="tree-card__pencil" aria-hidden>
          ✎
        </span>
        <div className="tree-card__autocomplete">
          <input
            id={`name-${slot.role}`}
            className="tree-card__input"
            value={query}
            placeholder={showName}
            onChange={(e) => props.onQueryChange(slot.role, e.target.value)}
            onFocus={() => props.onFocus(slot.role)}
            onBlur={() => {
              window.setTimeout(() => props.onBlur(), 120);
            }}
            autoComplete="off"
          />
          {suggestOpen && suggestions.length > 0 ? (
            <ul className="tree-card__suggestions" role="listbox">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button type="button" className="tree-card__suggestBtn" onMouseDown={() => props.onPickPerson(slot.role, p)}>
                    {p.fullName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function NewWeddingPage() {
  const [params, setParams] = useSearchParams();
  const [bootKey, setBootKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wedding, setWedding] = useState<WeddingLineageDto | null>(null);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [groomFamily, setGroomFamily] = useState("");
  const [brideFamily, setBrideFamily] = useState("");
  const [weddingDate, setWeddingDate] = useState("");

  const [activeRole, setActiveRole] = useState<WeddingRoleValue | null>(null);
  const [queries, setQueries] = useState<Record<number, string>>({});
  const [suggestions, setSuggestions] = useState<Record<number, PersonSummaryDto[]>>({});

  const slotByRole = useMemo(() => new Map(slots.map((s) => [s.role, s])), [slots]);
  const previewTitle = useMemo(
    () => `${groomFamily.trim()} - ${brideFamily.trim()} - ${weddingDate}`,
    [groomFamily, brideFamily, weddingDate],
  );

  const load = useCallback(async (id: number) => {
    setError(null);
    const dto = await getWedding(id);
    setWedding(dto);
    setSlots(dto.slots.map(slotFromDto));
    setGroomFamily(dto.groomFamilyName);
    setBrideFamily(dto.brideFamilyName);
    setWeddingDate(dto.weddingDate);
    const q: Record<number, string> = {};
    for (const s of dto.slots) q[s.role] = s.displayName;
    setQueries(q);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const idParam = params.get("id");
        if (idParam) {
          await load(Number(idParam));
        } else {
          const created = await createWeddingDraft();
          if (cancelled) return;
          setParams({ id: String(created.id) }, { replace: true });
          setWedding(created);
          setSlots(created.slots.map(slotFromDto));
          setGroomFamily(created.groomFamilyName);
          setBrideFamily(created.brideFamilyName);
          setWeddingDate(created.weddingDate);
          const q: Record<number, string> = {};
          for (const s of created.slots) q[s.role] = s.displayName;
          setQueries(q);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load wedding.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, params, setParams, bootKey]);

  useEffect(() => {
    if (activeRole === null) return;
    const q = (queries[activeRole] ?? "").trim();
    if (q.length < 2) {
      setSuggestions((s) => ({ ...s, [activeRole]: [] }));
      return;
    }
    const handle = window.setTimeout(() => {
      searchPeople(q)
        .then((rows) => {
          setSuggestions((s) => ({ ...s, [activeRole!]: rows }));
        })
        .catch(() => {
          setSuggestions((s) => ({ ...s, [activeRole!]: [] }));
        });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [activeRole, queries]);

  const persistMeta = async () => {
    if (!wedding) return;
    const dto = await updateWeddingMeta(wedding.id, {
      groomFamilyName: groomFamily,
      brideFamilyName: brideFamily,
      weddingDate,
    });
    setWedding(dto);
  };

  const persistLineage = async (nextSlots: SlotDraft[]) => {
    if (!wedding) return;
    const dto = await updateLineage(
      wedding.id,
      nextSlots.map((s) => ({ role: s.role, personId: s.personId, displayName: s.displayName })),
    );
    setWedding(dto);
    setSlots(dto.slots.map(slotFromDto));
    setQueries((prev) => {
      const n = { ...prev };
      for (const s of dto.slots) n[s.role] = s.displayName;
      return n;
    });
  };

  const onPickPerson = async (role: WeddingRoleValue, p: PersonSummaryDto) => {
    const name = p.fullName;
    setQueries((q) => ({ ...q, [role]: name }));
    let next = slots.map((s) => (s.role === role ? { ...s, personId: p.id, displayName: name } : { ...s }));
    try {
      const hints = await getPersonHints(p.id);
      next = applyHintsToSlots(next, role, hints);
      setQueries((q) => {
        const n = { ...q, [role]: name };
        for (const s of next) n[s.role] = s.displayName;
        return n;
      });
    } catch {
      /* hints optional */
    }
    setSlots(next);
    setSuggestions((s) => ({ ...s, [role]: [] }));
    setActiveRole(null);
    await persistLineage(next);
  };

  const onManualBlurCommit = async (role: WeddingRoleValue) => {
    const name = (queries[role] ?? "").trim();
    const next = slots.map((s) => (s.role === role ? { ...s, displayName: name, personId: null } : { ...s }));
    setSlots(next);
    await persistLineage(next);
  };

  const handleSave = async () => {
    try {
      await persistMeta();
      await persistLineage(slots);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const handleReset = async () => {
    if (!wedding) return;
    setError(null);
    await load(wedding.id);
  };

  const groomMain = slotByRole.get(WeddingRole.Groom);
  const brideMain = slotByRole.get(WeddingRole.Bride);

  if (loading && !error) {
    return (
      <div className="shell">
        <aside className="sidebar" />
        <main className="main">
          <div className="muted">Loading…</div>
        </main>
      </div>
    );
  }

  if (error && !wedding) {
    return (
      <div className="shell">
        <aside className="sidebar" />
        <main className="main">
          <div className="banner banner--error">{error}</div>
          <p className="muted" style={{ marginTop: 12 }}>
            Start the API from Visual Studio or run{" "}
            <code style={{ fontSize: "0.95em" }}>dotnet run</code> in the <code>backend</code> folder (default{" "}
            <code>http://localhost:5280</code>). Then open{" "}
            <a href="http://localhost:5280/api/health/db">/api/health/db</a> and confirm <code>connected</code> is{" "}
            <code>true</code>.
          </p>
          <button type="button" className="btn btn--primary" style={{ marginTop: 16 }} onClick={() => setBootKey((k) => k + 1)}>
            Try again
          </button>
        </main>
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="shell">
        <aside className="sidebar" />
        <main className="main">
          <div className="muted">Loading…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo" />
          <div>
            <div className="sidebar__title">Management System</div>
            <div className="sidebar__subtitle">WeddingSong</div>
          </div>
        </div>
        <nav className="sidebar__nav">
          <div className="sidebar__item">Dashboard</div>
          <div className="sidebar__item">Song library</div>
          <div className="sidebar__item sidebar__item--active">Wedding Events</div>
          <div className="sidebar__item">Event Folder</div>
        </nav>
        <button type="button" className="sidebar__cta">
          + New wedding
        </button>
        <div className="sidebar__spacer" />
        <div className="sidebar__item">Settings</div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="breadcrumbs">
            Wedding <span className="breadcrumbs__sep">›</span> New Wedding
          </div>
          <div className="topbar__tools">
            <input className="search" placeholder="Search events…" readOnly />
            <div className="iconBtn" aria-label="Notifications">
              🔔
            </div>
            <div className="avatar" aria-label="Profile" />
          </div>
        </header>

        <main className="main">
          <div className="pageHead">
            <div>
              <h1 className="h1">Create New wedding</h1>
              <p className="lede">Define the lineage for the formal order for the song arrangements.</p>
              <div className="metaRow">
                <label className="field">
                  <span>Groom family name</span>
                  <input value={groomFamily} onChange={(e) => setGroomFamily(e.target.value)} />
                </label>
                <label className="field">
                  <span>Bride family name</span>
                  <input value={brideFamily} onChange={(e) => setBrideFamily(e.target.value)} />
                </label>
                <label className="field">
                  <span>Wedding date</span>
                  <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
                </label>
              </div>
              <div className="titlePreview">
                <span className="muted">Title:</span> <strong>{previewTitle}</strong>
              </div>
            </div>
            <div className="pageHead__actions">
              <button type="button" className="btn btn--ghost" onClick={handleReset}>
                ↺ Reset
              </button>
              <button type="button" className="btn btn--primary" onClick={handleSave}>
                Save &amp; Continue to Add Songs →
              </button>
            </div>
          </div>

          {error ? <div className="banner banner--error">{error}</div> : null}

          <section className="treeShell">
            <div className="treeGrid">
              <div className="treeCol treeCol--groom">
                <div className="treeRow treeRow--center">
                  {groomMain ? (
                    <TreeCard
                      slot={groomMain}
                      side="groom"
                      query={queries[WeddingRole.Groom] ?? ""}
                      suggestions={suggestions[WeddingRole.Groom] ?? []}
                      suggestOpen={activeRole === WeddingRole.Groom}
                      onQueryChange={(r, v) => setQueries((q) => ({ ...q, [r]: v }))}
                      onPickPerson={onPickPerson}
                      onFocus={(r) => setActiveRole(r)}
                      onBlur={() => {
                        void onManualBlurCommit(WeddingRole.Groom);
                        setActiveRole(null);
                      }}
                    />
                  ) : null}
                </div>
                <div className="treeRow treeRow--split">
                  {slotByRole.get(WeddingRole.FatherOfGroom) ? (
                    <TreeCard
                      slot={slotByRole.get(WeddingRole.FatherOfGroom)!}
                      side="groom"
                      query={queries[WeddingRole.FatherOfGroom] ?? ""}
                      suggestions={suggestions[WeddingRole.FatherOfGroom] ?? []}
                      suggestOpen={activeRole === WeddingRole.FatherOfGroom}
                      onQueryChange={(r, v) => setQueries((q) => ({ ...q, [r]: v }))}
                      onPickPerson={onPickPerson}
                      onFocus={(r) => setActiveRole(r)}
                      onBlur={() => {
                        void onManualBlurCommit(WeddingRole.FatherOfGroom);
                        setActiveRole(null);
                      }}
                    />
                  ) : null}
                  {slotByRole.get(WeddingRole.MotherOfGroom) ? (
                    <TreeCard
                      slot={slotByRole.get(WeddingRole.MotherOfGroom)!}
                      side="groom"
                      query={queries[WeddingRole.MotherOfGroom] ?? ""}
                      suggestions={suggestions[WeddingRole.MotherOfGroom] ?? []}
                      suggestOpen={activeRole === WeddingRole.MotherOfGroom}
                      onQueryChange={(r, v) => setQueries((q) => ({ ...q, [r]: v }))}
                      onPickPerson={onPickPerson}
                      onFocus={(r) => setActiveRole(r)}
                      onBlur={() => {
                        void onManualBlurCommit(WeddingRole.MotherOfGroom);
                        setActiveRole(null);
                      }}
                    />
                  ) : null}
                </div>
                <div className="treeRow treeRow--quad">
                  {[WeddingRole.PaternalGrandfatherGroom, WeddingRole.PaternalGrandmotherGroom].map((r) =>
                    slotByRole.get(r) ? (
                      <TreeCard
                        key={r}
                        slot={slotByRole.get(r)!}
                        side="groom"
                        query={queries[r] ?? ""}
                        suggestions={suggestions[r] ?? []}
                        suggestOpen={activeRole === r}
                        onQueryChange={(role, v) => setQueries((q) => ({ ...q, [role]: v }))}
                        onPickPerson={onPickPerson}
                        onFocus={(role) => setActiveRole(role)}
                        onBlur={() => {
                          void onManualBlurCommit(r);
                          setActiveRole(null);
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="treeRow treeRow--quad">
                  {[WeddingRole.MaternalGrandfatherGroom, WeddingRole.MaternalGrandmotherGroom].map((r) =>
                    slotByRole.get(r) ? (
                      <TreeCard
                        key={r}
                        slot={slotByRole.get(r)!}
                        side="groom"
                        query={queries[r] ?? ""}
                        suggestions={suggestions[r] ?? []}
                        suggestOpen={activeRole === r}
                        onQueryChange={(role, v) => setQueries((q) => ({ ...q, [role]: v }))}
                        onPickPerson={onPickPerson}
                        onFocus={(role) => setActiveRole(role)}
                        onBlur={() => {
                          void onManualBlurCommit(r);
                          setActiveRole(null);
                        }}
                      />
                    ) : null,
                  )}
                </div>
              </div>

              <div className="treeDivider" />

              <div className="treeCol treeCol--bride">
                <div className="treeRow treeRow--center">
                  {brideMain ? (
                    <TreeCard
                      slot={brideMain}
                      side="bride"
                      query={queries[WeddingRole.Bride] ?? ""}
                      suggestions={suggestions[WeddingRole.Bride] ?? []}
                      suggestOpen={activeRole === WeddingRole.Bride}
                      onQueryChange={(r, v) => setQueries((q) => ({ ...q, [r]: v }))}
                      onPickPerson={onPickPerson}
                      onFocus={(r) => setActiveRole(r)}
                      onBlur={() => {
                        void onManualBlurCommit(WeddingRole.Bride);
                        setActiveRole(null);
                      }}
                    />
                  ) : null}
                </div>
                <div className="treeRow treeRow--split">
                  {slotByRole.get(WeddingRole.MotherOfBride) ? (
                    <TreeCard
                      slot={slotByRole.get(WeddingRole.MotherOfBride)!}
                      side="bride"
                      query={queries[WeddingRole.MotherOfBride] ?? ""}
                      suggestions={suggestions[WeddingRole.MotherOfBride] ?? []}
                      suggestOpen={activeRole === WeddingRole.MotherOfBride}
                      onQueryChange={(r, v) => setQueries((q) => ({ ...q, [r]: v }))}
                      onPickPerson={onPickPerson}
                      onFocus={(r) => setActiveRole(r)}
                      onBlur={() => {
                        void onManualBlurCommit(WeddingRole.MotherOfBride);
                        setActiveRole(null);
                      }}
                    />
                  ) : null}
                  {slotByRole.get(WeddingRole.FatherOfBride) ? (
                    <TreeCard
                      slot={slotByRole.get(WeddingRole.FatherOfBride)!}
                      side="bride"
                      query={queries[WeddingRole.FatherOfBride] ?? ""}
                      suggestions={suggestions[WeddingRole.FatherOfBride] ?? []}
                      suggestOpen={activeRole === WeddingRole.FatherOfBride}
                      onQueryChange={(r, v) => setQueries((q) => ({ ...q, [r]: v }))}
                      onPickPerson={onPickPerson}
                      onFocus={(r) => setActiveRole(r)}
                      onBlur={() => {
                        void onManualBlurCommit(WeddingRole.FatherOfBride);
                        setActiveRole(null);
                      }}
                    />
                  ) : null}
                </div>
                <div className="treeRow treeRow--quad">
                  {[WeddingRole.MaternalGrandfatherBride, WeddingRole.MaternalGrandmotherBride].map((r) =>
                    slotByRole.get(r) ? (
                      <TreeCard
                        key={r}
                        slot={slotByRole.get(r)!}
                        side="bride"
                        query={queries[r] ?? ""}
                        suggestions={suggestions[r] ?? []}
                        suggestOpen={activeRole === r}
                        onQueryChange={(role, v) => setQueries((q) => ({ ...q, [role]: v }))}
                        onPickPerson={onPickPerson}
                        onFocus={(role) => setActiveRole(role)}
                        onBlur={() => {
                          void onManualBlurCommit(r);
                          setActiveRole(null);
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="treeRow treeRow--quad">
                  {[WeddingRole.PaternalGrandfatherBride, WeddingRole.PaternalGrandmotherBride].map((r) =>
                    slotByRole.get(r) ? (
                      <TreeCard
                        key={r}
                        slot={slotByRole.get(r)!}
                        side="bride"
                        query={queries[r] ?? ""}
                        suggestions={suggestions[r] ?? []}
                        suggestOpen={activeRole === r}
                        onQueryChange={(role, v) => setQueries((q) => ({ ...q, [role]: v }))}
                        onPickPerson={onPickPerson}
                        onFocus={(role) => setActiveRole(role)}
                        onBlur={() => {
                          void onManualBlurCommit(r);
                          setActiveRole(null);
                        }}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            </div>

            <div className="legend">
              <span>
                <i className="dot dot--groom" /> GROOM SIDE
              </span>
              <span>
                <i className="dot dot--bride" /> BRIDE SIDE
              </span>
              <span>
                <i className="sq sq--ph" /> PLACEHOLDER
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
