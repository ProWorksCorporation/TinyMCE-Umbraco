namespace TinyMCE.Umbraco;

public class OpenAiApiConfig
{
    public string model { get; set; } = "gpt-5";

    public string developerMessage { get; set; } = "";

    public double temperature { get; set; } = 1.0;

    public int maxCompletionTokens { get; set; } = 800;
}
