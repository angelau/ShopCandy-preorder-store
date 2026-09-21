export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    try {
        if (productId) {
            // Fetch single product with images and variants
            const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? AND visible = 1").bind(productId).first();
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

        // Fetch all visible products for storefront grid
        const products = await env.DB.prepare("SELECT * FROM products WHERE visible = 1 ORDER BY created_at DESC").all();
        
        // Fetch primary image for each product
        const results = await Promise.all((products.results || []).map(async (prod) => {
            const primaryImg = await env.DB.prepare("SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1").bind(prod.id).first();
            return {
                ...prod,
                image_url: primaryImg ? primaryImg.url : null
            };
        }));

        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}