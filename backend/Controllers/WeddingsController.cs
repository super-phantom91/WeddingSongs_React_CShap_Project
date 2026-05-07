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
    public async Task<ActionResult<WeddingLineageDto>> CreateDraft(CancellationToken ct)
    {
        var wedding = new Wedding
        {
            GroomFamilyName = "",
            BrideFamilyName = "",
            WeddingDate = DateOnly.FromDateTime(DateTime.UtcNow.Date),
            CreatedAtUtc = DateTime.UtcNow,
            Status = "Draft",
        };
        db.Weddings.Add(wedding);
        await db.SaveChangesAsync(ct);

        foreach (WeddingRole role in Enum.GetValues<WeddingRole>())
        {
            db.WeddingRoleAssignments.Add(new WeddingRoleAssignment
            {
                WeddingId = wedding.Id,
                RoleCode = role,
                PersonId = null,
                DisplayName = "",
            });
        }
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

        var assignments = body.Assignments ?? Array.Empty<LineageAssignmentDto>();

        foreach (var a in assignments)
        {
            var slot = wedding.RoleAssignments.FirstOrDefault(r => r.RoleCode == a.Role);
            if (slot is null)
                continue;
            slot.PersonId = a.PersonId;
            slot.DisplayName = (a.DisplayName ?? "").Trim();
        }
        await db.SaveChangesAsync(ct);
        return Ok(await LoadLineageDto(id, ct));
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
