# Hosting TinyMCE GPLv2+ On Premises
These are instructions for hosting the version 7 or 8 GPLv2+ Open Source licensed TinyMCE files on premises instead of referencing TinyMCE version 6 through the TinyMCE.Umbraco package which is the default behavior.

## Explanation
The loading of the TinyMCE files happens within an extension with an alias of `TinyMCE.Lib`. This extension can be swapped out with your own extension using the `overwrites` property. In this way, you can load in your own on premises TinyMCE files and prevent Umbraco.TinyMCE from loading the files from the package.

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

    - **NOTE:  The alias, "TinyMCE.Lib" in the "overwrites" section above, is important**

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
            license_key": "gpl"
        }
    }
    ```

