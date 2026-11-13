namespace TinyMCE.Umbraco.Api.Management;

/// <summary>
///     The part of <see cref="TinyMceConfig"/> that the editor in the browser needs: an allow-list projection
///     (constitution 1.2.0, credential classification). Property names and types match <see cref="TinyMceConfig"/>, so
///     the JSON the editor reads is unchanged.
/// </summary>
/// <remarks>
///     <para>
///         <see cref="apikey"/> is the TinyMCE Cloud key: a <b>public client identifier</b>, which TinyMCE's CDN needs in
///         the browser and which the Tiny Cloud approved-domain list protects.
///     </para>
///     <para>
///         <see cref="TinyMceConfig.openAiApikey"/> (a <b>provider secret</b>) and <see cref="TinyMceConfig.OpenAiApiConfig"/>
///         are deliberately absent: AI requests go through the server (CL-001). A new <see cref="TinyMceConfig"/> property
///         stays invisible to the browser until it is added here on purpose.
///     </para>
/// </remarks>
public sealed class TinyMceClientConfigModel
{
    /// <summary>The TinyMCE Cloud key (public client identifier).</summary>
    public string apikey { get; set; } = "";

    /// <summary>The TinyMCE major version to load from the CDN.</summary>
    public string tinyMceVersion { get; set; } = "6";

    /// <summary>An explicit TinyMCE script URL, overriding the CDN URL built from the key and version.</summary>
    public string tinyMceUrl { get; set; } = "";

    /// <summary>TinyMCE plugins to remove from every editor.</summary>
    public string[] pluginsToExclude { get; set; } = [];

    /// <summary>Whether editor content is sanitised.</summary>
    public bool sanitizeTinyMce { get; set; } = true;

    /// <summary>TinyMCE options merged into every editor's configuration.</summary>
    public Dictionary<string, object> customConfig { get; set; } = new();

    /// <summary>Copies the browser-safe settings from <paramref name="source"/>, field by field.</summary>
    public static TinyMceClientConfigModel From(TinyMceConfig source) => new()
    {
        apikey = source.apikey,
        tinyMceVersion = source.tinyMceVersion,
        tinyMceUrl = source.tinyMceUrl,
        pluginsToExclude = source.pluginsToExclude,
        sanitizeTinyMce = source.sanitizeTinyMce,
        customConfig = source.customConfig,
    };
}
