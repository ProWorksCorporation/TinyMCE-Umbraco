using System.Dynamic;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using NUnit.Framework;
using ConfigurationBinder = TinyMCE.Umbraco.Composing.ConfigurationBinder;

namespace TinyMCE.Umbraco.Tests.Unit;

/// <summary>
///     Characterisation tests for <see cref="ConfigurationBinder.BindToExpandoObject"/>, which turns the nested
///     <c>TinyMceConfig:customConfig</c> section into the object tree sent to the editor.
/// </summary>
/// <remarks>
///     These assert today's behaviour, including where it looks wrong; each such case is marked "Surprise" and listed
///     in specs/004-upgrade-umbraco-17-8/baseline.md. Change an expectation here only as a deliberate behaviour change.
/// </remarks>
[TestFixture]
public class ConfigurationBinderTests
{
    private const string Section = "TinyMceConfig:customConfig";

    /// <summary>Binds <paramref name="values"/> (keys relative to <see cref="Section"/>) and returns the section's node.</summary>
    private static IDictionary<string, object> BindSection(params (string Key, string? Value)[] values)
    {
        IConfigurationRoot config = new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>($"{Section}:{v.Key}", v.Value)))
            .Build();

        ExpandoObject result = ConfigurationBinder.BindToExpandoObject(config.GetSection(Section));

        // The binder keeps each key's full path, so the section's own values sit under TinyMceConfig -> customConfig.
        var root = (IDictionary<string, object>)(object)result;
        var tinyMceConfig = (IDictionary<string, object>)root["TinyMceConfig"];
        return (IDictionary<string, object>)tinyMceConfig["customConfig"];
    }

    private static object BindScalar(string value) => BindSection(("key", value))["key"];

    // ---- CoerceValue: scalars, in the order bool -> long -> double (NumberStyles.Any, invariant) -> string ----

    [TestCase("true", true)]
    [TestCase("false", false)]
    [TestCase("True", true)]
    [TestCase("FALSE", false)]
    public void Scalar_BooleanText_BecomesBool(string input, bool expected)
    {
        object value = BindScalar(input);

        Assert.That(value, Is.TypeOf<bool>().And.EqualTo(expected));
    }

    [TestCase("42", 42L)]
    [TestCase("-7", -7L)]
    [TestCase("0", 0L)]
    [TestCase(" 42 ", 42L)] // long.TryParse allows surrounding whitespace
    [TestCase("007", 7L)] // Surprise: leading zeros are lost, so a code such as "00501" arrives as 501
    public void Scalar_IntegerText_BecomesLong(string input, long expected)
    {
        object value = BindScalar(input);

        Assert.That(value, Is.TypeOf<long>().And.EqualTo(expected));
    }

    [TestCase("3.5", 3.5d)]
    [TestCase("-0.25", -0.25d)]
    [TestCase("1e3", 1000d)]
    [TestCase("9223372036854775808", 9223372036854775808d)] // one past long.MaxValue falls through to double
    [TestCase("1,000", 1000d)] // Surprise: NumberStyles.Any accepts thousands separators
    [TestCase("(5)", -5d)] // Surprise: NumberStyles.Any accepts accounting-style parentheses as a negative sign
    [TestCase("Infinity", double.PositiveInfinity)] // Surprise: the word becomes a number
    public void Scalar_NumericText_BecomesDouble(string input, double expected)
    {
        object value = BindScalar(input);

        Assert.That(value, Is.TypeOf<double>().And.EqualTo(expected));
    }

    [Test]
    public void Scalar_NaNText_BecomesDoubleNaN()
    {
        // Surprise: the string "NaN" becomes double.NaN, which System.Text.Json refuses to serialize by default.
        object value = BindScalar("NaN");

        Assert.That(value, Is.TypeOf<double>());
        Assert.That(double.IsNaN((double)value), Is.True);
    }

    [TestCase("hello")]
    [TestCase("raw")]
    [TestCase("%%")]
    [TestCase("")]
    [TestCase("1.2.3")]
    [TestCase("[\"fullscreen\"]")] // a JSON-looking string is not parsed here; the client does that
    public void Scalar_OtherText_StaysString(string input)
    {
        object value = BindScalar(input);

        Assert.That(value, Is.TypeOf<string>().And.EqualTo(input));
    }

    // ---- Structure ----

    [Test]
    public void NestedObject_BecomesNestedExpandoObjects()
    {
        IDictionary<string, object> node = BindSection(("outer:inner:leaf", "x"), ("outer:flag", "true"));

        var outer = (IDictionary<string, object>)node["outer"];
        var inner = (IDictionary<string, object>)outer["inner"];
        Assert.That(outer, Is.TypeOf<ExpandoObject>());
        Assert.That(inner["leaf"], Is.EqualTo("x"));
        Assert.That(outer["flag"], Is.EqualTo(true));
    }

    [Test]
    public void Array_OfScalars_BecomesObjectArrayInIndexOrder()
    {
        IDictionary<string, object> node = BindSection(("list:0", "a"), ("list:1", "b"), ("list:2", "3"));

        Assert.That(node["list"], Is.TypeOf<object[]>());
        Assert.That((object[])node["list"], Is.EqualTo(new object[] { "a", "b", 3L }));
    }

    [Test]
    public void Array_WithMoreThanTenItems_KeepsNumericOrder()
    {
        (string, string?)[] values = Enumerable.Range(0, 12).Select(i => ($"list:{i}", (string?)$"item{i}")).ToArray();

        IDictionary<string, object> node = BindSection(values);

        Assert.That((object[])node["list"], Is.EqualTo(Enumerable.Range(0, 12).Select(i => (object)$"item{i}").ToArray()));
    }

    [Test]
    public void Array_OfObjects_BecomesObjectArrayOfExpandoObjects()
    {
        IDictionary<string, object> node = BindSection(
            ("items:0:title", "A"),
            ("items:0:count", "1"),
            ("items:1:title", "B"));

        var items = (object[])node["items"];
        Assert.That(items, Has.Length.EqualTo(2));
        var first = (IDictionary<string, object>)items[0];
        var second = (IDictionary<string, object>)items[1];
        Assert.That(first["title"], Is.EqualTo("A"));
        Assert.That(first["count"], Is.EqualTo(1L));
        Assert.That(second["title"], Is.EqualTo("B"));
    }

    [Test]
    public void Array_InsideObjectInsideArray_IsConverted()
    {
        // The mergetags_list shape: an array of objects, each holding an array of objects.
        IDictionary<string, object> node = BindSection(
            ("groups:0:title", "Customer"),
            ("groups:0:menu:0:value", "Customer.Name"),
            ("groups:0:menu:1:value", "Customer.Title"));

        var group = (IDictionary<string, object>)((object[])node["groups"])[0];
        var menu = (object[])group["menu"];
        Assert.That(menu, Has.Length.EqualTo(2));
        Assert.That(((IDictionary<string, object>)menu[1])["value"], Is.EqualTo("Customer.Title"));
    }

    [Test]
    public void Array_NestedDirectlyInArray_StaysExpandoObjectWithIndexKeys()
    {
        // Surprise: ContinueArray only recurses into the *properties* of object items, so an array whose items are
        // themselves arrays converts only its outer level. The inner arrays reach the editor as {"0": …, "1": …}.
        IDictionary<string, object> node = BindSection(
            ("grid:0:0", "a"),
            ("grid:0:1", "b"),
            ("grid:1:0", "c"));

        var grid = (object[])node["grid"];
        Assert.That(grid, Has.Length.EqualTo(2));
        Assert.That(grid[0], Is.TypeOf<ExpandoObject>());
        var row = (IDictionary<string, object>)grid[0];
        Assert.That(row.Keys, Is.EquivalentTo(new[] { "0", "1" }));
        Assert.That(row["0"], Is.EqualTo("a"));
        Assert.That(row["1"], Is.EqualTo("b"));
    }

    [Test]
    public void ObjectWithSomeNumericKeys_StaysObject()
    {
        IDictionary<string, object> node = BindSection(("mixed:0", "zero"), ("mixed:name", "n"));

        var mixed = (IDictionary<string, object>)node["mixed"];
        Assert.That(mixed, Is.TypeOf<ExpandoObject>());
        Assert.That(mixed["0"], Is.EqualTo("zero"));
        Assert.That(mixed["name"], Is.EqualTo("n"));
    }

    // ---- Golden case: the TestSite's real configuration ----

    [Test]
    public void TestSiteCustomConfig_BindsToTheSameTreeAsTheJson()
    {
        // The TestSite appsettings.json is linked into the test output (see the .csproj). The binder's output is
        // compared with an independent reading of the same file by System.Text.Json, so the expectation can't drift
        // from the file: every bool, string, array and nested object in customConfig must come through unchanged.
        string path = Path.Combine(TestContext.CurrentContext.TestDirectory, "TestData", "TestSite.appsettings.json");

        IConfigurationRoot config = new ConfigurationBuilder().AddJsonFile(path, optional: false).Build();
        var bound = (IDictionary<string, object>)(object)ConfigurationBinder.BindToExpandoObject(config.GetSection(Section));
        object customConfig = ((IDictionary<string, object>)bound["TinyMceConfig"])["customConfig"];

        JsonNode? actual = JsonSerializer.SerializeToNode(customConfig);
        JsonNode? expected = JsonNode.Parse(
            File.ReadAllText(path),
            documentOptions: new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true })
            ?["TinyMceConfig"]?["customConfig"];

        Assert.That(expected, Is.Not.Null);
        Assert.That(
            JsonNode.DeepEquals(actual, expected),
            Is.True,
            $"Expected:{Environment.NewLine}{expected}{Environment.NewLine}Actual:{Environment.NewLine}{actual}");
    }

    [Test]
    public void TestSiteCustomConfig_HasTheExpectedTopLevelKeysAndTypes()
    {
        // A readable companion to the golden comparison above.
        string path = Path.Combine(TestContext.CurrentContext.TestDirectory, "TestData", "TestSite.appsettings.json");
        IConfigurationRoot config = new ConfigurationBuilder().AddJsonFile(path, optional: false).Build();
        var bound = (IDictionary<string, object>)(object)ConfigurationBinder.BindToExpandoObject(config.GetSection(Section));
        var customConfig = (IDictionary<string, object>)((IDictionary<string, object>)bound["TinyMceConfig"])["customConfig"];

        Assert.Multiple(() =>
        {
            Assert.That(customConfig["table_advtab"], Is.EqualTo(false));
            Assert.That(customConfig["table_row_advtab"], Is.EqualTo(false));
            Assert.That(customConfig["table_cell_advtab"], Is.EqualTo(false));
            Assert.That(customConfig["spellchecker_ignore_list"], Is.EqualTo(new object[] { "senectus", "malesuada" }));
            Assert.That(customConfig["mergetags_prefix"], Is.EqualTo("%%"));
            Assert.That(customConfig["mergetags_suffix"], Is.EqualTo("%%"));
            Assert.That((object[])customConfig["advtemplate_templates"], Has.Length.EqualTo(1));
            Assert.That((object[])customConfig["mergetags_list"], Has.Length.EqualTo(3));
        });
    }
}
