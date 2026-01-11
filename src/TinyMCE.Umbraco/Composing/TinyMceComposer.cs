using System.Dynamic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TinyMCE.Umbraco.Api.Management;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.DependencyInjection;

namespace TinyMCE.Umbraco.Composing;

internal sealed class TinyMceComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // NOTE: The following line prevents the TinyMCE to Tiptap RTE migration in Umbraco v16+.
        // https://github.com/umbraco/Umbraco-CMS/pull/18843
        // CRITICAL: This must be called FIRST before any other configuration that might fail,
        // otherwise the migration prevention won't be applied if the composer throws an exception.
        builder.Services.Configure<TinyMceToTiptapMigrationSettings>(settings => settings.DisableMigration = true);

        try
        {
            builder
                .Services
                    .AddSingleton<IOperationIdHandler, TinyMceOperationIdHandler>()
                    .ConfigureOptions<TinyMceConfigureSwaggerGenOptions>()
                    .Configure<RichTextEditorSettings>(builder.Config.GetSection("Umbraco:CMS:RichTextEditor"))
                    .Configure<TinyMceConfig>(options =>
                    {
                        // Bind all simple properties first
                        builder.Config.GetSection("TinyMceConfig").Bind(options);

                        // Handle customConfig section separately with proper error handling
                        var tinyMceCustomConfigurationSection = builder.Config.GetSection("TinyMceConfig:customConfig");
                        var customConfigKeys = new Dictionary<string, object>();

                        if (tinyMceCustomConfigurationSection.Exists())
                        {
                            foreach (var child in tinyMceCustomConfigurationSection.GetChildren())
                            {
                                try
                                {
                                    // Bind the entire child section (including its path) to an ExpandoObject
                                    var childObj = ConfigurationBinder.BindToExpandoObject(child);
                                    var childDict = childObj as IDictionary<string, object>;

                                    if (childDict != null && childDict.ContainsKey("TinyMceConfig"))
                                    {
                                        // Navigate down the path: TinyMceConfig -> customConfig -> <child.Key>
                                        var tinyMceConfigDict = childDict["TinyMceConfig"] as IDictionary<string, object>;
                                        if (tinyMceConfigDict != null && tinyMceConfigDict.ContainsKey("customConfig"))
                                        {
                                            var customConfigDict = tinyMceConfigDict["customConfig"] as IDictionary<string, object>;
                                            if (customConfigDict != null && customConfigDict.ContainsKey(child.Key))
                                            {
                                                customConfigKeys.Add(child.Key, customConfigDict[child.Key]);
                                            }
                                        }
                                    }
                                }
                                catch (Exception ex)
                                {
                                    // Log the error but don't fail the entire composer
                                    // This allows the package to still function even if one config key is malformed
                                    System.Diagnostics.Debug.WriteLine($"Error binding customConfig key '{child.Key}': {ex.Message}");
                                }
                            }
                        }

                        options.customConfig = customConfigKeys;
                    });
                    //.AddTransient<IConfigureOptions<TinyMceConfig>, TinyMceConfigPostConfigure>()
        }
        catch (Exception ex)
        {
            // Log the error but allow Umbraco to continue starting up
            // This ensures the TipTap migration prevention is still applied
            System.Diagnostics.Debug.WriteLine($"Error in TinyMceComposer configuration: {ex.Message}");
            throw; // Re-throw to allow debugging but TipTap prevention is already set
        }
    }
}

/// <summary>
/// This pulls the nested items from the appSettings and builds them into objects in the TinyMceConfig
/// </summary>
internal static class ConfigurationBinder
{
    public static ExpandoObject BindToExpandoObject(IConfiguration config)
    {
        var result = new ExpandoObject();

        // retrieve all keys from your settings
        var configs = config.AsEnumerable();
        foreach (var kvp in configs)
        {
            var parent = result as IDictionary<string, object>;
            var path = kvp.Key.Split(':');

            // create or retrieve the hierarchy (keep last path item for later)
            var i = 0;
            for (i = 0; i < path.Length - 1; i++)
            {
                if (!parent.ContainsKey(path[i]))
                {
                    parent.Add(path[i], new ExpandoObject());
                }

                var nextParent = parent[path[i]] as IDictionary<string, object>;
                if (nextParent == null)
                {
                    // Path structure is invalid, skip this configuration value
                    return result;
                }
                parent = nextParent;
            }

            if (kvp.Value == null)
                continue;

            // add the value to the parent
            // note: in case of an array, key will be an integer and will be dealt with later
            var key = path[i];
            parent.Add(key, kvp.Value);
        }

        // at this stage, all arrays are seen as dictionaries with integer keys
        ReplaceWithArray(null, null, result);

        return result;
    }

    private static void ContinueArray(ExpandoObject? parent, string key, object? input)
    {
        if (input == null)
            return;

        var array = input as object[];
        if (array != null)
        {
            foreach (var item in array)
            {
                var dict = item as IDictionary<string, object>;
                if (dict != null)
                {
                    foreach (var childKey in dict.Keys.ToList())
                    {
                        ReplaceWithArray(item as ExpandoObject, childKey, dict[childKey] as ExpandoObject);
                    }
                }
            }
        }
    }

    private static void ReplaceWithArray(ExpandoObject? parent, string? key, ExpandoObject? input)
    {
        if (input == null)
            return;

        var dict = input as IDictionary<string, object>;
        if (dict == null)
            return;

        var keys = dict.Keys.ToArray();

        // it's an array if all keys are integers
        if (keys.All(k => int.TryParse(k, out var dummy)))
        {
            var array = new object[keys.Length];
            foreach (var kvp in dict)
            {
                array[int.Parse(kvp.Key)] = kvp.Value;
            }

            var parentDict = parent as IDictionary<string, object>;
            if (parentDict != null && key != null)
            {
                parentDict.Remove(key);
                parentDict.Add(key, array);

                foreach (var childKey in parentDict.Keys.ToList())
                {
                    ContinueArray(parent, childKey, parentDict[childKey]);
                }
            }
        }
        else
        {
            foreach (var childKey in dict.Keys.ToList())
            {
                ReplaceWithArray(input, childKey, dict[childKey] as ExpandoObject);
            }
        }
    }
}
