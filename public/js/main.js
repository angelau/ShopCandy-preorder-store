let allProducts = [];
let selectedCategory = "all";
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
        
        // Dynamically build category pills & render grid
        renderCategoryTabs();
        renderProducts();
    } catch (err) {
        document.getElementById("productGrid").innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Error loading products: ${err.message}</p>`;
    }
}

// 2. Render Dynamic Category Filter Pills
function renderCategoryTabs() {
    const filterContainer = document.getElementById("categoryFilters");
    if (!filterContainer) return;

    // Extract unique categories from database items
    const categories = ["all", ...new Set(allProducts.map(p => p.category).filter(Boolean))];

    filterContainer.innerHTML = categories.map(cat => `
        <button 
            type="button" 
            class="filter-btn ${cat === selectedCategory ? 'active' : ''}" 
            onclick="filterCategory('${cat}')"
        >
            ${cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
    `).join('');
}

// 3. Category Filter Click Handler
function filterCategory(cat) {
    selectedCategory = cat;
    renderCategoryTabs();
    renderProducts();
}

// 4. Render Product Cards (Filtered by Selected Category)
function renderProducts() {
    const grid = document.getElementById("productGrid");
    
    // Filter products by database category
    const filtered = selectedCategory === "all" 
        ? allProducts 
        : allProducts.filter(p => p.category === selectedCategory);

    if (!filtered.length) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--gray);">No products found in this category.</p>`;
        return;
    }

    grid.innerHTML = filtered.map(prod => `
        <div class="product-card">
            <div class="card-img-wrapper">
                <span class="badge ${prod.status}">${prod.status === 'preorder' ? 'Preorder' : 'In Stock'}</span>
                <img src="${prod.image_url || 'https://via.placeholder.com/300?text=No+Photo'}" alt="${prod.name}">
            </div>
            <div class="card-details">
                <span class="category-tag" style="font-size: 0.75rem; color: var(--gray); text-transform: uppercase;">${prod.category || 'General'}</span>
                <h3>${prod.name}</h3>
                <div class="card-price">₦${(prod.price / 100).toLocaleString()}</div>
                <button class="btn-primary" onclick="addToCart('${prod.id}')">
                    ${prod.status === 'preorder' ? 'Preorder Now' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `).join('');
}

// 5. Cart State Management
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
    const cartCountContainer = document.getElementById("cartCount");
    if (cartCountContainer) {
        cartCountContainer.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    const cartContainer = document.getElementById("cartItems");
    const cartFooter = document.getElementById("cartFooter");

    if (!cartContainer) return;

    if (!cart.length) {
        cartContainer.innerHTML = `<p style="text-align: center; color: var(--gray); margin-top: 2rem;">Your cart is currently empty.</p>`;
        if (cartFooter) cartFooter.style.display = "none";
        return;
    }

    if (cartFooter) cartFooter.style.display = "block";
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

    const subtotalEl = document.getElementById("cartSubtotal");
    if (subtotalEl) subtotalEl.innerText = `₦${(subtotal / 100).toLocaleString()}`;
}

function toggleCart(open) {
    const overlay = document.getElementById("drawerOverlay");
    const drawer = document.getElementById("cartDrawer");
    if (overlay) overlay.classList.toggle("open", open);
    if (drawer) drawer.classList.toggle("open", open);
}

// 6. Submit Order & Redirect to WhatsApp
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

        // Clear cart and redirect
        cart = [];
        saveCart();
        window.location.href = data.whatsapp_url;
    } catch (err) {
        alert("Checkout Error: " + err.message);
        btn.disabled = false;
        btn.innerText = "Preorder via WhatsApp 🚀";
    }
}