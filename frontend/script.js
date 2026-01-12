// --- CONFIGURACIÓN ---
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSykMtYsQzschcnBO0H3AlRfsiRftmzjwh_OZpdQt49oG7Z_Ja7FZ5bNFkCD2FkcRhKvQlAxoGpG-hD/pub?output=csv';

let productsDB = [];
let cart = [];

// Elementos DOM (se llenan al cargar)
let productsContainer, cartSidebar, cartOverlay, cartItemsContainer, cartTotalEl, cartCountEl;

// --- 1. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM
    productsContainer = document.getElementById('products-container');
    cartSidebar = document.getElementById('cart-sidebar');
    cartOverlay = document.getElementById('cart-overlay');
    cartItemsContainer = document.getElementById('cart-items');
    cartTotalEl = document.getElementById('cart-total');
    cartCountEl = document.getElementById('cart-count');

    // Iniciar Tema Dark/Light
    initTheme();

    // Cargar Productos
    fetchProducts();
});

// --- LÓGICA MODO DARK ---
function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const moonIcon = document.querySelector('.moon-icon');
    const sunIcon = document.querySelector('.sun-icon');

    if(!themeBtn) return;

    // Verificar preferencia guardada
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    }

    // Toggle al hacer click
    themeBtn.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        }
    });
}

// --- 2. CARGAR PRODUCTOS ---
async function fetchProducts() {
    productsContainer.innerHTML = '<p style="text-align:center; width:100%; grid-column:1/-1;">Cargando colección...</p>';
    
    // Si no hay URL configurada, usar local o mostrar aviso
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes('AQUI_PEGAS')) {

         productsContainer.innerHTML = '<p style="text-align:center; width:100%; grid-column:1/-1;">⚠️ Configura el enlace de Google Sheets en script.js</p>';
         return;
    }

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const data = await response.text();
        const rows = data.split('\n').slice(1);
        
        productsDB = rows.map(row => {
            const cols = row.split(',');
            if(cols.length < 5) return null;
            return {
                id: cols[0].trim(),
                nombre: cols[1].trim(),
                precio: Number(cols[2].trim()),
                categoria: cols[3].trim().toLowerCase(),
                imagen: cols[4].trim()
            };
        }).filter(item => item !== null);

        renderProducts('todos');
    } catch (error) {
        console.error('Error:', error);
        productsContainer.innerHTML = '<p style="text-align:center; width:100%; grid-column:1/-1;">Error de conexión.</p>';
    }
}

// --- 3. RENDERIZADO ---
function renderProducts(filter = 'todos') {
    productsContainer.innerHTML = '';
    const filtered = filter === 'todos' ? productsDB : productsDB.filter(p => p.categoria.includes(filter));

    if (filtered.length === 0) {
        productsContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-grey);">No hay piezas en esta sección.</p>';
        return;
    }

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="img-container">
                <img src="${product.imagen}" alt="${product.nombre}" class="product-img" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
            </div>
            <div class="product-info">
                <span class="card-category">${product.categoria}</span>
                <h3 class="card-title">${product.nombre}</h3>
                <span class="card-price">$${product.precio.toLocaleString()}</span>
                <button class="add-btn" onclick="addToCart('${product.id}')">Agregar</button>
            </div>
        `;
        productsContainer.appendChild(card);
    });
}

// --- 4. CARRITO ---
function addToCart(id) {
    const product = productsDB.find(p => p.id == id);
    if(!product) return;
    
    const existing = cart.find(item => item.id == id);
    if (existing) existing.cantidad++; else cart.push({ ...product, cantidad: 1 });
    updateCartUI();
    openCart();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id != id);
    updateCartUI();
}

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let total = 0, count = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-msg">Tu selección está vacía.</p>';
    }

    cart.forEach(item => {
        total += item.precio * item.cantidad;
        count += item.cantidad;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div>
                <strong style="color:var(--dark-olive)">${item.nombre}</strong><br>
                <small style="color:#999">$${item.precio.toLocaleString()} x ${item.cantidad}</small>
            </div>
            <div style="text-align:right">
                <span style="font-weight:600; color:var(--dark-olive)">$${(item.precio * item.cantidad).toLocaleString()}</span><br>
                <span class="remove-item" onclick="removeFromCart('${item.id}')">Quitar</span>
            </div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    cartTotalEl.innerText = '$' + total.toLocaleString();
    cartCountEl.innerText = count;
}

// --- 5. INTERACCIONES ---
function filterProducts(cat) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const btn = event.target.closest('.filter-btn');
    if(btn) btn.classList.add('active');
    renderProducts(cat);
}

function toggleCart() {
    if (cartSidebar.classList.contains('open')) closeCart(); else openCart();
}
function openCart() { cartSidebar.classList.add('open'); cartOverlay.classList.add('open'); }
function closeCart() { cartSidebar.classList.remove('open'); cartOverlay.classList.remove('open'); }

function checkout() {
    if (cart.length === 0) return;
    const phone = "5492215555555"; 
    let msg = "Hola La Galería! Quisiera reservar:%0A%0A";
    cart.forEach(i => msg += `• ${i.nombre} (x${i.cantidad})%0A`);
    msg += `%0ATotal estimado: ${cartTotalEl.innerText}%0A%0A¿Me confirman disponibilidad?`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}