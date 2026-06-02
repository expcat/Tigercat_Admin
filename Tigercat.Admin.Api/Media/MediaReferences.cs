namespace Tigercat.Admin.Api.Media;

public static class MediaReferences
{
    public const string SiteLogoType = "site.logo";
    public const string SiteLogoKey = "site.logo";
    public const string UserAvatarType = "user.avatar";

    public static string UserAvatarKey(int userId) => userId.ToString(System.Globalization.CultureInfo.InvariantCulture);
}
