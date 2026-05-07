export const WeddingRole = {
  Groom: 1,
  Bride: 2,
  FatherOfGroom: 3,
  MotherOfGroom: 4,
  PaternalGrandfatherGroom: 5,
  PaternalGrandmotherGroom: 6,
  MaternalGrandfatherGroom: 7,
  MaternalGrandmotherGroom: 8,
  FatherOfBride: 9,
  MotherOfBride: 10,
  PaternalGrandfatherBride: 11,
  PaternalGrandmotherBride: 12,
  MaternalGrandfatherBride: 13,
  MaternalGrandmotherBride: 14,
} as const;

export type WeddingRoleValue = (typeof WeddingRole)[keyof typeof WeddingRole];

export type WeddingLineageSlotDto = {
  role: WeddingRoleValue;
  personId: number | null;
  displayName: string;
  label: string;
  hasConflict: boolean;
};

export type WeddingLineageDto = {
  id: number;
  groomFamilyName: string;
  brideFamilyName: string;
  weddingDate: string;
  title: string;
  slots: WeddingLineageSlotDto[];
};

export type PersonSummaryDto = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
};

export type PersonLineageHintsDto = {
  id: number;
  fullName: string;
  father: { id: number; fullName: string } | null;
  mother: { id: number; fullName: string } | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = (await res.text()).trim();
    if (res.status === 504 || res.status === 502) {
      throw new Error(
        `Cannot reach the API (${res.status} ${res.statusText}). Start the backend on http://localhost:5280 (dotnet run in the backend project), then reload this page.`,
      );
    }
    const short = text.length > 500 ? `${text.slice(0, 500)}…` : text;
    throw new Error(short || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function createWedding(body: {
  groomFamilyName: string;
  brideFamilyName: string;
  weddingDate: string;
  assignments: { role: WeddingRoleValue; personId: number | null; displayName: string }[];
}): Promise<WeddingLineageDto> {
  const res = await fetch("/api/weddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return json<WeddingLineageDto>(res);
}

export async function getWedding(id: number): Promise<WeddingLineageDto> {
  const res = await fetch(`/api/weddings/${id}`);
  return json<WeddingLineageDto>(res);
}

export async function updateWeddingMeta(
  id: number,
  body: { groomFamilyName: string; brideFamilyName: string; weddingDate: string },
): Promise<WeddingLineageDto> {
  const res = await fetch(`/api/weddings/${id}/meta`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return json<WeddingLineageDto>(res);
}

export async function updateLineage(
  id: number,
  assignments: { role: WeddingRoleValue; personId: number | null; displayName: string }[],
): Promise<WeddingLineageDto> {
  const res = await fetch(`/api/weddings/${id}/lineage`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignments }),
  });
  return json<WeddingLineageDto>(res);
}

export async function searchPeople(q: string): Promise<PersonSummaryDto[]> {
  const res = await fetch(`/api/people/search?q=${encodeURIComponent(q)}`);
  return json<PersonSummaryDto[]>(res);
}

export async function getPersonHints(id: number): Promise<PersonLineageHintsDto> {
  const res = await fetch(`/api/people/${id}/hints`);
  return json<PersonLineageHintsDto>(res);
}
