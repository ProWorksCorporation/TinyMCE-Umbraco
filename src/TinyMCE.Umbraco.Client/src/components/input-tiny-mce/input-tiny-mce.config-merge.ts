// Configuration-merge helpers for `umb-input-tiny-mce`. Internal: not exported from src/index.ts, so not part of the
// npm package's public API. They live in their own module so they can be unit-tested.

// Merges plugin lists into the flat `string[]` TinyMCE expects, dropping anything that is not a
// string. That filtering is load-bearing, not defensive dressing: TinyMCE trims every plugin name with
// `String.replace` (`trim$4`, called from its plugin-list parser), so a single non-string entry throws
// during editor construction and the editor never renders at all.
//
// Non-strings do reach here from configuration. `Umbraco:CMS:RichTextEditor:CustomConfig` binds into an
// `IDictionary<string, object>`, so a value written as a real JSON array has no scalar to bind and
// arrives as an object rather than a list. The supported way to express a list there is a JSON *string*
// - `"plugins": "[\"fullscreen\"]"` - which `parseJsonStringValues` turns back into a real array.
export function mergeArrays(arr1: unknown, arr2: unknown): string[] {
	const toStringList = (value: unknown): string[] => {
		if (typeof value === 'string') return [value];
		if (!Array.isArray(value)) return [];

		return value.filter((entry): entry is string => typeof entry === 'string');
	};

	return Array.from(new Set([...toStringList(arr1), ...toStringList(arr2)]));
}

// Some config paths (e.g. Umbraco:CMS:RichTextEditor:CustomConfig) can only store scalar string
// values via the .NET config binder. Complex TinyMCE options like style_formats were historically
// stored as JSON strings in Umbraco v13. This function parses those JSON strings back into real
// objects/arrays so TinyMCE receives the correct types.
export function parseJsonStringValues(config: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(config)) {
		if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
			try {
				result[key] = JSON.parse(value);
			} catch {
				result[key] = value;
			}
		} else {
			result[key] = value;
		}
	}
	return result;
}
