# Hosting TinyMCE 7 or 8 Via Cloud CDN
These are instructions for loading TinyMCE version 7 or 8 via the TinyMCE cloud CDN instead of referencing TinyMCE version 6 through the TinyMCE.Umbraco package which is the default behavior.

## Explanation
The loading of the TinyMCE files happens within an extension with an alias of `TinyMCE.Lib`. This extension can be swapped out with your own extension using the `overwrites` property. In this way, you can load the TinyMCE files from the cloud itself and prevent loading the version included in the TinyMCE.Umbraco package.

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

    - **NOTE:  The alias, "TinyMCE.Lib" in the "overwrites" section above, is important**

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

