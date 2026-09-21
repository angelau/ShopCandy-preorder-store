export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // 1. Check if the path needs protection (/admin or write operations on /api/products)
    const isAdminPage = url.pathname.startsWith("/admin");
    const isWriteApi = url.pathname.startsWith("/api/products") && ["POST", "PUT", "DELETE"].includes(request.method);
    const isOrderListApi = url.pathname.startsWith("/api/orders") && request.method === "GET";

    if (isAdminPage || isWriteApi || isOrderListApi) {
        // 2. Fetch expected credentials from D1 settings or fallback defaults
        let expectedUser = "admin";
        let expectedPass = "admin123";

        try {
            const userSetting = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_username'").first();
            const passSetting = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").first();

            if (userSetting) expectedUser = userSetting.value;
            if (passSetting) expectedPass = passSetting.value;
        } catch (e) {
            // Fallback to default credentials if database query fails
        }

        // 3. Extract Authorization Header
        const authHeader = request.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Basic ")) {
            return new Response("Unauthorized Access: Authentication required.", {
                status: 401,
                headers: {
                    "WWW-Authenticate": 'Basic realm="Admin Access Required"',
                },
            });
        }

        // 4. Decode base64 credentials (username:password)
        try {
            const base64Credentials = authHeader.split(" ")[1];
            const credentials = atob(base64Credentials).split(":");
            const username = credentials[0];
            const password = credentials.slice(1).join(":"); // Handles passwords containing colons

            if (username !== expectedUser || password !== expectedPass) {
                return new Response("Forbidden: Invalid credentials.", {
                    status: 403,
                    headers: {
                        "WWW-Authenticate": 'Basic realm="Admin Access Required"',
                    },
                });
            }
        } catch (err) {
            return new Response("Bad Request: Malformed authorization header.", { status: 400 });
        }
    }

    // 5. Credentials valid or route public -> proceed
    return next();
}