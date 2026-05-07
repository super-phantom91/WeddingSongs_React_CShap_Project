-- WeddingSong - Complete SQL Server schema
-- Aligned with backend EF model and save-on-click workflow.
-- Run this file first, then run 002_seed.sql.

IF DB_ID(N'WeddingSong') IS NULL
    CREATE DATABASE WeddingSong;
GO

USE WeddingSong;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.WeddingRoleAssignments', N'U') IS NOT NULL DROP TABLE dbo.WeddingRoleAssignments;
IF OBJECT_ID(N'dbo.Weddings', N'U') IS NOT NULL DROP TABLE dbo.Weddings;
IF OBJECT_ID(N'dbo.People', N'U') IS NOT NULL DROP TABLE dbo.People;
GO

CREATE TABLE dbo.People (
    Id            INT IDENTITY(1,1) NOT NULL,
    FirstName     NVARCHAR(100) NOT NULL CONSTRAINT DF_People_FirstName DEFAULT (N''),
    LastName      NVARCHAR(100) NOT NULL CONSTRAINT DF_People_LastName DEFAULT (N''),
    FatherId      INT NULL,
    MotherId      INT NULL,
    CONSTRAINT PK_People PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_People_Father FOREIGN KEY (FatherId) REFERENCES dbo.People (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_People_Mother FOREIGN KEY (MotherId) REFERENCES dbo.People (Id) ON DELETE NO ACTION
);
GO

CREATE INDEX IX_People_LastName_FirstName ON dbo.People (LastName, FirstName);
GO

CREATE TABLE dbo.Weddings (
    Id               INT IDENTITY(1,1) NOT NULL,
    GroomFamilyName  NVARCHAR(200) NOT NULL CONSTRAINT DF_Weddings_GroomFamilyName DEFAULT (N''),
    BrideFamilyName  NVARCHAR(200) NOT NULL CONSTRAINT DF_Weddings_BrideFamilyName DEFAULT (N''),
    WeddingDate      DATE NOT NULL,
    CreatedAtUtc     DATETIME2(7) NOT NULL CONSTRAINT DF_Weddings_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    Status           NVARCHAR(40) NOT NULL CONSTRAINT DF_Weddings_Status DEFAULT (N'Draft'),
    CONSTRAINT PK_Weddings PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT CK_Weddings_Status CHECK (LEN(Status) <= 40),
    CONSTRAINT CK_Weddings_GroomFamilyName CHECK (LEN(GroomFamilyName) <= 200),
    CONSTRAINT CK_Weddings_BrideFamilyName CHECK (LEN(BrideFamilyName) <= 200)
);
GO

-- RoleCode is mapped from backend enum WeddingRole (1..14)
CREATE TABLE dbo.WeddingRoleAssignments (
    Id          INT IDENTITY(1,1) NOT NULL,
    WeddingId   INT NOT NULL,
    RoleCode    TINYINT NOT NULL,
    PersonId    INT NULL,
    DisplayName NVARCHAR(200) NOT NULL CONSTRAINT DF_WRA_DisplayName DEFAULT (N''),
    CONSTRAINT PK_WeddingRoleAssignments PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_WRA_Wedding FOREIGN KEY (WeddingId) REFERENCES dbo.Weddings (Id) ON DELETE CASCADE,
    CONSTRAINT FK_WRA_Person FOREIGN KEY (PersonId) REFERENCES dbo.People (Id) ON DELETE NO ACTION,
    CONSTRAINT UQ_WRA_WeddingId_RoleCode UNIQUE (WeddingId, RoleCode),
    CONSTRAINT CK_WRA_RoleCode CHECK (RoleCode BETWEEN 1 AND 14),
    CONSTRAINT CK_WRA_DisplayName CHECK (LEN(DisplayName) <= 200)
);
GO

CREATE INDEX IX_WRA_WeddingId ON dbo.WeddingRoleAssignments (WeddingId);
CREATE INDEX IX_WRA_PersonId ON dbo.WeddingRoleAssignments (PersonId);
GO
