namespace WeddingSong.Api.Models;

public enum WeddingRole : byte
{
    Groom = 1,
    Bride = 2,
    FatherOfGroom = 3,
    MotherOfGroom = 4,
    PaternalGrandfatherGroom = 5,
    PaternalGrandmotherGroom = 6,
    MaternalGrandfatherGroom = 7,
    MaternalGrandmotherGroom = 8,
    FatherOfBride = 9,
    MotherOfBride = 10,
    PaternalGrandfatherBride = 11,
    PaternalGrandmotherBride = 12,
    MaternalGrandfatherBride = 13,
    MaternalGrandmotherBride = 14,
}

public static class WeddingRoleLabels
{
    public static string ToLabel(WeddingRole role) => role switch
    {
        WeddingRole.Groom => "GROOM",
        WeddingRole.Bride => "BRIDE",
        WeddingRole.FatherOfGroom => "FATHER OF THE GROOM",
        WeddingRole.MotherOfGroom => "MOTHER OF THE GROOM",
        WeddingRole.PaternalGrandfatherGroom => "PATERNAL GRANDFATHER OF THE GROOM",
        WeddingRole.PaternalGrandmotherGroom => "PATERNAL GRANDMOTHER OF THE GROOM",
        WeddingRole.MaternalGrandfatherGroom => "MATERNAL GRANDFATHER OF THE GROOM",
        WeddingRole.MaternalGrandmotherGroom => "MATERNAL GRANDMOTHER OF THE GROOM",
        WeddingRole.FatherOfBride => "FATHER OF THE BRIDE",
        WeddingRole.MotherOfBride => "MOTHER OF THE BRIDE",
        WeddingRole.PaternalGrandfatherBride => "PATERNAL GRANDFATHER OF THE BRIDE",
        WeddingRole.PaternalGrandmotherBride => "PATERNAL GRANDMOTHER OF THE BRIDE",
        WeddingRole.MaternalGrandfatherBride => "MATERNAL GRANDFATHER OF THE BRIDE",
        WeddingRole.MaternalGrandmotherBride => "MATERNAL GRANDMOTHER OF THE BRIDE",
        _ => role.ToString().ToUpperInvariant(),
    };
}
