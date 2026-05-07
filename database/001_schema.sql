-- WeddingSong - SQL Server schema (New Wedding + People foundation)
-- Run against your SQL Server instance, then run 002_seed.sql

IF DB_ID(N'WeddingSong') IS NULL
    CREATE DATABASE WeddingSong;
GO

USE WeddingSong;
GO

IF OBJECT_ID(N'dbo.WeddingRoleAssignments', N'U') IS NOT NULL DROP TABLE dbo.WeddingRoleAssignments;
IF OBJECT_ID(N'dbo.Weddings', N'U') IS NOT NULL DROP TABLE dbo.Weddings;
IF OBJECT_ID(N'dbo.People', N'U') IS NOT NULL DROP TABLE dbo.People;
GO

CREATE TABLE dbo.People (
    Id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    FirstName     NVARCHAR(100) NOT NULL,
    LastName      NVARCHAR(100) NOT NULL,
    FatherId      INT NULL,
    MotherId      INT NULL,
    CONSTRAINT FK_People_Father FOREIGN KEY (FatherId) REFERENCES dbo.People (Id),
    CONSTRAINT FK_People_Mother FOREIGN KEY (MotherId) REFERENCES dbo.People (Id)
);
GO

CREATE INDEX IX_People_LastFirst ON dbo.People (LastName, FirstName);
GO

CREATE TABLE dbo.Weddings (
    Id               INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    GroomFamilyName  NVARCHAR(200) NOT NULL DEFAULT N'',
    BrideFamilyName  NVARCHAR(200) NOT NULL DEFAULT N'',
    WeddingDate      DATE NOT NULL,
    -- Keep computed but non-persisted to avoid deterministic restriction across SQL Server setups.
    Title            AS (LTRIM(RTRIM(GroomFamilyName)) + N' - ' + LTRIM(RTRIM(BrideFamilyName)) + N' - ' + CONVERT(NVARCHAR(10), WeddingDate, 23)),
    CreatedAtUtc     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Status           NVARCHAR(40) NOT NULL DEFAULT N'Draft' -- Draft | Confirmed
);
GO

-- Role codes align with backend enum WeddingRole
CREATE TABLE dbo.WeddingRoleAssignments (
    Id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    WeddingId   INT NOT NULL,
    RoleCode    TINYINT NOT NULL,
    PersonId    INT NULL,
    DisplayName NVARCHAR(200) NOT NULL,
    CONSTRAINT FK_WRA_Wedding FOREIGN KEY (WeddingId) REFERENCES dbo.Weddings (Id) ON DELETE CASCADE,
    CONSTRAINT FK_WRA_Person FOREIGN KEY (PersonId) REFERENCES dbo.People (Id),
    CONSTRAINT UQ_Wedding_Role UNIQUE (WeddingId, RoleCode)
);
GO

CREATE INDEX IX_WRA_Person ON dbo.WeddingRoleAssignments (PersonId);
GO
