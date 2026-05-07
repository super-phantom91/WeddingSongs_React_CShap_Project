using WeddingSong.Api.Models;

namespace WeddingSong.Api.Contracts;

public record PersonSummaryDto(int Id, string FirstName, string LastName, string FullName);

public record PersonLineageHintsDto(
    int Id,
    string FullName,
    ParentHintDto? Father,
    ParentHintDto? Mother);

public record ParentHintDto(int Id, string FullName);

public record WeddingLineageSlotDto(WeddingRole Role, int? PersonId, string DisplayName, string Label, bool HasConflict);

public record WeddingLineageDto(
    int Id,
    string GroomFamilyName,
    string BrideFamilyName,
    DateOnly WeddingDate,
    string Title,
    IReadOnlyList<WeddingLineageSlotDto> Slots);

public record UpdateLineageRequest(IReadOnlyList<LineageAssignmentDto> Assignments);

public record LineageAssignmentDto(WeddingRole Role, int? PersonId, string DisplayName);

public record WeddingMetaDto(string GroomFamilyName, string BrideFamilyName, DateOnly WeddingDate);
