# Hosting TinyMCE 7 or 8 Via Cloud CDN
These are instructions for loading TinyMCE version 7 or 8 via the TinyMCE cloud CDN instead of referencing TinyMCE version 6 through the TinyMCE.Umbraco package which is the default behavior.

## Explanation
You load the TinyMCE files from the cloud by registering your own `bundle` extension that imports them. Doing so sets the `window.tinymce` global, and TinyMCE.Umbraco then skips the core it ships with entirely - the packaged core is only loaded on demand, and only when nothing else has provided one.

## Licensing
See TinyMCE's licensing documentation here:
 - Version 7: https://www.tiny.cloud/docs/tinymce/7/license-key/
 - Version 8: https://www.tiny.cloud/docs/tinymce/8/license-key/

## Steps
1. Create a new folder in your Umbraco project in the App_Plugins directory like `/wwwroot/App_Plugins/TinyMCE.OnPrem`
1. Create the following files in the `wwwroot/App_Plugins/TinyMCE.OnPrem` directory
    - `umbraco-package.json`
        ```
        {
            "id": "TinyMCE.OnPrem",
            "name": "TinyMCE.OnPrem",
            "version": "8",
            "extensions": [
                {
                    "type": "bundle",
                    "alias": "tinyMceLibOnPremises",
                    "name": "TinyMCE Umbraco On Premise Configuration",
                    "overwrites": "TinyMCE.Lib",
                    "js": "/App_Plugins/TinyMCE.OnPrem/manifests.js"
                }
            ]
        }
        ```

    - `manifests.js`
        ```
        import "https://cdn.tiny.cloud/1/no-api-key/tinymce/8/tinymce.min.js";
        import "https://cdn.tiny.cloud/1/no-api-key/tinymce/8/icons/default/icons.min.js";
        ```
2. Replace `no-api-key` in the import URLs above with your Cloud API key.
3. Update the configuration in your appsettings.json with the following:
    ```
    "TinyMceConfig": {
        "tinyMceVersion": "8",
        "apikey": "<api-key>"
    }
    ```


> **Note on `overwrites`:** the `"overwrites": "TinyMCE.Lib"` line above is optional. Umbraco applies
> `overwrites` only to extensions rendered through extension slots, never to `bundle` extensions, so it
> neither suppresses the packaged TinyMCE nor is it required — it is kept in this example so existing
> configurations remain valid. What matters is that your bundle imports a TinyMCE core: doing so claims
> the `window.tinymce` global, and TinyMCE.Umbraco then never loads the core it ships with.
