import { NextResponse } from "next/server";
import { Nango } from "@nangohq/node";

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY || "" });

export async function POST(request: Request) {
    try {
        const { connectionId } = await request.json();

        if (!connectionId) {
            return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
        }

        // Generate a connectSessionToken using the backend Nango secretKey
        // This is required for newer Nango accounts which do not have a public key.
        const response = await nango.createConnectSession({
            allowed_integrations: ['github-getting-started', 'notion'],
            end_user: {
                id: connectionId,
                display_name: connectionId,
            },
        });

        // The response shape is { data: { token: 'nango_connect_session_...', expires_at: '...' } }
        return NextResponse.json({ connectSessionToken: response.data.token });
    } catch (error: any) {
        console.error("Failed to generate connect session token:", error.message);
        return NextResponse.json({ error: "Failed to generate session token", details: error.message, errorObj: error?.response?.data || error }, { status: 500 });
    }
}
