namespace TinyMCE.Umbraco;

public class TinyMceConfig
{
    public string apikey { get; set; } = "";

    public string tinyMceVersion { get; set; } = "6";

    public string tinyMceUrl { get; set; } = "";

    public string openAiApikey { get; set; } = "";

    public string[] pluginsToExclude { get; set; } = [];

    public Dictionary<string, object> customConfig { get; set; } = new Dictionary<string, object>();
}
