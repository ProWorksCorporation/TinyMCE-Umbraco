# CLAUDE.md - TinyMCE.Umbraco.TestSite

This file provides guidance to Claude Code when working with the **TinyMCE.Umbraco.TestSite** project.

## Project Overview

This is a development test site (.NET 10.0, ASP.NET Core Web) running Umbraco CMS 17.1.0 with the TinyMCE.Umbraco package installed. It's configured for unattended installation to streamline development and testing workflows.

## Running the Test Site

```bash
# Navigate to project directory
cd src/TinyMCE.Umbraco.TestSite

# Run the site
dotnet run

# Run with specific launch profile
dotnet run --launch-profile "TinyMCE.Umbraco.TestSite"
```

The site will typically start at `https://localhost:44308` (check Properties/launchSettings.json for exact URL).

## Default Credentials

The site uses unattended install with credentials defined in appsettings.json:38:
- **Username**: `admin@example.com`
- **Email**: `admin@example.com`
- **Password**: `1234567890`

These credentials are created automatically on first run.

## Configuration

### Umbraco Settings

The appsettings.json includes:

**Global Settings**:
- Unattended install enabled
- `SanitizeTinyMce: true` - Umbraco sanitizes TinyMCE content

**RichTextEditor Settings** (appsettings.json:25):
- Custom `ValidElements` configuration
- `InvalidElements: "font|blink"`
- Example plugins: `["mentions"]`
- Custom config for spellchecker and entity encoding

### TinyMCE Configuration Examples

The test site demonstrates advanced TinyMCE configuration (appsettings.json:46):

**API Keys** (commented out, use User Secrets):
```json
{
  "apikey": "Add To User Secrets",
  "openAiApikey": "Add To User Secrets"
}
```

**OpenAI Configuration**:
- Model: `gpt-5`
- Developer message for AI assistant context
- Max completion tokens: 1000

**Custom Config Examples**:
- Spell checker ignore list
- Advanced templates (`advtemplate_templates`) with quick reply templates
- Merge tags configuration with custom prefix/suffix (`%%`)
- Merge tag list with Customer, Vendor, and Company categories

These examples demonstrate premium TinyMCE features and serve as templates for development.

## Project Structure

```
TinyMCE.Umbraco.TestSite/
├── appsettings.json              # Main configuration
├── appsettings.Development.json  # Development overrides
├── appsettings-schema.json       # JSON schema references
├── Program.cs                    # Application entry point
├── umbraco/                      # Umbraco data folder
├── uSync/                        # uSync export/import data
├── Views/                        # Razor views
└── wwwroot/                      # Static files
    └── App_Plugins/             # Plugin assets (includes TinyMCE after build)
```

## Dependencies

- `Umbraco.Cms` 17.1.0 - Main Umbraco CMS package
- Umbraco API packages (Common, Management, Website)
- `Umbraco.Cms.DevelopmentMode.Backoffice` 17.1.0 - Development tools
- `uSync` 17.0.1 - Content synchronization
- Project reference to `../TinyMCE.Umbraco/TinyMCE.Umbraco.csproj`

## Program.cs

Standard Umbraco configuration (Program.cs:1):
1. Create Umbraco builder
2. Add backoffice, website, and composers
3. Boot Umbraco
4. Configure middleware and endpoints
5. Run application

The TinyMCE package is discovered via the project reference and its composer (`TinyMceComposer`) is automatically registered.

## Development Workflow

### Testing Package Changes

1. **Modify Client Code**:
   - Edit TypeScript in `TinyMCE.Umbraco.Client/src/`
   - Run `npm run build` or `npm run dev` in Client project
   - Assets copy to `TinyMCE.Umbraco/wwwroot/`

2. **Modify Backend Code**:
   - Edit C# in `TinyMCE.Umbraco/`
   - Rebuild the package project

3. **Rebuild Test Site**:
   ```bash
   dotnet build
   ```

4. **Run Test Site**:
   ```bash
   dotnet run
   ```

5. **Test in Browser**:
   - Navigate to `https://localhost:44308/umbraco`
   - Log in with default credentials
   - Go to Settings > Data Types
   - Create or edit a TinyMCE Rich Text Editor data type
   - Test in Content section

### Using uSync

The test site includes uSync for content synchronization:
- Export content, data types, and settings to `uSync/` folder
- Commit to git for sharing test configurations
- Import on other machines or after database reset

### Database Location

Umbraco stores its database in:
- `umbraco/Data/Umbraco.sqlite.db` (SQLite by default)

To reset the site:
1. Stop the application
2. Delete the `umbraco/` folder
3. Run again - unattended install will recreate everything

## Testing TinyMCE Features

### Testing Premium Plugins

1. Add your TinyMCE API key to User Secrets:
   ```bash
   dotnet user-secrets set "TinyMceConfig:apikey" "your-api-key-here"
   ```

2. Update appsettings.json to enable plugins in RichTextEditor:Plugins array

3. Restart the site

4. Premium plugins will now be available in Data Type configuration

### Testing AI Features

1. Add OpenAI API key to User Secrets:
   ```bash
   dotnet user-secrets set "TinyMceConfig:openAiApikey" "your-openai-key"
   ```

2. Configure `openAiApiConfig` in appsettings.json as needed

3. AI features will be available in the editor

### Testing Custom Configuration

Modify `TinyMceConfig:customConfig` in appsettings.json to test:
- Plugin-specific configurations
- Custom templates
- Merge tags
- Toolbar customization
- Any TinyMCE configuration option

The nested JSON structure supports complex configurations as demonstrated in the example merge tags and templates.

## Debugging

### Backend Debugging

1. Set breakpoints in TinyMCE.Umbraco C# code
2. Run test site in debug mode (F5 in Visual Studio or `dotnet run` with debugger attached)
3. Breakpoints in the referenced project will be hit

### Frontend Debugging

1. Build Client project with source maps: `npm run build` (source maps enabled by default)
2. Open browser DevTools
3. Navigate to Sources > webpack://
4. Set breakpoints in TypeScript source
5. Reload Umbraco backoffice

### API Debugging

The Swagger UI is available at:
- `https://localhost:44308/umbraco/swagger/`

TinyMCE endpoints are under the "TinyMCE" group.

## Common Issues

**Assets Not Loading**:
- Ensure Client project was built before running TestSite
- Check that `wwwroot/App_Plugins/TinyMCE.Umbraco/` exists in the main package

**Configuration Not Applied**:
- Verify appsettings.json syntax (JSON must be valid)
- Check User Secrets for API keys
- Restart the application after config changes

**Database Locked**:
- Ensure no other instance is running
- Delete `umbraco/Data/*.db-*` lock files if needed

## User Secrets

Store sensitive configuration in User Secrets:

```bash
# Set TinyMCE API key
dotnet user-secrets set "TinyMceConfig:apikey" "your-key"

# Set OpenAI API key
dotnet user-secrets set "TinyMceConfig:openAiApikey" "your-key"

# View all secrets
dotnet user-secrets list
```

User Secrets are stored outside the project directory and never committed to git.
