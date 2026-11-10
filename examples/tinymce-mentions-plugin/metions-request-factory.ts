export async function createMentionsRequest(): Promise<(request: any, respondWith: any) => void> {

	return (request: any, respondWith: any) => {

        // Fetch your full user list from the server and cache locally
        const users = [
            {
                id: "1",
                name: 'John Smith'
            },
            {
                id: "2",
                name: 'Joe Cool'
            },
            {
                id: "3",
                name: 'Zander Geulph'
            }

        ];

        // query.term is the text the user typed after the '@'
        var filteredUsers = users.filter(user =>
            user.name.toLowerCase().includes(request.term.toLowerCase())
        );

        filteredUsers = filteredUsers.slice(0, 10);

        // Where the user object must contain the properties `id` and `name`
        // but you could additionally include anything else you deem useful.
        respondWith(filteredUsers);
	};
}
