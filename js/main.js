// Global State
let allProducts = [];
let cart = [];
let selectedCategory = "all";

// Fetch Products from API or Fallback
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('API fetch failed');
        allProducts = await response.json();
    } catch (err) {
        console.warn('Backend API not active, loading mockup state:', err.message);
        // Fallback mockup data for local testing
        allProducts = [
            { id: "1", name: "Gummy Bears Deluxe", category: "Gummies", price: 250000, status: "preorder", image_url: "" },
            { id: "2", name: "Sour Worms Max", category: "Sour", price: 180000, status: "in_stock", image_url: "" },
            { id: "3", name: "Chocolate Drops", category: "Chocolates", price: 320000, status: "preorder", image_url: "" }
        ];
    }
    renderCategoryFilters();
    renderProducts();
}

// Render Filter Tabs
function renderCategoryFilters() {
    const container = document.getElementById("categoryFilters");
    if (!container) return;

    const categories = ["all", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    
    container.className = "filters"; // Matches .filters in style.css
    container.innerHTML = categories.map(cat => `
        <button 
            type="button" 
            class="filter-btn ${cat === selectedCategory ? 'active' : ''}" 
            data-category="${cat}"
        >
            ${cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
    `).join('');
}

// Filter Event Delegation
document.getElementById("categoryFilters")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
        selectedCategory = e.target.dataset.category;
        renderCategoryFilters();
        renderProducts();
    }
});

// Render Product Grid
function renderProducts() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    const filtered = selectedCategory === "all" 
        ? allProducts 
        : allProducts.filter(p => p.category === selectedCategory);

    if (!filtered.length) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--gray);">No products found.</p>`;
        return;
    }

    grid.innerHTML = filtered.map(prod => `
        <div class="product-card">
            <div class="card-img-wrapper">
                <span class="badge ${prod.status}">${prod.status === 'preorder' ? 'Preorder' : 'In Stock'}</span>
                <img src="${prod.image_url || 'https://via.placeholder.com/300?text=ShopCandy'}" alt="${prod.name}">
            </div>
            <div class="card-details">
                <h3>${prod.name}</h3>
                <div class="card-price">₦${(prod.price / 100).toLocaleString()}</div>
                <button 
                    type="button" 
                    class="btn-primary add-to-cart-btn" 
                    data-id="${prod.id}"
                >
                    ${prod.status === 'preorder' ? 'Preorder Now' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `).join('');
}

// Product Grid Event Listener (Bypasses inline onclick issues)
document.getElementById("productGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart-btn");
    if (btn) {
        const id = btn.dataset.id;
        console.log("Add to Cart clicked for product ID:", id);
        addToCart(id);
    }
});

// Cart Core Operations
function addToCart(productId) {
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    const existingIndex = cart.findIndex(item => String(item.id) === String(productId));
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    updateCartUI();
    toggleCart(true);
}

function updateCartUI() {
    const cartCount = document.getElementById("cartCount");
    const cartItems = document.getElementById("cartItems");
    const cartFooter = document.getElementById("cartFooter");
    const cartSubtotal = document.getElementById("cartSubtotal");

    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartCount) cartCount.textContent = totalCount;

    if (!cart.length) {
        if (cartItems) cartItems.innerHTML = `<p style="text-align: center; color: var(--gray); margin-top: 2rem;">Your cart is empty.</p>`;
        if (cartFooter) cartFooter.style.display = "none";
        return;
    }

    if (cartFooter) cartFooter.style.display = "block";

    let subtotal = 0;
    if (cartItems) {
        cartItems.innerHTML = cart.map((item, index) => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;
            return `
                <div class="cart-item">
                    <img src="${item.image_url || 'https://via.placeholder.com/60?text=Candy'}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h4 style="font-size: 0.9rem;">${item.name}</h4>
                        <div style="font-size: 0.85rem; font-weight: bold;">₦${(item.price / 100).toLocaleString()}</div>
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                            <span>${item.qty}</span>
                            <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (cartSubtotal) cartSubtotal.textContent = `₦${(subtotal / 100).toLocaleString()}`;
}

function changeQty(index, delta) {
    if (cart[index]) {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
        updateCartUI();
    }
}

function toggleCart(open) {
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("drawerOverlay");
    
    if (open) {
        drawer?.classList.add("open");
        overlay?.classList.add("open");
        document.body.classList.add("drawer-open");
    } else {
        drawer?.classList.remove("open");
        overlay?.classList.remove("open");
        document.body.classList.remove("drawer-open");
    }
}

function handleCheckout(e) {
    e.preventDefault();
    const name = document.getElementById("custName").value;
    const phone = document.getElementById("custPhone").value;
    const email = document.getElementById("custEmail").value;
    const address = document.getElementById("custAddress").value;

    let itemsList = cart.map(item => `• ${item.name} x${item.qty} (₦${((item.price * item.qty)/100).toLocaleString()})`).join('%0A');
    let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    let message = `*New ShopCandy Order*%0A%0A` +
        `*Customer Details:*%0A` +
        `Name: ${name}%0A` +
        `Phone: ${phone}%0A` +
        `Email: ${email}%0A` +
        `Address: ${address}%0A%0A` +
        `*Order Items:*%0A${itemsList}%0A%0A` +
        `*Total:* ₦${(total/100).toLocaleString()}`;

    window.open(`https://wa.me/2348163807873?text=${message}`, '_blank');
}

// Expose functions globally for direct HTML attribute calls
window.toggleCart = toggleCart;
window.changeQty = changeQty;
window.handleCheckout = handleCheckout;
window.addToCart = addToCart;

// Initialize on page load
document.addEventListener("DOMContentLoaded", fetchProducts);