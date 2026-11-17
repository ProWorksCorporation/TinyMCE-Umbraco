# Hosting TinyMCE GPLv2+ On Premises
These are instructions for hosting the version 7 or 8 GPLv2+ Open Source licensed TinyMCE files on premises instead of referencing TinyMCE version 6 through the TinyMCE.Umbraco package which is the default behavior.

## Explanation
You load your own on premises TinyMCE files by registering your own `bundle` extension that imports them. Doing so sets the `window.tinymce` global, and TinyMCE.Umbraco then skips the core it ships with entirely - the packaged core is only loaded on demand, and only when nothing else has provided one.

## Licensing
See TinyMCE's licensing documentation here:
 - Version 7: https://www.tiny.cloud/docs/tinymce/7/license-key/
 - Version 8: https://www.tiny.cloud/docs/tinymce/8/license-key/

## Steps
1. Create a new folder in your Umbraco project in the App_Plugins directory like `/wwwroot/App_Plugins/TinyMCE.OnPrem`
1. Download the Open Source TinyMCE files from the Tiny.cloud website: [Get TinyMCE](https://www.tiny.cloud/get-tiny/)
1. Extract the TinyMCE files and find the `tinymce` folder within. Copy that folder to your Umbraco site at `wwwroot/App_Plugins/TinyMCE.OnPrem/`. *Note: it may be easiest to pull the `tinymce` folder nested under the `js` folder out into the `TinyMCE.OnPrem` folder.*
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
        import "./tinymce/tinymce.js";
        import "./tinymce/icons/default/icons.js";
        ```
2. Update the configuration in your appsettings.json with the following:
    ```
    "TinyMceConfig": {
        "tinyMceVersion": "8",
        "tinyMceUrl": "/App_Plugins/TinyMCE.OnPrem/tinymce/",
        "apikey": "on-prem",
        "customConfig": {
            "license_key": "gpl"
        }
    }
    ```


> **Note on `overwrites`:** the `"overwrites": "TinyMCE.Lib"` line above is optional. Umbraco applies
> `overwrites` only to extensions rendered through extension slots, never to `bundle` extensions, so it
> neither suppresses the packaged TinyMCE nor is it required — it is kept in this example so existing
> configurations remain valid. What matters is that your bundle imports a TinyMCE core: doing so claims
> the `window.tinymce` global, and TinyMCE.Umbraco then never loads the core it ships with.
