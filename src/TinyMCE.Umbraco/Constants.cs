namespace TinyMCE.Umbraco;

public static partial class Constants
{
    public const string ProjectName = nameof(TinyMCE);

    public const string ProjectAlias = "tiny-mce";

    internal const string ProjectNamespace = $"{nameof(TinyMCE)}.{nameof(Umbraco)}";

    public static class PropertyEditors
    {
        public static class Aliases
        {
            public const string TinyMce = "Umbraco.TinyMCE";
        }
    }
}
