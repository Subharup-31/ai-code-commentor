const secretKey = "e69eb744-b0b8-4e80-a42c-8d2a298bb125";
const url = "https://api.nango.dev/connection";

async function clearConnections() {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${secretKey}` } });
  const data = await res.json();
  const connections = data.connections || [];
  
  for (const conn of connections) {
    const deleteUrl = `https://api.nango.dev/connection/${conn.connection_id}?provider_config_key=${conn.provider_config_key}`;
    await fetch(deleteUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${secretKey}` } });
    console.log(`Deleted ${conn.connection_id} (${conn.provider_config_key})`);
  }
}
clearConnections();
