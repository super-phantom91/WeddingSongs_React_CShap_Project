USE WeddingSong;
GO

SET IDENTITY_INSERT dbo.People ON;

-- Seed people with parent links for autocomplete / tree hints
MERGE dbo.People AS t
USING (VALUES
    (1,  N'John',     N'Doe',         NULL, NULL),
    (2,  N'Jane',     N'Doe',         NULL, NULL),
    (3,  N'John',     N'Michael',     1,    2),
    (4,  N'Mary',     N'Lyonesse',    NULL, NULL),
    (5,  N'Arthur',   N'Lyonesse',    NULL, NULL),
    (6,  N'Guinevere',N'Lyonesse',    5,    4),
    (7,  N'Robert',   N'Smith',       NULL, NULL),
    (8,  N'Helen',    N'Smith',       NULL, NULL),
    (9,  N'James',    N'Smith',       7,    8)
) AS s (Id, FirstName, LastName, FatherId, MotherId)
ON t.Id = s.Id
WHEN NOT MATCHED THEN
    INSERT (Id, FirstName, LastName, FatherId, MotherId)
    VALUES (s.Id, s.FirstName, s.LastName, s.FatherId, s.MotherId);

SET IDENTITY_INSERT dbo.People OFF;
GO

-- Example draft wedding matching mockup lineage conflict (same person in two roles)
SET IDENTITY_INSERT dbo.Weddings ON;

MERGE dbo.Weddings AS t
USING (VALUES
    (1, N'Doe', N'Lyonesse', '2026-06-14')
) AS s (Id, GroomFamilyName, BrideFamilyName, WeddingDate)
ON t.Id = s.Id
WHEN NOT MATCHED THEN
    INSERT (Id, GroomFamilyName, BrideFamilyName, WeddingDate, Status)
    VALUES (s.Id, s.GroomFamilyName, s.BrideFamilyName, s.WeddingDate, N'Draft');

SET IDENTITY_INSERT dbo.Weddings OFF;
GO

-- RoleCode: see WeddingRole in backend (1=Groom ... 14=MaternalGrandmotherBride)
DELETE FROM dbo.WeddingRoleAssignments WHERE WeddingId = 1;

INSERT INTO dbo.WeddingRoleAssignments (WeddingId, RoleCode, PersonId, DisplayName) VALUES
(1, 1,  1, N'John Doe'),
(1, 2,  6, N'Guinevere Lyonesse'),
(1, 3,  3, N'John Michael'),      -- Father of groom (also used as father of bride -> conflict demo)
(1, 4,  NULL, N''),
(1, 5,  NULL, N''),
(1, 6,  NULL, N''),
(1, 7,  NULL, N''),
(1, 8,  NULL, N''),
(1, 9,  3, N'John Michael'),      -- Father of bride - duplicate person id vs role 3
(1, 10, NULL, N''),
(1, 11, NULL, N''),
(1, 12, NULL, N''),
(1, 13, NULL, N''),
(1, 14, NULL, N'');

GO
