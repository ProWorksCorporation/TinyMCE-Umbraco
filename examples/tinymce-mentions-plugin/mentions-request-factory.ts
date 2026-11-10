/** A user offered by the `@` menu. TinyMCE's mentions plugin needs `id` and `name`; anything else is optional. */
interface MentionUser {
	id: string;
	name: string;
}

/**
 * Creates the handler TinyMCE's mentions plugin calls as the user types after `@`.
 * @returns {(query: { term: string }, success: (users: Array<MentionUser>) => void) => void} The `mentions_fetch` handler.
 */
export function createMentionsRequest(): (query: { term: string }, success: (users: Array<MentionUser>) => void) => void {
	return (query, success) => {
		// A real plugin would fetch the user list from the server and cache it locally.
		const users: Array<MentionUser> = [
			{ id: '1', name: 'John Smith' },
			{ id: '2', name: 'Joe Cool' },
			{ id: '3', name: 'Zander Geulph' },
		];

		// `query.term` is the text typed after the '@'.
		const term = query.term.toLowerCase();
		success(users.filter((user) => user.name.toLowerCase().includes(term)).slice(0, 10));
	};
}
