export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { password } = await request.json();
        const storedPass = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").first();

        if (storedPass && password === storedPass.value) {
            // Simple session token
            const token = "admin_session_" + Date.now();
            return new Response(JSON.stringify({ success: true, token: token }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ error: "Invalid admin password" }), { status: 401 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}