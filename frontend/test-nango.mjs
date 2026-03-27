import { Nango } from "@nangohq/node";
const nango = new Nango({ secretKey: "e69eb744-b0b8-4e80-a42c-8d2a298bb125" });
try {
  const res = await nango.createConnectSession({
    allowed_integrations: ['github-getting-started', 'notion'],
    end_user: { id: "test-123", display_name: "test-123" }
  });
  console.log("Success", res);
} catch (e) {
  console.error("Error", e.message, e.response?.data || e);
}
