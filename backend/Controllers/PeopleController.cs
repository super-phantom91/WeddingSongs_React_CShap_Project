using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WeddingSong.Api.Contracts;
using WeddingSong.Api.Data;

namespace WeddingSong.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PeopleController(WeddingDbContext db) : ControllerBase
{
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<PersonSummaryDto>>> Search([FromQuery] string? q, CancellationToken ct)
    {
        q = (q ?? "").Trim();
        if (q.Length < 2)
            return Ok(Array.Empty<PersonSummaryDto>());

        var like = $"%{q}%";
        var rows = await db.People
            .AsNoTracking()
            .Where(p => EF.Functions.Like(p.FirstName + " " + p.LastName, like)
                        || EF.Functions.Like(p.LastName + " " + p.FirstName, like))
            .OrderBy(p => p.LastName).ThenBy(p => p.FirstName)
            .Take(25)
            .Select(p => new PersonSummaryDto(p.Id, p.FirstName, p.LastName, p.FirstName + " " + p.LastName))
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("{id:int}/hints")]
    public async Task<ActionResult<PersonLineageHintsDto>> Hints(int id, CancellationToken ct)
    {
        var person = await db.People.AsNoTracking()
            .Include(p => p.Father).Include(p => p.Mother)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (person is null)
            return NotFound();

        ParentHintDto? f = person.Father is null ? null : new ParentHintDto(person.Father.Id, person.Father.FullName);
        ParentHintDto? m = person.Mother is null ? null : new ParentHintDto(person.Mother.Id, person.Mother.FullName);

        return Ok(new PersonLineageHintsDto(person.Id, person.FullName, f, m));
    }
}
