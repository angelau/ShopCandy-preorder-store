let adminProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadOrders();
});

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");

    document.getElementById("tabProducts").style.display = tabName === "products" ? "block" : "none";
    document.getElementById("tabOrders").style.display = tabName === "orders" ? "block" : "none";
}

// 1. Load Products
async function loadProducts() {
    try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to retrieve products");
        adminProducts = await res.json();
        renderInventoryTable(adminProducts);
    } catch (err) {
        document.getElementById("inventoryTable").innerHTML = `<tr><td colspan="4" style="color: red; text-align: center;">${err.message}</td></tr>`;
    }
}

function renderInventoryTable(products) {
    const tbody = document.getElementById("inventoryTable");
    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--gray);">No products created yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td style="display: flex; align-items: center; gap: 0.5rem;">
                <img src="${p.image_url || 'https://via.placeholder.com/40'}" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover;">
                <strong>${p.name}</strong>
            </td>
            <td>₦${(p.price / 100).toLocaleString()}</td>
            <td><span class="status-pill ${p.status}">${p.status.replace('_', ' ')}</span></td>
            <td>
                <button class="action-btn btn-edit" onclick="editProduct('${p.id}')">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// 2. Add / Edit Product Submit
async function saveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById("saveProdBtn");
    btn.disabled = true;

    const id = document.getElementById("prodId").value;
    const isEdit = Boolean(id);

    // Convert Naira input to kobo for integer storage
    const priceInNaira = parseFloat(document.getElementById("prodPrice").value);
    const priceInKobo = Math.round(priceInNaira * 100);

    const payload = {
        id: id || undefined,
        name: document.getElementById("prodName").value,
        price: priceInKobo,
        status: document.getElementById("prodStatus").value,
        image_url: document.getElementById("prodImage").value,
        description: document.getElementById("prodDesc").value
    };

    const endpoint = isEdit ? `/api/products/${id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(endpoint, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Operation failed");

        resetProductForm();
        await loadProducts();
    } catch (err) {
        alert("Error saving product: " + err.message);
    } finally {
        btn.disabled = false;
    }
}

function editProduct(id) {
    const p = adminProducts.find(item => item.id === id);
    if (!p) return;

    document.getElementById("prodId").value = p.id;
    document.getElementById("prodName").value = p.name;
    document.getElementById("prodPrice").value = p.price / 100;
    document.getElementById("prodStatus").value = p.status;
    document.getElementById("prodImage").value = p.image_url || "";
    document.getElementById("prodDesc").value = p.description || "";

    document.getElementById("formTitle").innerText = "Edit Product";
    document.getElementById("saveProdBtn").innerText = "Update Product";
}

function resetProductForm() {
    document.getElementById("productForm").reset();
    document.getElementById("prodId").value = "";
    document.getElementById("formTitle").innerText = "Add New Product";
    document.getElementById("saveProdBtn").innerText = "Save Product";
}

// 3. Delete Product
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not delete item");
        await loadProducts();
    } catch (err) {
        alert("Delete failed: " + err.message);
    }
}

// 4. Load Orders
async function loadOrders() {
    try {
        const res = await fetch("/api/orders");
        if (!res.ok) throw new Error("Failed to fetch orders");
        const orders = await res.json();
        renderOrdersTable(orders);
    } catch (err) {
        document.getElementById("ordersTable").innerHTML = `<tr><td colspan="5" style="color: red; text-align: center;">${err.message}</td></tr>`;
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById("ordersTable");
    if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--gray);">No orders received yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>${new Date(o.created_at).toLocaleDateString()}</td>
            <td><strong>${o.customer_name}</strong></td>
            <td>${o.phone}</td>
            <td>${o.address}</td>
            <td>₦${(o.total_amount / 100).toLocaleString()}</td>
        </tr>
    `).join('');
}
// Replace with your actual Cloudinary details
const CLOUDINARY_CLOUD_NAME = "doq4g8g2x";
const CLOUDINARY_UPLOAD_PRESET = "preorder_uploads";

let myWidget = null;

function openCloudinaryWidget() {
    // Check if Cloudinary library is loaded
    if (typeof cloudinary === "undefined") {
        alert("Cloudinary library failed to load. Please check your internet connection or script tag.");
        return;
    }

    // Lazy-initialize the widget on first click
    if (!myWidget) {
        myWidget = cloudinary.createUploadWidget({
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            sources: ['local', 'url', 'camera'],
            multiple: false,
            folder: "products",
            clientAllowedFormats: ["png", "jpeg", "jpg", "webp"],
            maxFileSize: 5000000
        }, (error, result) => {
            if (!error && result && result.event === "success") {
                const imageUrl = result.info.secure_url;
                
                // Set value in the input field
                document.getElementById("prodImage").value = imageUrl;
                
                // Show thumbnail preview
                showImagePreview(imageUrl);
            } else if (error) {
                console.error("Cloudinary Upload Error:", error);
            }
        });
    }

    // Open widget
    myWidget.open();
}

function showImagePreview(url) {
    const container = document.getElementById("imagePreviewContainer");
    const img = document.getElementById("imagePreview");
    if (url) {
        img.src = url;
        container.style.display = "block";
    } else {
        container.style.display = "none";
    }
}