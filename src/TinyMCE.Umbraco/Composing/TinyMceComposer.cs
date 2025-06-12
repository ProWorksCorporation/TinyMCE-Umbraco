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
        builder
            .Services
                .AddSingleton<IOperationIdHandler, TinyMceOperationIdHandler>()
                .ConfigureOptions<TinyMceConfigureSwaggerGenOptions>()
                .Configure<RichTextEditorSettings>(builder.Config.GetSection("Umbraco:CMS:RichTextEditor"))
                .Configure<TinyMceConfig>(options =>
                {
                    builder.Config.GetSection("TinyMceConfig").Bind(options);

                    var tinyMceCustomConfigurationSection = builder.Config.GetSection("TinyMceConfig:customConfig");
                    var customConfigKeys = new Dictionary<string, object>();
                    foreach (var child in tinyMceCustomConfigurationSection.GetChildren())
                    {
                        dynamic obj = ConfigurationBinder.BindToExpandoObject(child);
                        dynamic customConfigObj = ((IDictionary<string, object>)obj.TinyMceConfig.customConfig).First().Value;
                        //string valueAsText = System.Text.Json.JsonSerializer.Serialize(customConfigObj);
                        //if (customConfigObj is string)
                        //{   // Added this because the Serialize call above encodes double-quotes in strings
                        //    valueAsText = customConfigObj;
                        //}
                        //customConfigKeys.Add(child.Key, valueAsText);
                        customConfigKeys.Add(child.Key, customConfigObj);
                    }

                    options.customConfig = customConfigKeys;
                })
                //.AddTransient<IConfigureOptions<TinyMceConfig>, TinyMceConfigPostConfigure>()

                // NOTE: The follow line prevents the TinyMCE to Tiptap RTE migration in Umbraco v16.
                // https://github.com/umbraco/Umbraco-CMS/pull/18843
                .Configure<TinyMceToTiptapMigrationSettings>(settings => settings.DisableMigration = true)
        ;
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

                parent = parent[path[i]] as IDictionary<string, object>;
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

    private static void ContinueArray(ExpandoObject parent, string key, object input)
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
                    var keys = dict.Keys.ToArray();

                    foreach (var childKey in dict.Keys.ToList())
                    {
                        ReplaceWithArray(item as ExpandoObject, childKey, dict[childKey] as ExpandoObject);
                    }
                }
            }
        }
    }

    private static void ReplaceWithArray(ExpandoObject parent, string key, ExpandoObject input)
    {
        if (input == null)
            return;

        var dict = input as IDictionary<string, object>;
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
            parentDict.Remove(key);
            parentDict.Add(key, array);

            foreach (var childKey in parentDict.Keys.ToList())
            {
                ContinueArray(parent, childKey, parentDict[childKey]);
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
