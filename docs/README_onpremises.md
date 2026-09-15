# Hosting TinyMCE On Premises
These are instructions for hosting the TinyMCE files on premises instead of referencing them through the TinyMCE CDN which is the default behavior. 

## Explanation
You load your own on premises TinyMCE files by registering your own `bundle` extension that imports them. Doing so sets the `window.tinymce` global, and TinyMCE.Umbraco then skips the core it ships with entirely - the packaged core is only loaded on demand, and only when nothing else has provided one.

## Licensing
See TinyMCE's licensing documentation here:
 - Version 7: https://www.tiny.cloud/docs/tinymce/7/license-key/
 - Version 8: https://www.tiny.cloud/docs/tinymce/8/license-key/

## Steps
1. Create a new folder in your Umbraco project in the App_Plugins directory like `/wwwroot/App_Plugins/TinyMCE.OnPrem`
1. Download the self hosted TinyMCE files from [TinyMCE Account Downloads](https://www.tiny.cloud/my-account/downloads/)
1. Extract the self hosted TinyMCE files and find the `tinymce` folder within. Copy that folder to your Umbraco site at `wwwroot/App_Plugins/TinyMCE.OnPrem/`
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
        import "./tinymce8/tinymce.js";
        import "./tinymce8/icons/default/icons.js";
        ```
2. Update the configuration in your appsettings.json with the following:
    ```
    "TinyMceConfig": {
        "tinyMceVersion": "8",
        "tinyMceUrl": "/App_Plugins/TinyMCE/tinymce8/",
        "apikey": "on-prem",
        "customConfig": {
            license_key": "<license_key>"
        }
    }
    ```


    - **NOTE: `overwrites` above is not what does the work here.** Umbraco ignores the `overwrites` property on
      `bundle` extensions - `UmbBundleExtensionInitializer` reads the registry by type and never applies
      overwrite filtering - so it neither suppresses `TinyMCE.Lib` nor is it required. It is kept in this
      example only so that existing configurations remain valid. What actually matters is that your bundle
      imports a TinyMCE core, which claims the `window.tinymce` global before any editor is rendered.
