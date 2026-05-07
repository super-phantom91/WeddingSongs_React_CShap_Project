import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import {
  createWedding,
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

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('"status":404') || error.message.includes("404");
}

const ROLE_LABELS: Record<WeddingRoleValue, string> = {
  [WeddingRole.Groom]: "GROOM",
  [WeddingRole.Bride]: "BRIDE",
  [WeddingRole.FatherOfGroom]: "FATHER OF THE GROOM",
  [WeddingRole.MotherOfGroom]: "MOTHER OF THE GROOM",
  [WeddingRole.PaternalGrandfatherGroom]: "PATERNAL GRANDFATHER OF THE GROOM",
  [WeddingRole.PaternalGrandmotherGroom]: "PATERNAL GRANDMOTHER OF THE GROOM",
  [WeddingRole.MaternalGrandfatherGroom]: "MATERNAL GRANDFATHER OF THE GROOM",
  [WeddingRole.MaternalGrandmotherGroom]: "MATERNAL GRANDMOTHER OF THE GROOM",
  [WeddingRole.FatherOfBride]: "FATHER OF THE BRIDE",
  [WeddingRole.MotherOfBride]: "MOTHER OF THE BRIDE",
  [WeddingRole.PaternalGrandfatherBride]: "PATERNAL GRANDFATHER OF THE BRIDE",
  [WeddingRole.PaternalGrandmotherBride]: "PATERNAL GRANDMOTHER OF THE BRIDE",
  [WeddingRole.MaternalGrandfatherBride]: "MATERNAL GRANDFATHER OF THE BRIDE",
  [WeddingRole.MaternalGrandmotherBride]: "MATERNAL GRANDMOTHER OF THE BRIDE",
};

