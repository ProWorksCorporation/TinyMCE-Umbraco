import { client } from '../api/client.gen.js';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import type { UmbEntryPointOnInit, UmbEntryPointOnUnload } from '@umbraco-cms/backoffice/extension-api';

/**
 * Runs once a user is signed in, and again after every re-login (possibly as a different user).
 *
 * `configureClient` gives the package's generated API client Umbraco's own authentication: an `auth` callback that
 * reads the current token on every request (so it follows token refreshes and re-logins), plus Umbraco's default
 * interceptors (401 retry, ProblemDetails notifications). It is idempotent, so running it again on re-login does not
 * stack anything. The package's own call sites pass `umbHttpClient` today; this keeps the generated client correct
 * for anyone who calls the services without one.
 */
export const onInit: UmbEntryPointOnInit = (host) => {
	host.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
		authContext?.configureClient(client);
	});
};

/**
 * Nothing to undo at the end of a session: `configureClient` caches no user-specific state, it resolves the token
 * per request, so the next user's requests carry the next user's token.
 */
export const onUnload: UmbEntryPointOnUnload = () => {};
