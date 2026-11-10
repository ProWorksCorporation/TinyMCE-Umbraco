namespace TinyMCE.Umbraco.Services;

/// <summary>
///     Names and values shared by the AI relay (<c>POST /umbraco/management/api/v1/tiny-mce/ai/completion</c>), its
///     provider service and the editor client.
/// </summary>
public static class TinyMceAiConstants
{
    /// <summary>The name of the <see cref="System.Net.Http.IHttpClientFactory"/> client used to call OpenAI.</summary>
    public const string HttpClientName = "TinyMce.OpenAi";

    /// <summary>OpenAI's Chat Completions endpoint, the only upstream the relay calls.</summary>
    public const string OpenAiChatCompletionsUrl = "https://api.openai.com/v1/chat/completions";

    /// <summary>ProblemDetails <c>type</c> of a <c>503</c>: no AI provider key is configured on the server.</summary>
    public const string ProblemTypeNotConfigured = "ai-not-configured";

    /// <summary>ProblemDetails <c>type</c> of a <c>502</c>: the provider failed; the reason is in <c>category</c>.</summary>
    public const string ProblemTypeProviderError = "ai-provider-error";

    /// <summary>ProblemDetails <c>type</c> of a <c>400</c>: the request itself is invalid (for example, an empty prompt).</summary>
    public const string ProblemTypeInvalidRequest = "invalid-request";

    /// <summary>
    ///     Why a provider call failed. These are the only values ever returned to the browser or logged: provider
    ///     response text never is, because it can echo a masked fragment of the key (research R9).
    /// </summary>
    public static class ErrorCategories
    {
        /// <summary>The provider rejected the key (HTTP 401 or 403).</summary>
        public const string Authentication = "authentication";

        /// <summary>The provider is throttling requests (HTTP 429, other than an exhausted quota).</summary>
        public const string RateLimited = "rate-limited";

        /// <summary>The provider account's quota is used up (HTTP 429 with <c>error.code</c> <c>insufficient_quota</c>).</summary>
        public const string QuotaExceeded = "quota-exceeded";

        /// <summary>The provider could not process the request (HTTP 400, 404 or 422).</summary>
        public const string InvalidRequest = "invalid-request";

        /// <summary>The provider could not be reached or failed itself (HTTP 5xx, or a connection failure).</summary>
        public const string Unavailable = "unavailable";

        /// <summary>The provider did not answer within the HTTP client's timeout.</summary>
        public const string Timeout = "timeout";

        /// <summary>Any other failure, including an unexpected status or an unreadable response.</summary>
        public const string Unknown = "unknown";

        /// <summary>No AI provider key is configured. Logged only; the response is a <c>503</c> without a category.</summary>
        public const string NotConfigured = "not-configured";
    }
}