function emptySlots(): SlotDraft[] {
  return Object.values(WeddingRole)
    .sort((a, b) => a - b)
    .map((role) => ({
      role,
      personId: null,
      displayName: "",
      label: ROLE_LABELS[role],
      hasConflict: false,
    }));
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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
  const [slots, setSlots] = useState<SlotDraft[]>(() => emptySlots());
  const [groomFamily, setGroomFamily] = useState("");
  const [brideFamily, setBrideFamily] = useState("");
  const [weddingDate, setWeddingDate] = useState(() => todayIsoDate());

  const [activeRole, setActiveRole] = useState<WeddingRoleValue | null>(null);
  const [queries, setQueries] = useState<Record<number, string>>({});
  const [suggestions, setSuggestions] = useState<Record<number, PersonSummaryDto[]>>({});

  const slotByRole = useMemo(() => new Map(slots.map((s) => [s.role, s])), [slots]);
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
          setWedding(null);
          setSlots(emptySlots());
          setGroomFamily("");
          setBrideFamily("");
          setWeddingDate(todayIsoDate());
          const q: Record<number, string> = {};
          for (const s of emptySlots()) q[s.role] = s.displayName;
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

  const persistMeta = async (weddingId: number) => {
    const dto = await updateWeddingMeta(weddingId, {
      groomFamilyName: groomFamily,
      brideFamilyName: brideFamily,
      weddingDate,
    });
    setWedding(dto);
  };

  const persistLineage = async (weddingId: number, nextSlots: SlotDraft[]) => {
    try {
      const dto = await updateLineage(
        weddingId,
        nextSlots.map((s) => ({ role: s.role, personId: s.personId, displayName: s.displayName })),
      );
      setWedding(dto);
      setSlots(dto.slots.map(slotFromDto));
      setQueries((prev) => {
        const n = { ...prev };
        for (const s of dto.slots) n[s.role] = s.displayName;
        return n;
      });
      setError(null);
    } catch (e) {
      if (isNotFoundError(e)) {
        setError("This wedding was not found anymore. Please click '+ New wedding' to create a fresh draft.");
        return;
      }
      throw e;
    }
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
    try {
      setError(null);
    } catch {
      /* save happens on Save button only */
    }
  };

  const onManualBlurCommit = (role: WeddingRoleValue) => {
    const name = (queries[role] ?? "").trim();
    const next = slots.map((s) => (s.role === role ? { ...s, displayName: name, personId: null } : { ...s }));
    setSlots(next);
  };

  const handleSave = async () => {
    try {
      let weddingId = wedding?.id;
      if (!weddingId) {
        const created = await createWedding({
          groomFamilyName: groomFamily,
          brideFamilyName: brideFamily,
          weddingDate,
          assignments: slots.map((s) => ({ role: s.role, personId: s.personId, displayName: s.displayName })),
        });
        weddingId = created.id;
        setWedding(created);
        setParams({ id: String(created.id) }, { replace: true });
        setSlots(created.slots.map(slotFromDto));
        setQueries((prev) => {
          const n = { ...prev };
          for (const s of created.slots) n[s.role] = s.displayName;
          return n;
        });
        setError(null);
        return;
      }
      await persistMeta(weddingId);
      await persistLineage(weddingId, slots);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const handleReset = async () => {
    setError(null);
    if (wedding) {
      await load(wedding.id);
      return;
    }
    setSlots(emptySlots());
    setGroomFamily("");
    setBrideFamily("");
    setWeddingDate(todayIsoDate());
    const q: Record<number, string> = {};
    for (const s of emptySlots()) q[s.role] = s.displayName;
    setQueries(q);
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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <span className="sidebar__brandMark" aria-hidden>
              ◉
            </span>
          </div>
          <div>
            <div className="sidebar__title">Management System</div>
            <div className="sidebar__subtitle">WeddingSong</div>
          </div>
        </div>
        <nav className="sidebar__nav">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar__item${isActive ? " sidebar__item--active" : ""}`}>
            <span className="sidebar__itemInner">
              <span className="sidebar__itemIcon" aria-hidden>
                ◫
              </span>
              <span>Dashboard</span>
            </span>
          </NavLink>
          <NavLink to="/song-library" className={({ isActive }) => `sidebar__item${isActive ? " sidebar__item--active" : ""}`}>
            <span className="sidebar__itemInner">
              <span className="sidebar__itemIcon" aria-hidden>
                ♫
              </span>
              <span>Song library</span>
            </span>
          </NavLink>
          <NavLink
            to="/wedding-events"
            end
            className={({ isActive }) => `sidebar__item${isActive ? " sidebar__item--active" : ""}`}
          >
            <span className="sidebar__itemInner">
              <span className="sidebar__itemIcon" aria-hidden>
                ◈
              </span>
              <span>Wedding Events</span>
            </span>
          </NavLink>
          <NavLink to="/event-folder" className={({ isActive }) => `sidebar__item${isActive ? " sidebar__item--active" : ""}`}>
            <span className="sidebar__itemInner">
              <span className="sidebar__itemIcon" aria-hidden>
                ⌂
              </span>
              <span>Event Folder</span>
            </span>
          </NavLink>
        </nav>
        <div className="sidebar__spacer" />
        <NavLink
          to="/wedding-events/new-wedding"
          className={({ isActive }) => `sidebar__cta${isActive ? " sidebar__cta--active" : ""}`}
        >
          + New wedding
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar__item${isActive ? " sidebar__item--active" : ""}`}>
          <span className="sidebar__itemInner">
            <span className="sidebar__itemIcon" aria-hidden>
              ⚙
            </span>
            <span>Settings</span>
          </span>
        </NavLink>
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
            <div className="pageHead__top">
              <div>
                <h1 className="h1">Create New wedding</h1>
                <p className="lede">Define the lineage for the formal order for the song arrangements.</p>
              </div>
              <div className="pageHead__actions">
                <button type="button" className="btn btn--primary" onClick={handleSave}>
                  Save &amp; Continue to Add Songs →
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleReset}>
                  ↺ Reset
                </button>
              </div>
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
