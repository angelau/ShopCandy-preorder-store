export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { customer_name, phone, email, address, delivery_fee = 0, cart_items } = body;

        if (!customer_name || !phone || !cart_items || !cart_items.length) {
            return new Response(JSON.stringify({ error: "Please fill in all required checkout fields." }), { status: 400 });
        }

        // 1. Calculate totals on server side
        let calculatedSubtotal = 0;
        const verifiedItems = [];

        for (const item of cart_items) {
            const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? AND visible = 1").bind(item.product_id).first();
            if (!product) continue;

            let unitPrice = product.price;
            if (item.variant_id) {
                const variant = await env.DB.prepare("SELECT * FROM variants WHERE id = ?").bind(item.variant_id).first();
                if (variant) unitPrice += variant.extra_price;
            }

            const itemTotal = unitPrice * item.quantity;
            calculatedSubtotal += itemTotal;

            verifiedItems.push({
                id: crypto.randomUUID(),
                product_id: product.id,
                variant_id: item.variant_id || null,
                name_snapshot: product.name + (item.variant_label ? ` (${item.variant_label})` : ''),
                price_snapshot: unitPrice,
                quantity: item.quantity
            });
        }

        const calculatedTotal = calculatedSubtotal + Number(delivery_fee);
        const orderId = crypto.randomUUID();
        const reference = `ORD-${Date.now().toString().slice(-6)}`;

        // 2. Insert Order & Items into D1
        const orderInsert = env.DB.prepare(
            `INSERT INTO orders (id, reference, customer_name, phone, email, address, delivery_fee, subtotal, total, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
        ).bind(orderId, reference, customer_name, phone, email || '', address || '', delivery_fee, calculatedSubtotal, calculatedTotal);

        const itemInserts = verifiedItems.map(item =>
            env.DB.prepare(
                `INSERT INTO order_items (id, order_id, product_id, variant_id, name_snapshot, price_snapshot, quantity)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(item.id, orderId, item.product_id, item.variant_id, item.name_snapshot, item.price_snapshot, item.quantity)
        );

        await env.DB.batch([orderInsert, ...itemInserts]);

        // 3. Fetch Store WhatsApp Number
        const whatsappSetting = await env.DB.prepare("SELECT value FROM settings WHERE key = 'whatsapp_number'").first();
        const whatsappNum = whatsappSetting ? whatsappSetting.value : "";

        // 4. Construct Pre-filled WhatsApp Order Message
        let message = `Hello! I would like to place an order on ShopCandy:\n\n`;
        message += `*Order Ref:* ${reference}\n`;
        message += `*Name:* ${customer_name}\n`;
        message += `*Phone:* ${phone}\n\n`;
        message += `*Items Ordered:*\n`;
        verifiedItems.forEach(i => {
            message += `- ${i.name_snapshot} x${i.quantity} (₦${(i.price_snapshot / 100).toLocaleString()})\n`;
        });
        message += `\n*Subtotal:* ₦${(calculatedSubtotal / 100).toLocaleString()}\n`;
        message += `*Delivery Fee:* ₦${(delivery_fee / 100).toLocaleString()}\n`;
        message += `*Total:* ₦${(calculatedTotal / 100).toLocaleString()}\n\n`;
        message += `Please confirm payment details to finalize my preorder!`;

        const whatsappUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(message)}`;

        return new Response(JSON.stringify({
            success: true,
            reference: reference,
            whatsapp_url: whatsappUrl
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}