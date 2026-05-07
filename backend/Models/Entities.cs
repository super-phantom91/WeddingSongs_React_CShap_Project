namespace WeddingSong.Api.Models;

public class Person
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public int? FatherId { get; set; }
    public int? MotherId { get; set; }

    public Person? Father { get; set; }
    public Person? Mother { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();
}

public class Wedding
{
    public int Id { get; set; }
    public string GroomFamilyName { get; set; } = "";
    public string BrideFamilyName { get; set; } = "";
    public DateOnly WeddingDate { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string Status { get; set; } = "Draft";

    public ICollection<WeddingRoleAssignment> RoleAssignments { get; set; } = new List<WeddingRoleAssignment>();
}

public class WeddingRoleAssignment
{
    public int Id { get; set; }
    public int WeddingId { get; set; }
    public WeddingRole RoleCode { get; set; }
    public int? PersonId { get; set; }
    public string DisplayName { get; set; } = "";

    public Wedding? Wedding { get; set; }
    public Person? Person { get; set; }
}
