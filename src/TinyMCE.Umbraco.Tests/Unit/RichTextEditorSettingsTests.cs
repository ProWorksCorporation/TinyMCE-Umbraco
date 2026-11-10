using System.Text.RegularExpressions;
using NUnit.Framework;

namespace TinyMCE.Umbraco.Tests.Unit;

/// <summary>
///     Characterisation tests for <see cref="RichTextEditorSettings"/>: boolean normalisation of <c>CustomConfig</c>,
///     and the default <c>ValidElements</c>. These assert today's behaviour; surprises are marked and listed in
///     specs/004-upgrade-umbraco-17-8/baseline.md.
/// </summary>
[TestFixture]
public class RichTextEditorSettingsTests
{
    // ---- NormalizeBooleanCustomConfig ----

    [TestCase("true", true)]
    [TestCase("false", false)]
    [TestCase("True", true)]
    [TestCase("False", false)]
    [TestCase("TRUE", true)]
    [TestCase("1", true)]
    [TestCase("0", false)]
    public void Normalize_RecognisedStringOnAdvTabKey_BecomesBool(string raw, bool expected)
    {
        var bag = new Dictionary<string, object> { ["table_advtab"] = raw };

        RichTextEditorSettings.NormalizeBooleanCustomConfig(bag);

        Assert.That(bag["table_advtab"], Is.TypeOf<bool>().And.EqualTo(expected));
    }

    [TestCase("table_advtab")]
    [TestCase("table_row_advtab")]
    [TestCase("table_cell_advtab")]
    public void Normalize_AppliesToEachOfTheThreeAdvTabKeys(string key)
    {
        var bag = new Dictionary<string, object> { [key] = "false" };

        RichTextEditorSettings.NormalizeBooleanCustomConfig(bag);

        Assert.That(bag[key], Is.EqualTo(false));
    }

    [TestCase("yes")]
    [TestCase("no")]
    [TestCase("")]
    [TestCase("2")]
    public void Normalize_UnrecognisedString_IsLeftAsIs(string raw)
    {
        var bag = new Dictionary<string, object> { ["table_advtab"] = raw };

        RichTextEditorSettings.NormalizeBooleanCustomConfig(bag);

        Assert.That(bag["table_advtab"], Is.EqualTo(raw));
    }

    [Test]
    public void Normalize_PaddedTrue_BecomesTrue()
    {
        // bool.TryParse ignores leading and trailing whitespace.
        var bag = new Dictionary<string, object> { ["table_advtab"] = " true " };

        RichTextEditorSettings.NormalizeBooleanCustomConfig(bag);

        Assert.That(bag["table_advtab"], Is.EqualTo(true));
    }

    [Test]
    public void Normalize_OtherKeys_AreNotTouched()
    {
        // Only the three table *_advtab keys are normalised; any other boolean-looking string stays a string.
        var bag = new Dictionary<string, object> { ["browser_spellcheck"] = "true", ["paste_as_text"] = "1" };

        RichTextEditorSettings.NormalizeBooleanCustomConfig(bag);

        Assert.That(bag["browser_spellcheck"], Is.EqualTo("true"));
        Assert.That(bag["paste_as_text"], Is.EqualTo("1"));
    }

    [Test]
    public void Normalize_NonStringValues_AreNotTouched()
    {
        var nested = new Dictionary<string, object> { ["table_advtab"] = "false" };
        var bag = new Dictionary<string, object>
        {
            ["table_advtab"] = true,
            ["table_row_advtab"] = 0L,
            ["table_cell_advtab"] = nested,
        };

        RichTextEditorSettings.NormalizeBooleanCustomConfig(bag);

        Assert.That(bag["table_advtab"], Is.EqualTo(true));
        Assert.That(bag["table_row_advtab"], Is.EqualTo(0L)); // a numeric 0 is not converted, only the string "0"
        Assert.That(bag["table_cell_advtab"], Is.SameAs(nested));
        Assert.That(nested["table_advtab"], Is.EqualTo("false"), "nested dictionaries are not walked");
    }

    [Test]
    public void Normalize_MissingKeys_AddsNothing()
    {
        var bag = new Dictionary<string, object> { ["entity_encoding"] = "raw" };

        RichTextEditorSettings.NormalizeBooleanCustomConfig(bag);

        Assert.That(bag.Keys, Is.EqualTo(new[] { "entity_encoding" }));
    }

    [Test]
    public void DefaultCustomConfig_IsOneDictionarySharedByEveryInstance()
    {
        // Surprise: NormalizeBooleanCustomConfig mutates its argument in place, and every RichTextEditorSettings
        // created without configuration shares one static default CustomConfig dictionary, so normalising one
        // instance's defaults normalises them all. Harmless today (the default holds none of the three keys), but
        // worth knowing before adding keys to it.
        var a = new RichTextEditorSettings();
        var b = new RichTextEditorSettings();

        Assert.That(a.CustomConfig, Is.SameAs(b.CustomConfig));
        Assert.That(a.CustomConfig["entity_encoding"], Is.EqualTo("raw"));
    }

    // ---- Default ValidElements ----

    /// <summary>The attribute list of the default <c>+a[...]</c> rule, as of package 17.6.3.</summary>
    private static readonly string[] ExpectedAnchorAttributes =
    [
        "id", "style", "rel", "data-id", "data-udi", "rev", "charset", "hreflang", "dir", "lang", "tabindex",
        "accesskey", "type", "name", "href", "target", "title", "class", "onfocus", "onblur", "onclick", "ondblclick",
        "onmousedown", "onmouseup", "onmouseover", "onmousemove", "onmouseout", "onkeypress", "onkeydown", "onkeyup",
    ];

    private static string[] AnchorAttributes(string validElements)
    {
        Match match = Regex.Match(validElements, @"(?:^|,)\+a\[(?<attrs>[^\]]*)\]");
        Assert.That(match.Success, Is.True, "no +a[...] rule found");
        return match.Groups["attrs"].Value.Split('|');
    }

    [Test]
    public void DefaultValidElements_AnchorRule_HasTodaysAttributeList()
    {
        string[] attributes = AnchorAttributes(new RichTextEditorSettings().ValidElements);

        Assert.That(attributes, Is.EqualTo(ExpectedAnchorAttributes));
    }

    [Test]
    public void DefaultValidElements_IsTheStaticConstant()
    {
        Assert.That(new RichTextEditorSettings().ValidElements, Is.EqualTo(RichTextEditorSettings.StaticValidElements));
        Assert.That(new RichTextEditorSettings().InvalidElements, Is.EqualTo("font"));
    }
}
