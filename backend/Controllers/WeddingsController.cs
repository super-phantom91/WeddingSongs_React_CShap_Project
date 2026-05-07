using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WeddingSong.Api.Contracts;
using WeddingSong.Api.Data;
using WeddingSong.Api.Models;
using WeddingSong.Api.Services;

namespace WeddingSong.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WeddingsController(WeddingDbContext db) : ControllerBase
{
    private static string BuildTitle(string groomFamily, string brideFamily, DateOnly date) =>
        $"{groomFamily.Trim()} - {brideFamily.Trim()} - {date:yyyy-MM-dd}";

    [HttpPost]
    public async Task<ActionResult<WeddingLineageDto>> Create([FromBody] CreateWeddingRequest body, CancellationToken ct)
    {
        var wedding = new Wedding
        {
            GroomFamilyName = body.GroomFamilyName?.Trim() ?? "",
            BrideFamilyName = body.BrideFamilyName?.Trim() ?? "",
            WeddingDate = body.WeddingDate,
            CreatedAtUtc = DateTime.UtcNow,
            Status = "Draft",
        };
        db.Weddings.Add(wedding);
        ApplyAssignments(wedding, body.Assignments ?? Array.Empty<LineageAssignmentDto>());
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = wedding.Id }, await LoadLineageDto(wedding.Id, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WeddingLineageDto>> Get(int id, CancellationToken ct)
    {
        var dto = await LoadLineageDto(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPut("{id:int}/meta")]
    public async Task<ActionResult<WeddingLineageDto>> UpdateMeta(int id, [FromBody] WeddingMetaDto body, CancellationToken ct)
    {
        var wedding = await db.Weddings.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (wedding is null)
            return NotFound();

        wedding.GroomFamilyName = body.GroomFamilyName?.Trim() ?? "";
        wedding.BrideFamilyName = body.BrideFamilyName?.Trim() ?? "";
        wedding.WeddingDate = body.WeddingDate;
        await db.SaveChangesAsync(ct);

        return Ok(await LoadLineageDto(id, ct));
    }

    [HttpPut("{id:int}/lineage")]
    public async Task<ActionResult<WeddingLineageDto>> UpdateLineage(int id, [FromBody] UpdateLineageRequest body, CancellationToken ct)
    {
        var wedding = await db.Weddings
            .Include(w => w.RoleAssignments)
            .FirstOrDefaultAsync(w => w.Id == id, ct);
        if (wedding is null)
            return NotFound();

        ApplyAssignments(wedding, body.Assignments ?? Array.Empty<LineageAssignmentDto>());
        await db.SaveChangesAsync(ct);
        return Ok(await LoadLineageDto(id, ct));
    }

    private static void ApplyAssignments(Wedding wedding, IReadOnlyList<LineageAssignmentDto> assignments)
    {
        var incoming = new Dictionary<WeddingRole, LineageAssignmentDto>();
        foreach (var a in assignments)
            incoming[a.Role] = a;

        foreach (WeddingRole role in Enum.GetValues<WeddingRole>())
        {
            incoming.TryGetValue(role, out var source);
            var slot = wedding.RoleAssignments.FirstOrDefault(r => r.RoleCode == role);
            if (slot is null)
            {
                wedding.RoleAssignments.Add(new WeddingRoleAssignment
                {
                    RoleCode = role,
                    PersonId = source?.PersonId,
                    DisplayName = source?.DisplayName?.Trim() ?? "",
                });
                continue;
            }

            slot.PersonId = source?.PersonId;
            slot.DisplayName = source?.DisplayName?.Trim() ?? "";
        }
    }

    private async Task<WeddingLineageDto?> LoadLineageDto(int weddingId, CancellationToken ct)
    {
        var wedding = await db.Weddings.AsNoTracking()
            .Include(w => w.RoleAssignments)
            .FirstOrDefaultAsync(w => w.Id == weddingId, ct);
        if (wedding is null)
            return null;

        var assignments = wedding.RoleAssignments
            .Select(r => new LineageAssignmentDto(r.RoleCode, r.PersonId, r.DisplayName))
            .ToList();
        var conflicts = LineageConflictService.ComputeConflictRoles(assignments);

        var slots = Enum.GetValues<WeddingRole>()
            .OrderBy(r => (byte)r)
            .Select(role =>
            {
                var row = wedding.RoleAssignments.FirstOrDefault(a => a.RoleCode == role);
                return new WeddingLineageSlotDto(
                    role,
                    row?.PersonId,
                    row?.DisplayName ?? "",
                    WeddingRoleLabels.ToLabel(role),
                    conflicts.Contains(role));
            })
            .ToList();

        return new WeddingLineageDto(
            wedding.Id,
            wedding.GroomFamilyName,
            wedding.BrideFamilyName,
            wedding.WeddingDate,
            BuildTitle(wedding.GroomFamilyName, wedding.BrideFamilyName, wedding.WeddingDate),
            slots);
    }
}
