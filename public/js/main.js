let allProducts = [];
let cart = JSON.parse(localStorage.getItem("shopcandy_cart") || "[]");

document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();
    updateCartUI();
});

// 1. Fetch Products from Backend API
async function fetchProducts() {
    try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to load products");
        allProducts = await res.json();
        renderProducts(allProducts);
    } catch (err) {
        document.getElementById("productGrid").innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Error loading products: ${err.message}</p>`;
    }
}

// 2. Render Product Cards
function renderProducts(products) {
    const grid = document.getElementById("productGrid");
    if (!products.length) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--gray);">No products found.</p>`;
        return;
    }

    grid.innerHTML = products.map(prod => `
        <div class="product-card">
            <div class="card-img-wrapper">
                <span class="badge ${prod.status}">${prod.status === 'preorder' ? 'Preorder' : 'In Stock'}</span>
                <img src="${prod.image_url || 'https://via.placeholder.com/300?text=No+Photo'}" alt="${prod.name}">
            </div>
            <div class="card-details">
                <h3>${prod.name}</h3>
                <div class="card-price">₦${(prod.price / 100).toLocaleString()}</div>
                <button class="btn-primary" onclick="addToCart('${prod.id}')">
                    ${prod.status === 'preorder' ? 'Preorder Now' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `).join('');
}

// 3. Category Filter Tabs
function filterCategory(cat) {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");

    if (cat === "all") renderProducts(allProducts);
    else renderProducts(allProducts.filter(p => p.status === cat));
}

// 4. Cart State Management
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.product_id === productId);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1
        });
    }

    saveCart();
    toggleCart(true);
}

function updateQuantity(productId, delta) {
    const index = cart.findIndex(item => item.product_id === productId);
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) cart.splice(index, 1);
    }
    saveCart();
}

function saveCart() {
    localStorage.setItem("shopcandy_cart", JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById("cartCount").innerText = cartCount;

    const cartContainer = document.getElementById("cartItems");
    const cartFooter = document.getElementById("cartFooter");

    if (!cart.length) {
        cartContainer.innerHTML = `<p style="text-align: center; color: var(--gray); margin-top: 2rem;">Your cart is currently empty.</p>`;
        cartFooter.style.display = "none";
        return;
    }

    cartFooter.style.display = "block";
    let subtotal = 0;

    cartContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.image_url || 'https://via.placeholder.com/60'}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div>₦${(item.price / 100).toLocaleString()}</div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="updateQuantity('${item.product_id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity('${item.product_id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById("cartSubtotal").innerText = `₦${(subtotal / 100).toLocaleString()}`;
}

function toggleCart(open) {
    document.getElementById("drawerOverlay").classList.toggle("open", open);
    document.getElementById("cartDrawer").classList.toggle("open", open);
}

// 5. Submit Order & Redirect to WhatsApp
async function handleCheckout(e) {
    e.preventDefault();
    const btn = document.getElementById("checkoutBtn");
    btn.disabled = true;
    btn.innerText = "Processing Order...";

    const payload = {
        customer_name: document.getElementById("custName").value,
        phone: document.getElementById("custPhone").value,
        email: document.getElementById("custEmail").value,
        address: document.getElementById("custAddress").value,
        cart_items: cart
    };

    try {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to process checkout");

        // Clear local cart state
        cart = [];
        saveCart();

        // Redirect customer to WhatsApp order link
        window.location.href = data.whatsapp_url;
    } catch (err) {
        alert("Checkout Error: " + err.message);
        btn.disabled = false;
        btn.innerText = "Preorder via WhatsApp 🚀";
    }
}