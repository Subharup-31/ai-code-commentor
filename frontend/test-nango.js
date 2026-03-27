const { Nango } = require("@nangohq/node");
const nango = new Nango({ secretKey: "e69eb744-b0b8-4e80-a42c-8d2a298bb125" });

async function test() {
    try {
        const response = await nango.createConnectSession({
            allowed_integrations: ['github-getting-started', 'notion'],
            end_user: {
                id: "test-user-123",
                display_name: "test-user-123",
            },
        });
        console.log("Success:", response.data);
    } catch (error) {
        console.error("Error creating session:");
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}
test();
