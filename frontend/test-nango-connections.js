const { Nango } = require("@nangohq/node");
const nango = new Nango({ secretKey: "e69eb744-b0b8-4e80-a42c-8d2a298bb125" });

async function checkConnections() {
    try {
        console.log("Fetching connections...");
        const res = await nango.listConnections();
        console.log(`Found ${res.connections.length} connections`);

        let deleted = 0;
        for (const conn of res.connections) {
            console.log(`Deleting connection: ${conn.connection_id} for integration ${conn.provider}`);
            try {
                await nango.deleteConnection(conn.provider, conn.connection_id);
                deleted++;
            } catch (e) {
                console.error(`Failed to delete ${conn.connection_id}: ${e.message}`);
            }
        }
        console.log(`Successfully deleted ${deleted} old connections.`);
    } catch (error) {
        console.error("Error:");
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}
checkConnections();
