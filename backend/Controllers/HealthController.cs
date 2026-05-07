using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WeddingSong.Api.Data;

namespace WeddingSong.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>Quick check that SQL Server is reachable and the WeddingSong database exists.</summary>
    [HttpGet("db")]
    public async Task<ActionResult<object>> Database([FromServices] WeddingDbContext db, CancellationToken ct)
    {
        try
        {
            var ok = await db.Database.CanConnectAsync(ct);
            return Ok(new { connected = ok });
        }
        catch (Exception ex)
        {
            return Ok(new { connected = false, error = ex.Message });
        }
    }
}
