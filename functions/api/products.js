// GET Handler (Your existing storefront logic)
export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    try {
        if (productId) {
            const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first();
            if (!product) {
                return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
            }

            const images = await env.DB.prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC").bind(productId).all();
            const variants = await env.DB.prepare("SELECT * FROM variants WHERE product_id = ?").bind(productId).all();

            return new Response(JSON.stringify({
                ...product,
                images: images.results || [],
                variants: variants.results || []
            }), { headers: { "Content-Type": "application/json" } });
        }

        // Fetch all products (Include hidden ones so admin can manage them)
        const products = await env.DB.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
        
        const results = await Promise.all((products.results || []).map(async (prod) => {
            const primaryImg = await env.DB.prepare("SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1").bind(prod.id).first();
            return {
                ...prod,
                image_url: prod.image_url || (primaryImg ? primaryImg.url : null)
            };
        }));

        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

// POST Handler (Create Product)
export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { name, price, status, image_url, description } = body;

        if (!name || price === undefined) {
            return new Response("Missing required fields: name or price", { status: 400 });
        }

        const result = await env.DB.prepare(
            "INSERT INTO products (name, price, status, image_url, description, visible) VALUES (?, ?, ?, ?, ?, 1)"
        ).bind(name, price, status || "In Stock", image_url || null, description || "").run();

        return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(`Save failed: ${err.message}`, { status: 500 });
    }
}

// PUT Handler (Update Product)
export async function onRequestPut(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    
    // Extract ID from path e.g., /api/products/5 or query param ?id=5
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 1] || url.searchParams.get("id");

    try {
        const body = await request.json();
        const { name, price, status, image_url, description } = body;

        await env.DB.prepare(
            "UPDATE products SET name = ?, price = ?, status = ?, image_url = ?, description = ? WHERE id = ?"
        ).bind(name, price, status, image_url, description, id).run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(`Update failed: ${err.message}`, { status: 500 });
    }
}

// DELETE Handler (Delete Product)
export async function onRequestDelete(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 1] || url.searchParams.get("id");

    try {
        await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(`Delete failed: ${err.message}`, { status: 500 });
    }
}