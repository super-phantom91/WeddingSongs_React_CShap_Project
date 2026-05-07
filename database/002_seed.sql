USE WeddingSong;
GO

SET IDENTITY_INSERT dbo.People ON;

-- Seed people with parent links for autocomplete / tree hints
MERGE dbo.People AS t
USING (VALUES
    (1,  N'John',      N'Doe',          NULL, NULL),
    (2,  N'Jane',      N'Doe',          NULL, NULL),
    (3,  N'John',      N'Michael',      1,    2),
    (4,  N'Mary',      N'Lyonesse',     NULL, NULL),
    (5,  N'Arthur',    N'Lyonesse',     NULL, NULL),
    (6,  N'Guinevere', N'Lyonesse',     5,    4),
    (7,  N'Robert',    N'Smith',        NULL, NULL),
    (8,  N'Helen',     N'Smith',        NULL, NULL),
    (9,  N'James',     N'Smith',        7,    8),
    (10, N'Michael',   N'Anderson',     NULL, NULL),
    (11, N'Sarah',     N'Anderson',     NULL, NULL),
    (12, N'Daniel',    N'Anderson',     10,   11)
) AS s (Id, FirstName, LastName, FatherId, MotherId)
ON t.Id = s.Id
WHEN NOT MATCHED THEN
    INSERT (Id, FirstName, LastName, FatherId, MotherId)
    VALUES (s.Id, s.FirstName, s.LastName, s.FatherId, s.MotherId)
WHEN MATCHED THEN
    UPDATE
    SET t.FirstName = s.FirstName,
        t.LastName = s.LastName,
        t.FatherId = s.FatherId,
        t.MotherId = s.MotherId;

SET IDENTITY_INSERT dbo.People OFF;
GO

-- Optional sample wedding to validate UI + conflict indicator.
-- The application does NOT auto-create drafts; it creates rows only when Save is clicked.
SET IDENTITY_INSERT dbo.Weddings ON;

MERGE dbo.Weddings AS t
USING (VALUES
    (1, N'Doe', N'Lyonesse', CONVERT(date, '2026-06-14'), N'Draft')
) AS s (Id, GroomFamilyName, BrideFamilyName, WeddingDate, Status)
ON t.Id = s.Id
WHEN NOT MATCHED THEN
    INSERT (Id, GroomFamilyName, BrideFamilyName, WeddingDate, Status, CreatedAtUtc)
    VALUES (s.Id, s.GroomFamilyName, s.BrideFamilyName, s.WeddingDate, s.Status, SYSUTCDATETIME())
WHEN MATCHED THEN
    UPDATE
    SET t.GroomFamilyName = s.GroomFamilyName,
        t.BrideFamilyName = s.BrideFamilyName,
        t.WeddingDate = s.WeddingDate,
        t.Status = s.Status;

SET IDENTITY_INSERT dbo.Weddings OFF;
GO

-- RoleCode mapping (WeddingRole enum):
-- 1 Groom, 2 Bride, 3 FatherOfGroom, 4 MotherOfGroom,
-- 5 PaternalGrandfatherGroom, 6 PaternalGrandmotherGroom,
-- 7 MaternalGrandfatherGroom, 8 MaternalGrandmotherGroom,
-- 9 FatherOfBride, 10 MotherOfBride,
-- 11 PaternalGrandfatherBride, 12 PaternalGrandmotherBride,
-- 13 MaternalGrandfatherBride, 14 MaternalGrandmotherBride
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
