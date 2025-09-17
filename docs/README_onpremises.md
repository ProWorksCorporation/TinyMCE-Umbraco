# Hosting TinyMCE On Premises
These are instructions for hosting the TinyMCE files on premises instead of referencing them through the TinyMCE CDN which is the default behavior. 

## Explanation
The loading of the TinyMCE files happens within an extension with an alias of `TinyMCE.Lib`. This extension can be swapped out with your own extension using the `overwrites` property. In this way, you can load in your own on premises TinyMCE files and prevent Umbraco.TinyMCE from loading the files from the cloud itself.

## Licensing
See TinyMCE's licensing documentation here
https://www.tiny.cloud/docs/tinymce/7/license-key/

## Steps
1. Create a new folder in your Umbraco project in the App_Plugins directory like `/wwwroot/App_Plugins/TinyMCE`
1. Download the self hosted TinyMCE files from [TinyMCE](https://www.tiny.cloud/my-account/downloads/)
1. Extract the self hosted TinyMCE files and find the `tinymce` folder within. Copy that folder to your Umbraco site at `/App_Plugins/TinyMCE/`
1. Create the following files in the `/App_Plugins/TinyMCE` directory
    - `umbraco-package.json`
        ```
        {
            "id": "TinyMCE.OnPrem",
            "name": "TinyMCE.OnPrem",
            "version": "6",
            "extensions": [
                {
                    "type": "bundle",
                    "alias": "tinyMceLibOnPremises",
                    "name": "TinyMCE Umbraco Mentions Plugin Configuration",
                    "overwrites": "TinyMCE.Lib", // This alias, "TinyMCE.Lib", is important
                    "js": "/App_Plugins/TinyMCE/manifests.js"
                }
            ]
        }
        ```
    - `manifests.js`
        ```
        import "./tinymce7/tinymce.js";
        import "./tinymce7/icons/default/icons.js";
        ```
2. Update the configuration in your appsettings.json with the following:
    ```
    "TinyMceConfig": {
        "tinyMceVersion": "7",
        "tinyMceUrl": "/App_Plugins/TinyMCE/tinymce/",
        "apikey": "on-prem",
        "customConfig": {
        "license_key": "<license_key>"
        }
    }
    ```

