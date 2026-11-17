using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace TinyMCE.Umbraco.Tests.Infrastructure;

/// <summary>
///     Test-only <see cref="ILogger{TCategoryName}"/> that records every entry at every level, so tests can assert both
///     what is logged and what never is.
/// </summary>
/// <remarks>
///     Registered as a closed-generic <c>ILogger&lt;T&gt;</c>, never through a logger factory: Umbraco's test server
///     replaces <see cref="ILoggerFactory"/> after the test's own service setup, so a provider added there receives
///     nothing (research R6). Never registered by the package itself.
/// </remarks>
public sealed class CapturingLogger<T> : ILogger<T>
{
    private readonly ConcurrentQueue<Entry> _entries = new();

    /// <summary>One captured log entry.</summary>
    /// <param name="Level">The level it was written at.</param>
    /// <param name="Template">The message template (<c>{OriginalFormat}</c>), or <c>null</c> for an unstructured entry.</param>
    /// <param name="Message">The rendered message.</param>
    /// <param name="Properties">The structured values, keyed by name (excluding <c>{OriginalFormat}</c>).</param>
    /// <param name="Exception">The exception logged with it, if any.</param>
    public sealed record Entry(
        LogLevel Level,
        string? Template,
        string Message,
        IReadOnlyDictionary<string, object?> Properties,
        Exception? Exception)
    {
        /// <summary>Everything in the entry as one string, for "never contains" assertions.</summary>
        public string AllText =>
            string.Join(
                "\n",
                new[] { Template ?? "", Message, Exception?.ToString() ?? "" }
                    .Concat(Properties.Select(p => $"{p.Key}={p.Value}")));
    }

    /// <summary>The entries captured so far, in order.</summary>
    public IReadOnlyList<Entry> Entries => _entries.ToArray();

    /// <summary>Removes every captured entry.</summary>
    public void Clear() => _entries.Clear();

    /// <inheritdoc />
    public IDisposable? BeginScope<TState>(TState state)
        where TState : notnull => null;

    /// <inheritdoc />
    public bool IsEnabled(LogLevel logLevel) => true;

    /// <inheritdoc />
    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        var properties = new Dictionary<string, object?>();
        string? template = null;
        if (state is IEnumerable<KeyValuePair<string, object?>> pairs)
        {
            foreach (KeyValuePair<string, object?> pair in pairs)
            {
                if (pair.Key == "{OriginalFormat}")
                {
                    template = pair.Value?.ToString();
                }
                else
                {
                    properties[pair.Key] = pair.Value;
                }
            }
        }

        _entries.Enqueue(new Entry(logLevel, template, formatter(state, exception), properties, exception));
    }
}
