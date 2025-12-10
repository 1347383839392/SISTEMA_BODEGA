console.log("✅ main.js ejecutándose correctamente");
/**
 * JavaScript Principal - Sistema de Gestión Empresarial
 * Versión 7 - Con timeout y fallback
 */

// =========================
// CONFIGURACIÓN GLOBAL
// =========================
const BASE_PATH = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
const API_BASE = BASE_PATH + 'api/';

window.productsTable = window.productsTable || null;
window.inventoryTable = window.inventoryTable || null;
window.saveProduct = window.saveProduct || null;

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

// =========================
// SISTEMA DE INICIALIZACIÓN
// =========================
const moduleInitializers = {
    initialized: new Set(),
    
    async init(tabId, moduleName, initFunction) {
        const moduleKey = `${tabId}-${moduleName}`;
        
        if (this.initialized.has(moduleKey)) {
            console.log(`ℹ️ [${moduleName}] Ya inicializado`);
            return;
        }
        
        console.log(`🚀 [${moduleName}] Iniciando...`);
        
        try {
            await initFunction();
            this.initialized.add(moduleKey);
            console.log(`✅ [${moduleName}] Completado`);
        } catch (error) {
            console.error(`❌ [${moduleName}] Error:`, error);
            Toast.fire({
                icon: 'error',
                title: `Error al cargar ${moduleName}`
            });
        }
    },
    
    reset(tabId) {
        for (const key of this.initialized) {
            if (key.startsWith(tabId)) {
                this.initialized.delete(key);
            }
        }
    }
};

window.moduleInitializers = moduleInitializers;

// =========================
// FUNCIÓN PARA ESPERAR ELEMENTOS (CON TIMEOUT MÁS CORTO)
// =========================
function waitForElement(selector, timeout = 1000) {
    return new Promise((resolve, reject) => {
        // Si ya existe, resolver inmediatamente
        const element = document.querySelector(selector);
        if (element) {
            console.log(`✅ Elemento ya existe: ${selector}`);
            resolve(element);
            return;
        }
        
        console.log(`⏳ Esperando elemento: ${selector}`);
        
        // Observer para detectar cuando aparezca
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                console.log(`✅ Elemento detectado: ${selector}`);
                observer.disconnect();
                resolve(el);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Timeout más corto
        setTimeout(() => {
            observer.disconnect();
            console.warn(`⏱️ Timeout para ${selector} - continuando sin esperar`);
            reject(new Error(`Timeout: ${selector}`));
        }, timeout);
    });
}


// =========================
// FUNCIÓN BASE PARA LLAMADAS A API
// =========================
// Función auxiliar para peticiones API
async function apiRequest(endpoint, options = {}) {
    const url = API_BASE + endpoint;
    
    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    if (options.body) {
        config.body = options.body;
    }
    
    console.log('🌐 API Request:', {
        url,
        method: config.method,
        body: options.body ? JSON.parse(options.body) : null
    });
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        console.log('📥 API Response:', {
            status: response.status,
            ok: response.ok,
            data
        });
        
        if (!response.ok || !data.success) {
            throw {
                message: data.error || data.message || 'Error en la petición',
                error: data.error,
                errors: data.errors,
                status: response.status
            };
        }
        
        return data;
    } catch (error) {
        console.error('❌ API Error:', error);
        
        // Si es un error de red
        if (error instanceof TypeError) {
            throw {
                message: 'Error de conexión. Verifica tu conexión a internet.',
                error: 'network_error'
            };
        }
        
        throw error;
    }
}


// =========================
// MÓDULO DE INVENTARIO - CORREGIDO
// =========================
let productsForInventory = [];
let currentInventoryFilter = 'all';
let currentDateFrom = null;
let currentDateTo = null;
let isEditingMovement = false;
let currentMovementId = null;

// ✅ NUEVA FUNCIÓN: Recargar estadísticas del dashboard
async function reloadDashboardStats() {
    console.log('🔄 [RELOAD] Recargando estadísticas del dashboard...');
    
    try {
        // Verificar si existe la función del dashboard
        if (typeof window.loadDashboardStats === 'function') {
            await window.loadDashboardStats();
            console.log('✅ [RELOAD] Estadísticas del dashboard recargadas');
        } else {
            console.warn('⚠️ [RELOAD] Función loadDashboardStats no disponible, cargando manualmente...');
            
            // Cargar directamente si la función no existe
            const result = await apiRequest('stats.php?_t=' + new Date().getTime());
            if (result.success && result.data) {
                const stats = result.data;
                $('#totalProducts').text(stats.total_products || 0);
                $('#totalClients').text(stats.total_clients || 0);
                $('#totalQuotes').text(stats.total_quotes || 0);
                $('#lowStock').text(stats.low_stock_products || 0);
                console.log('✅ [RELOAD] Estadísticas cargadas manualmente');
            }
        }
    } catch (error) {
        console.error('❌ [RELOAD] Error recargando estadísticas:', error);
    }
}

// ✅ NUEVA FUNCIÓN: Recargar todo después de cambios
async function reloadAllInventoryData() {
    console.log('🔄 Recargando todos los datos de inventario...');
    
    try {
        // 1. Recargar tabla de movimientos
        if (window.inventoryTable && window.inventoryTable.ajax) {
            window.inventoryTable.ajax.reload(null, false);
        }
        
        // 2. Recargar estadísticas del inventario
        await loadInventoryStats();
        
        // 3. Recargar productos con stock bajo
        await loadLowStockProductsTable();
        
        // 4. Recargar lista de productos para el selector
        await loadProductsForInventory();
        
        // 5. ✅ NUEVO: Recargar estadísticas del dashboard
        await reloadDashboardStats();
        
        // 6. ✅ NUEVO: Si hay tabla de productos abierta, recargarla
        if (window.productsTable && window.productsTable.ajax) {
            window.productsTable.ajax.reload(null, false);
        }
        
        // 7. ✅ NUEVO: Recargar cache de productos para combos
        if (typeof window.forceReloadProducts === 'function') {
            await window.forceReloadProducts();
        }
        
        console.log('✅ Todos los datos recargados correctamente');
    } catch (error) {
        console.error('❌ Error recargando datos:', error);
    }
}

// ✅ EXPONER FUNCIONES GLOBALMENTE
window.reloadAllInventoryData = reloadAllInventoryData;
window.reloadDashboardStats = reloadDashboardStats;

// Declarar funciones globales ANTES de usarlas
window.filterMovements = function(type) {
    console.log('🔍 Filtrando movimientos:', type);
    currentInventoryFilter = type;
    
    // Actualizar botones activos
    $('#movementTabs .nav-link').removeClass('active');
    $(`#movementTabs .nav-link[data-filter="${type}"]`).addClass('active');
    
    // Recargar tabla
    loadInventoryTable();
};

window.applyDateFilter = function() {
    const dateFrom = $('#dateFrom').val();
    const dateTo = $('#dateTo').val();
    
    if (!dateFrom && !dateTo) {
        Toast.fire({ icon: 'warning', title: 'Debe seleccionar al menos una fecha' });
        return;
    }
    
    // Validar que la fecha 'desde' no sea mayor que 'hasta'
    if (dateFrom && dateTo && dateFrom > dateTo) {
        Toast.fire({ icon: 'error', title: 'La fecha "Desde" no puede ser mayor que "Hasta"' });
        return;
    }
    
    currentDateFrom = dateFrom || null;
    currentDateTo = dateTo || null;
    
    console.log('📅 Aplicando filtro de fechas:', { desde: currentDateFrom, hasta: currentDateTo });
    loadInventoryTable();
    Toast.fire({ icon: 'success', title: 'Filtro de fechas aplicado' });
};

window.clearDateFilter = function() {
    $('#dateFrom').val('');
    $('#dateTo').val('');
    currentDateFrom = null;
    currentDateTo = null;
    
    console.log('🔄 Limpiando filtro de fechas');
    loadInventoryTable();
    Toast.fire({ icon: 'info', title: 'Filtro de fechas eliminado' });
};

window.openMovementModal = function() {
    isEditingMovement = false;
    currentMovementId = null;
    $('#movementForm')[0].reset();
    $('#movementId').val('');
    $('#currentStock').text('');
    $('#quantityLabel').text('Cantidad *');
    $('#movementModalTitle').text('Registrar Movimiento');
    $('#saveButtonText').text('Registrar');
    $('#movementModal').modal('show');
};

window.editMovement = function(id) {
    isEditingMovement = true;
    currentMovementId = id;
    
    // Buscar el movimiento en la tabla
    const table = window.inventoryTable;
    const data = table.rows().data();
    let movement = null;
    
    for (let i = 0; i < data.length; i++) {
        if (data[i].id == id) {
            movement = data[i];
            break;
        }
    }
    
    if (!movement) {
        Toast.fire({ icon: 'error', title: 'Movimiento no encontrado' });
        return;
    }
    
    // Llenar el formulario
    $('#movementId').val(movement.id);
    $('#movementType').val(movement.type);
    $('#movementProduct').val(movement.product_id);
    $('#movementQuantity').val(movement.quantity);
    $('#movementReason').val(movement.reason || '');
    $('#movementDocument').val(movement.document_number || '');
    
    // Actualizar labels y textos
    $('#movementModalTitle').text('Editar Movimiento');
    $('#saveButtonText').text('Actualizar');
    updateMovementLabel();
    showCurrentStock();
    
    $('#movementModal').modal('show');
};

window.deleteMovement = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar movimiento?',
        text: 'El stock del producto se revertirá automáticamente',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const response = await apiRequest(`inventory.php?id=${id}`, {
            method: 'DELETE'
        });
        
        Toast.fire({ icon: 'success', title: response.message });
        
        // ✅ CRÍTICO: Recargar todo
        await reloadAllInventoryData();
        
    } catch (error) {
        console.error('Error eliminando movimiento:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error al eliminar el movimiento'
        });
    }
};

window.updateMovementLabel = function() {
    const type = $('#movementType').val();
    const label = type === 'in' ? 'Cantidad a Ingresar *' : type === 'out' ? 'Cantidad a Retirar *' : 'Cantidad *';
    $('#quantityLabel').text(label);
};

window.showCurrentStock = function() {
    const selectedOption = $('#movementProduct').find(':selected');
    const stock = selectedOption.data('stock');
    
    if (stock !== undefined) {
        $('#currentStock').text(`Stock actual: ${stock} unidades`);
    } else {
        $('#currentStock').text('');
    }
};

window.quickEntry = function(productId) {
    openMovementModal();
    $('#movementType').val('in');
    $('#movementProduct').val(productId);
    updateMovementLabel();
    showCurrentStock();
    $('#movementReason').val('Reposición de stock bajo');
};

async function initInventoryModule() {
    console.log('📊 Inicializando módulo de inventario...');
    await loadProductsForInventory();
    await loadInventoryStats();
    loadInventoryTable();
    await loadLowStockProductsTable();
    console.log('✅ Módulo de inventario inicializado');
}

// ✅ EXPONER GLOBALMENTE
window.initInventoryModule = initInventoryModule;

async function loadProductsForInventory() {
    try {
        const result = await apiRequest('products.php?_t=' + new Date().getTime());
        productsForInventory = result.data;

        const select = $('#movementProduct');
        if (select.length) {
            select.empty().append('<option value="">Seleccionar producto...</option>');
            result.data.forEach(p => {
                select.append(`<option value="${p.id}" data-stock="${p.stock}">${p.name} - ${p.code}</option>`);
            });
        }
        
        console.log(`✅ ${result.data.length} productos cargados para inventario`);
    } catch (error) {
        console.error('Error loading products for inventory:', error);
    }
}

function loadInventoryTable() {
    if (!$('#inventoryTable').length) {
        console.warn('⚠️ Tabla #inventoryTable no encontrada');
        return;
    }

    if ($.fn.DataTable.isDataTable('#inventoryTable')) {
        $('#inventoryTable').DataTable().destroy();
    }

    // Construir URL con parámetros de filtro y timestamp para evitar caché
    let url = 'inventory.php';
    const params = [];
    
    // ✅ Agregar timestamp único para evitar caché
    params.push(`_t=${new Date().getTime()}`);
    
    if (currentInventoryFilter !== 'all') {
        params.push(`type=${currentInventoryFilter}`);
    }
    
    if (currentDateFrom) {
        params.push(`date_from=${currentDateFrom}`);
    }
    
    if (currentDateTo) {
        params.push(`date_to=${currentDateTo}`);
    }
    
    if (params.length > 0) {
        url += '?' + params.join('&');
    }

    console.log('📊 Cargando tabla con URL:', url);

    window.inventoryTable = $('#inventoryTable').DataTable({
        ajax: { 
            url: API_BASE + url, 
            dataSrc: 'data',
            cache: false // ✅ Desactivar caché
        },
        columns: [
            {
                data: 'created_at',
                render: d => new Date(d).toLocaleString('es-GT')
            },
            {
                data: null,
                render: d => `${d.product_name || 'N/A'}<br><small class="text-muted">${d.product_code || ''}</small>`
            },
            {
                data: 'type',
                render: d => {
                    const badge = d === 'in' ? 'success' : 'danger';
                    const icon = d === 'in' ? 'arrow-down-circle' : 'arrow-up-circle';
                    const text = d === 'in' ? 'Entrada' : 'Salida';
                    return `<span class="badge bg-${badge}"><i class="bi bi-${icon}"></i> ${text}</span>`;
                }
            },
            { data: 'quantity' },
            { data: 'reason', defaultContent: '-' },
            { data: 'document_number', defaultContent: '-' },
            {
                data: 'current_stock',
                render: d => `<span class="badge bg-info">${d || 0}</span>`
            },
            {
                data: null,
                orderable: false,
                render: d => `
                    <button class="btn btn-sm btn-warning" onclick="editMovement(${d.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMovement(${d.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                `
            }
        ],
        order: [[0, 'desc']],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
            emptyTable: "No hay movimientos registrados",
            zeroRecords: "No se encontraron movimientos"
        },
        pageLength: 10,
        responsive: true
    });
    
    console.log('✅ Tabla de inventario cargada');
}

// Función para cargar estadísticas del inventario - CORREGIDA CON IDs ÚNICOS
async function loadInventoryStats() {
    try {
        console.log('📊 [INVENTORY] Cargando estadísticas...');
        
        // ✅ Llamar al endpoint correcto con tipo=inventory
        const statsResult = await apiRequest('stats.php?type=inventory&_t=' + new Date().getTime());
        
        if (statsResult.success && statsResult.data) {
            const stats = statsResult.data;
            
            // ✅ CRÍTICO: Usar IDs únicos del inventario (NO los del dashboard)
            const $totalProducts = $('#inventoryTotalProducts');
            const $totalStock = $('#inventoryTotalStock');
            const $lowStock = $('#inventoryLowStock');
            const $totalMovements = $('#inventoryTotalMovements');
            
            if ($totalProducts.length) $totalProducts.text(stats.total_products || 0);
            if ($totalStock.length) $totalStock.text(stats.total_stock || 0);
            if ($lowStock.length) $lowStock.text(stats.low_stock || 0);
            if ($totalMovements.length) $totalMovements.text(stats.recent_movements || 0);
            
            console.log('✅ [INVENTORY] Estadísticas actualizadas:', stats);
            
            return stats;
        } else {
            console.warn('⚠️ [INVENTORY] No se recibieron datos válidos');
            return null;
        }
        
    } catch (error) {
        console.error('❌ [INVENTORY] Error cargando estadísticas:', error);
        
        // Establecer valores en 0 si hay error (con IDs correctos)
        if ($('#inventoryTotalProducts').length) $('#inventoryTotalProducts').text('0');
        if ($('#inventoryTotalStock').length) $('#inventoryTotalStock').text('0');
        if ($('#inventoryLowStock').length) $('#inventoryLowStock').text('0');
        if ($('#inventoryTotalMovements').length) $('#inventoryTotalMovements').text('0');
        
        return null;
    }
}

// Función para cargar productos con stock bajo en la tabla
async function loadLowStockProductsTable() {
    try {
        const result = await apiRequest('products.php?_t=' + new Date().getTime());
        const products = result.data || [];
        const lowStockProducts = products.filter(p => parseInt(p.stock) < parseInt(p.min_stock || 10));
        
        const tbody = $('#lowStockTable tbody');
        tbody.empty();
        
        if (lowStockProducts.length === 0) {
            $('#lowStockCard').hide();
            console.log('✅ No hay productos con stock bajo');
            return;
        }
        
        $('#lowStockCard').show();
        
        lowStockProducts.forEach(p => {
            tbody.append(`
                <tr>
                    <td>${p.code}</td>
                    <td>${p.name}</td>
                    <td><span class="badge bg-danger">${p.stock}</span></td>
                    <td><span class="badge bg-warning">${p.min_stock || 10}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="quickEntry(${p.id})">
                            <i class="bi bi-plus-circle"></i> Ingreso Rápido
                        </button>
                    </td>
                </tr>
            `);
        });
        
        console.log('⚠️ Productos con stock bajo:', lowStockProducts.length);
    } catch (error) {
        console.error('Error cargando productos con stock bajo:', error);
        $('#lowStockCard').hide();
    }
}

async function saveMovement() {
    const movementData = {
        product_id: parseInt($('#movementProduct').val()),
        type: $('#movementType').val(),
        quantity: parseInt($('#movementQuantity').val()),
        reason: $('#movementReason').val() || null,
        document_number: $('#movementDocument').val() || null
    };

    if (!movementData.product_id || !movementData.type || !movementData.quantity) {
        Toast.fire({ icon: 'error', title: 'Debe completar los campos obligatorios' });
        return;
    }

    try {
        let result;
        
        if (isEditingMovement && currentMovementId) {
            // Editar movimiento existente
            movementData.id = currentMovementId;
            result = await apiRequest('inventory.php', {
                method: 'POST',
                body: JSON.stringify(movementData)
            });
        } else {
            // Crear nuevo movimiento
            result = await apiRequest('inventory.php', {
                method: 'POST',
                body: JSON.stringify(movementData)
            });
        }

        Toast.fire({ icon: 'success', title: result.message });
        $('#movementModal').modal('hide');
        
        // ✅ CRÍTICO: Recargar todo
        await reloadAllInventoryData();
        
    } catch (error) {
        console.error('Error guardando movimiento:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || error.error || 'Error al guardar el movimiento'
        });
    }
}

// ✅ EXPONER FUNCIÓN GLOBALMENTE
window.saveMovement = saveMovement;

// =========================
// MÓDULO DE FACTURACIÓN CON ALERTAS DE AJUSTES
// =========================
let selectedQuoteForInvoice = null;
window.currentInvoiceId = null;
window.currentInvoiceIsCombo = false;

// ✅ Función mejorada para limpiar modales
function cleanupModals() {
    $('.modal').modal('hide');
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').css({
        'padding-right': '',
        'overflow': ''
    });
    
    setTimeout(() => {
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').css({
            'padding-right': '',
            'overflow': ''
        });
    }, 100);
}

// ✅ Listener para limpiar al cerrar modales
$(document).on('hidden.bs.modal', '.modal', function () {
    setTimeout(() => {
        if ($('.modal:visible').length === 0) {
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css({
                'padding-right': '',
                'overflow': ''
            });
        }
    }, 100);
});

// =========================
// FUNCIÓN: Previsualizar factura NORMAL (CON CARGA DE MENSAJES)
// =========================
async function previewComboInvoice(quoteId) {
    try {
        cleanupModals();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const result = await apiRequest(`combo_quotes.php?id=${quoteId}`);
        const quote = result.data;
        selectedQuoteForInvoice = quoteId;
        window.currentInvoiceIsCombo = true;
        
        // ✅ Cargar mensajes existentes si los hay
        if (quote.work_messages) {
            try {
                const savedMessages = JSON.parse(quote.work_messages);
                window.workMessages = savedMessages.map((text, index) => ({
                    id: Date.now() + index,
                    text: text
                }));
                console.log('✅ Mensajes cargados de combo:', window.workMessages);
            } catch (e) {
                console.error('❌ Error parseando mensajes:', e);
                window.workMessages = [];
            }
        } else {
            window.workMessages = [];
        }
        
        // Validar stock disponible
        let hasStockIssues = false;
        let stockWarnings = [];
        
        for (const item of quote.items) {
            if (item.product_id) {
                const productResult = await apiRequest(`products.php?id=${item.product_id}`);
                const product = productResult.data;
                
                if (product.stock < item.quantity) {
                    hasStockIssues = true;
                    if (product.stock === 0) {
                        stockWarnings.push(`${item.description}: Sin stock disponible`);
                    } else {
                        stockWarnings.push(`${item.description}: Solo hay ${product.stock} disponibles (necesita ${item.quantity})`);
                    }
                }
            }
        }
        
        if (hasStockIssues) {
            const warningHtml = stockWarnings.map(w => `<li>${w}</li>`).join('');
            
            await Swal.fire({
                title: '⚠️ Stock Insuficiente',
                html: `
                    <div class="text-start">
                        <p><strong>Los siguientes productos tienen problemas de stock:</strong></p>
                        <ul class="text-danger">${warningHtml}</ul>
                        <p class="text-muted mt-3">
                            <i class="bi bi-info-circle"></i> 
                            Debe editar esta cotización desde el panel de "Cotizaciones" para ajustar las cantidades.
                        </p>
                    </div>
                `,
                icon: 'warning',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#6c757d'
            });
            return;
        }
        
        const total = parseFloat(quote.total);
        
        let itemsHtml = '';
        if (quote.items && quote.items.length > 0) {
            quote.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">Q${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td class="text-end">Q${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        const html = `
            <div class="invoice-preview">
                <div class="text-center mb-4">
                    <h3>SISTEMA DE GESTIÓN EMPRESARIAL</h3>
                    <p class="text-muted">Previsualización de Factura</p>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6>Datos del Cliente:</h6>
                        <p class="mb-1"><strong>${quote.client_name} ${quote.client_last_name || ''}</strong></p>
                        <p class="mb-1">Tel: ${quote.client_phone || 'N/A'}</p>
                        <p class="mb-1">Email: ${quote.client_email || 'N/A'}</p>
                        <p class="mb-1">${quote.client_address || ''}</p>
                    </div>
                    <div class="col-md-6 text-end">
                        <p class="mb-1"><strong>Cotización:</strong> ${quote.number}</p>
                        <p class="mb-1"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-GT')}</p>
                        <p class="mb-1"><strong>Tipo:</strong> <span class="badge bg-primary">${quote.type}</span></p>
                    </div>
                </div>
                
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Descripción</th>
                            <th class="text-center" width="100">Cant.</th>
                            <th class="text-end" width="120">P. Unit.</th>
                            <th class="text-end" width="120">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr class="table-primary">
                            <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                            <td class="text-end"><h5 class="mb-0">Q${total.toFixed(2)}</h5></td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="alert alert-warning mt-4">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Al confirmar, se <strong>descontará el stock</strong> de los productos y otras cotizaciones pendientes serán ajustadas.
                </div>
            </div>
        `;
        
        $('#invoicePreview').html(html);
        
        // Mostrar sección de mensajes de trabajo
        const workMessagesSection = document.getElementById('workMessagesSection');
        if (workMessagesSection) {
            console.log('✅ Mostrando sección de mensajes de trabajo');
            workMessagesSection.style.display = 'block';
            window.renderWorkMessages(); // ✅ Renderizar mensajes cargados
        } else {
            console.error('❌ No se encontró workMessagesSection');
        }
        
        setTimeout(() => {
            $('#invoicePreviewModal').modal('show');
        }, 100);
        
    } catch (error) {
        console.error('Error previsualizando factura:', error);
        cleanupModals();
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la previsualización de la factura',
            confirmButtonText: 'Entendido'
        });
    }
};

// =========================
// FUNCIÓN: Previsualizar factura COMBO (CON CARGA DE MENSAJES)
// =========================
async function previewComboInvoice(quoteId) {
    try {
        cleanupModals();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        console.log(`🔍 [COMBO PREVIEW] Obteniendo datos de combo: ${quoteId}`);
        
        const result = await apiRequest(`combo_quotes.php?id=${quoteId}`);
        
        if (!result || !result.data) {
            throw new Error('No se pudieron obtener los datos de la cotización de combo');
        }
        
        const quote = result.data;
        selectedQuoteForInvoice = quoteId;
        window.currentInvoiceIsCombo = true;
        
        // ✅ NUEVO: Cargar mensajes existentes si los hay
        if (quote.work_messages) {
            try {
                const savedMessages = JSON.parse(quote.work_messages);
                window.workMessages = savedMessages.map((text, index) => ({
                    id: Date.now() + index,
                    text: text
                }));
                console.log('✅ Mensajes cargados de combo:', window.workMessages);
            } catch (e) {
                console.error('❌ Error parseando mensajes:', e);
                window.workMessages = [];
            }
        } else {
            window.workMessages = [];
        }
        
        console.log(`✅ [COMBO PREVIEW] Datos obtenidos:`, quote);
        
        // ... resto del código igual ...
        // (validación de stock, construcción de HTML, etc.)
        
        $('#invoicePreview').html(html);
        
        // Mostrar sección de mensajes de trabajo
        const workMessagesSection = document.getElementById('workMessagesSection');
        if (workMessagesSection) {
            workMessagesSection.style.display = 'block';
            window.renderWorkMessages(); // ✅ Renderizar mensajes cargados
        }
        
        console.log(`✅ [COMBO PREVIEW] Modal de previsualización cargado correctamente`);
        
        setTimeout(() => {
            $('#invoicePreviewModal').modal('show');
        }, 100);
        
    } catch (error) {
        console.error('❌ Error previsualizando factura combo:', error);
        cleanupModals();
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo cargar la previsualización de la factura de combo',
            confirmButtonText: 'Entendido'
        });
    }
}

// =========================
// FUNCIÓN: Previsualizar factura NORMAL (CON CARGA DE MENSAJES)
// =========================
window.previewInvoice = async function(quoteId) {
    try {
        cleanupModals();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const result = await apiRequest(`quotes.php?id=${quoteId}`);
        const quote = result.data;
        selectedQuoteForInvoice = quoteId;
        window.currentInvoiceIsCombo = false;
        
        // ✅ NUEVO: Cargar mensajes existentes si los hay
        if (quote.work_messages) {
            try {
                const savedMessages = JSON.parse(quote.work_messages);
                window.workMessages = savedMessages.map((text, index) => ({
                    id: Date.now() + index,
                    text: text
                }));
                console.log('✅ Mensajes cargados de cotización:', window.workMessages);
            } catch (e) {
                console.error('❌ Error parseando mensajes:', e);
                window.workMessages = [];
            }
        } else {
            window.workMessages = [];
        }
        
        // Validar stock disponible
        let hasStockIssues = false;
        let stockWarnings = [];
        
        for (const item of quote.items) {
            if (item.product_id) {
                const productResult = await apiRequest(`products.php?id=${item.product_id}`);
                const product = productResult.data;
                
                if (product.stock < item.quantity) {
                    hasStockIssues = true;
                    if (product.stock === 0) {
                        stockWarnings.push(`${item.description}: Sin stock disponible`);
                    } else {
                        stockWarnings.push(`${item.description}: Solo hay ${product.stock} disponibles (necesita ${item.quantity})`);
                    }
                }
            }
        }
        
        if (hasStockIssues) {
            const warningHtml = stockWarnings.map(w => `<li>${w}</li>`).join('');
            
            await Swal.fire({
                title: '⚠️ Stock Insuficiente',
                html: `
                    <div class="text-start">
                        <p><strong>Los siguientes productos tienen problemas de stock:</strong></p>
                        <ul class="text-danger">${warningHtml}</ul>
                        <p class="text-muted mt-3">
                            <i class="bi bi-info-circle"></i> 
                            Debe editar esta cotización desde el panel de "Cotizaciones" para ajustar las cantidades.
                        </p>
                    </div>
                `,
                icon: 'warning',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#6c757d'
            });
            return;
        }
        
        const total = parseFloat(quote.total);
        
        let itemsHtml = '';
        if (quote.items && quote.items.length > 0) {
            quote.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">Q${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td class="text-end">Q${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        const html = `
            <div class="invoice-preview">
                <div class="text-center mb-4">
                    <h3>SISTEMA DE GESTIÓN EMPRESARIAL</h3>
                    <p class="text-muted">Previsualización de Factura</p>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6>Datos del Cliente:</h6>
                        <p class="mb-1"><strong>${quote.client_name} ${quote.client_last_name || ''}</strong></p>
                        <p class="mb-1">Tel: ${quote.client_phone || 'N/A'}</p>
                        <p class="mb-1">Email: ${quote.client_email || 'N/A'}</p>
                        <p class="mb-1">${quote.client_address || ''}</p>
                    </div>
                    <div class="col-md-6 text-end">
                        <p class="mb-1"><strong>Cotización:</strong> ${quote.number}</p>
                        <p class="mb-1"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-GT')}</p>
                        <p class="mb-1"><strong>Tipo:</strong> <span class="badge bg-primary">${quote.type}</span></p>
                    </div>
                </div>
                
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Descripción</th>
                            <th class="text-center" width="100">Cant.</th>
                            <th class="text-end" width="120">P. Unit.</th>
                            <th class="text-end" width="120">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr class="table-primary">
                            <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                            <td class="text-end"><h5 class="mb-0">Q${total.toFixed(2)}</h5></td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="alert alert-warning mt-4">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Al confirmar, se <strong>descontará el stock</strong> de los productos y otras cotizaciones pendientes serán ajustadas.
                </div>
            </div>
        `;
        
        $('#invoicePreview').html(html);
        
        // Mostrar sección de mensajes de trabajo
        const workMessagesSection = document.getElementById('workMessagesSection');
        if (workMessagesSection) {
            console.log('✅ Mostrando sección de mensajes de trabajo');
            workMessagesSection.style.display = 'block';
            window.renderWorkMessages(); // ✅ Renderizar mensajes cargados
        } else {
            console.error('❌ No se encontró workMessagesSection');
        }
        
        setTimeout(() => {
            $('#invoicePreviewModal').modal('show');
        }, 100);
        
    } catch (error) {
        console.error('Error previsualizando factura:', error);
        cleanupModals();
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la previsualización de la factura',
            confirmButtonText: 'Entendido'
        });
    }
};

// =========================
// FUNCIÓN: Previsualizar factura COMBO (CON CARGA DE MENSAJES)
// =========================
async function previewComboInvoice(quoteId) {
    try {
        cleanupModals();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        console.log(`🔍 [COMBO PREVIEW] Obteniendo datos de combo: ${quoteId}`);
        
        const result = await apiRequest(`combo_quotes.php?id=${quoteId}`);
        
        if (!result || !result.data) {
            throw new Error('No se pudieron obtener los datos de la cotización de combo');
        }
        
        const quote = result.data;
        selectedQuoteForInvoice = quoteId;
        window.currentInvoiceIsCombo = true;
        
        // ✅ NUEVO: Cargar mensajes existentes si los hay
        if (quote.work_messages) {
            try {
                const savedMessages = JSON.parse(quote.work_messages);
                window.workMessages = savedMessages.map((text, index) => ({
                    id: Date.now() + index,
                    text: text
                }));
                console.log('✅ Mensajes cargados de combo:', window.workMessages);
            } catch (e) {
                console.error('❌ Error parseando mensajes:', e);
                window.workMessages = [];
            }
        } else {
            window.workMessages = [];
        }
        
        console.log(`✅ [COMBO PREVIEW] Datos obtenidos:`, quote);
        
        // ... resto del código igual ...
        // (validación de stock, construcción de HTML, etc.)
        
        $('#invoicePreview').html(html);
        
        // Mostrar sección de mensajes de trabajo
        const workMessagesSection = document.getElementById('workMessagesSection');
        if (workMessagesSection) {
            workMessagesSection.style.display = 'block';
            window.renderWorkMessages(); // ✅ Renderizar mensajes cargados
        }
        
        console.log(`✅ [COMBO PREVIEW] Modal de previsualización cargado correctamente`);
        
        setTimeout(() => {
            $('#invoicePreviewModal').modal('show');
        }, 100);
        
    } catch (error) {
        console.error('❌ Error previsualizando factura combo:', error);
        cleanupModals();
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo cargar la previsualización de la factura de combo',
            confirmButtonText: 'Entendido'
        });
    }
}

// =========================
// ✅ FUNCIÓN GLOBAL: Eliminar factura - VERSIÓN ULTRA SEGURA
// =========================
window.deleteInvoice = async function(id) {
    const result = await Swal.fire({
        title: '⚠️ ¿Eliminar factura?',
        html: `
            <p><strong>Esta acción eliminará la factura de forma permanente.</strong></p>
            <div class="alert alert-danger mt-3">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>ATENCIÓN:</strong>
                <ul class="text-start mt-2 mb-0">
                    <li>La factura se eliminará del sistema</li>
                    <li>La cotización asociada se eliminará también</li>
                    <li>El stock <strong>NO será restaurado</strong></li>
                    <li>Esta acción <strong>NO se puede revertir</strong></li>
                </ul>
            </div>
            <p class="text-muted mt-3">¿Está seguro que desea continuar?</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash"></i> Sí, eliminar permanentemente',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });
    
    if (result.isConfirmed) {
        try {
            console.log(`🗑️ [DELETE INVOICE] Eliminando factura ${id}...`);
            
            // PASO 1: Eliminar del servidor
            const deleteResult = await apiRequest(`invoices.php?id=${id}`, { method: 'DELETE' });
            console.log('✅ Respuesta del servidor:', deleteResult);
            
            // PASO 2: Cerrar modal
            $('#viewInvoiceModal').modal('hide');
            await new Promise(resolve => setTimeout(resolve, 300));
            cleanupModals();
            
            // PASO 3: Mostrar mensaje de éxito
            await Swal.fire({
                icon: 'success',
                title: 'Factura Eliminada',
                text: 'La factura y cotización asociada han sido eliminadas del sistema.',
                confirmButtonText: 'Entendido',
                timer: 2000,
                timerProgressBar: true
            });
            
            // PASO 4: Recargar tablas de forma ULTRA SEGURA
            console.log('🔄 Iniciando recarga de tablas...');
            
            // Lista de tablas a intentar recargar
            const tablesToReload = [
                { name: 'invoicesTable', display: 'Facturas' },
                { name: 'quotesTable', display: 'Cotizaciones' },
                { name: 'comboQuotesTable', display: 'Cotizaciones de Combos' }
            ];
            
            // Recargar cada tabla de forma individual y segura
            for (const tableInfo of tablesToReload) {
                try {
                    const table = window[tableInfo.name];
                    
                    // Verificar que la tabla existe
                    if (!table) {
                        console.log(`ℹ️ ${tableInfo.display}: No existe`);
                        continue;
                    }
                    
                    // Verificar que tiene ajax
                    if (!table.ajax) {
                        console.log(`ℹ️ ${tableInfo.display}: No tiene ajax`);
                        continue;
                    }
                    
                    // Verificar que ajax.reload es una función
                    if (typeof table.ajax.reload !== 'function') {
                        console.log(`ℹ️ ${tableInfo.display}: ajax.reload no es función`);
                        continue;
                    }
                    
                    // TODO OK: Recargar
                    table.ajax.reload(null, false);
                    console.log(`✅ ${tableInfo.display} recargada`);
                    
                } catch (e) {
                    // Silenciar cualquier error
                    console.log(`⚠️ ${tableInfo.display}: ${e.message}`);
                }
            }
            
            // PASO 5: Intentar recargar tabla de pendientes (si existe la función)
            try {
                if (typeof window.reloadPendingQuotesTable === 'function') {
                    await window.reloadPendingQuotesTable();
                    console.log('✅ Tabla de pendientes recargada');
                }
            } catch (e) {
                console.log('ℹ️ Tabla de pendientes no recargada:', e.message);
            }
            
            // PASO 6: Recarga secundaria después de 1 segundo
            setTimeout(() => {
                console.log('🔄 Recarga secundaria...');
                
                try {
                    if (window.quotesTable && window.quotesTable.ajax && typeof window.quotesTable.ajax.reload === 'function') {
                        window.quotesTable.ajax.reload(null, false);
                    }
                } catch (e) {}
                
                try {
                    if (window.comboQuotesTable && window.comboQuotesTable.ajax && typeof window.comboQuotesTable.ajax.reload === 'function') {
                        window.comboQuotesTable.ajax.reload(null, false);
                    }
                } catch (e) {}
                
            }, 1000);
            
            console.log('✅✅✅ Eliminación completada');
            
        } catch (error) {
            console.error('❌ Error eliminando factura:', error);
            cleanupModals();
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Ocurrió un error al eliminar la factura',
                confirmButtonText: 'Entendido'
            });
        }
    }
};

// =========================
// ✅ FUNCIÓN AUXILIAR: Recargar tabla específica
// =========================
window.forceReloadTable = function(tableName) {
    console.log(`🔄 Forzando recarga de: ${tableName}`);
    
    const table = window[tableName];
    
    if (!table) {
        console.warn(`⚠️ Tabla ${tableName} no encontrada`);
        return false;
    }
    
    try {
        if (table.ajax && typeof table.ajax.reload === 'function') {
            table.ajax.reload(null, false);
            console.log(`✅ ${tableName} recargada`);
            return true;
        } else {
            console.warn(`⚠️ ${tableName} no tiene ajax.reload`);
            return false;
        }
    } catch (e) {
        console.error(`❌ Error recargando ${tableName}:`, e);
        return false;
    }
};

// =========================
// ✅ FUNCIÓN DE EMERGENCIA: Recargar TODO
// =========================
window.reloadAllTables = function() {
    console.log('🔄🔄🔄 RECARGA MASIVA DE TODAS LAS TABLAS');
    
    const tables = [
        'invoicesTable',
        'quotesTable', 
        'comboQuotesTable',
        'pendingQuotesTable'
    ];
    
    tables.forEach(tableName => {
        window.forceReloadTable(tableName);
    });
    
    // También llamar funciones de recarga si existen
    if (typeof window.reloadPendingQuotesTable === 'function') {
        window.reloadPendingQuotesTable();
    }
    
    console.log('✅ Recarga masiva completada');
};

// ✅ FUNCIÓN GLOBAL: Ver factura
window.viewInvoice = async function(id) {
    try {
        // ✅ Limpiar modales antes de abrir uno nuevo
        cleanupModals();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const result = await apiRequest(`invoices.php?id=${id}`);
        const invoice = result.data;
        window.currentInvoiceId = id;
        
        let itemsHtml = '';
        
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">Q${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td class="text-end">Q${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        const html = `
            <div class="invoice-document" id="printableInvoice">
                <div class="text-center mb-4">
                    <h2>SISTEMA DE GESTIÓN EMPRESARIAL</h2>
                    <h4>FACTURA</h4>
                    <p class="text-muted">Factura N° ${invoice.number}</p>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6>Facturado a:</h6>
                        <p class="mb-1"><strong>${invoice.client_name} ${invoice.client_last_name || ''}</strong></p>
                        <p class="mb-1">NIT: ${invoice.client_nit || 'N/A'}</p>
                        <p class="mb-1">Tel: ${invoice.client_phone || 'N/A'}</p>
                        <p class="mb-1">Email: ${invoice.client_email || 'N/A'}</p>
                        <p class="mb-1">${invoice.client_address || ''}</p>
                    </div>
                    <div class="col-md-6 text-end">
                        <p class="mb-1"><strong>Factura N°:</strong> ${invoice.number}</p>
                        <p class="mb-1"><strong>Cotización:</strong> ${invoice.quote_number}</p>
                        <p class="mb-1"><strong>Fecha:</strong> ${new Date(invoice.created_at).toLocaleDateString('es-GT')}</p>
                    </div>
                </div>
                
                <table class="table table-bordered">
                    <thead class="table-dark">
                        <tr>
                            <th>Descripción</th>
                            <th class="text-center" width="100">Cant.</th>
                            <th class="text-end" width="120">P. Unit.</th>
                            <th class="text-end" width="120">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr class="table-success">
                            <td colspan="3" class="text-end"><h5 class="mb-0">TOTAL:</h5></td>
                            <td class="text-end"><h4 class="mb-0">Q${parseFloat(invoice.total).toFixed(2)}</h4></td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="text-center mt-4 print-only" style="display:none;">
                    <p class="text-muted small">Gracias por su preferencia</p>
                </div>
            </div>
        `;
        
        $('#invoiceDetails').html(html);
        
        // ✅ Abrir modal con pequeño retraso
        setTimeout(() => {
            $('#viewInvoiceModal').modal('show');
        }, 150);
        
    } catch (error) {
        console.error('Error viendo factura:', error);
        cleanupModals();
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la factura',
            confirmButtonText: 'Entendido'
        });
    }
};

// ✅ FUNCIÓN: Ver detalle de factura con título dinámico
window.viewInvoiceDetail = async function(id) {
    try {
        console.log(`📄 [VIEW INVOICE DETAIL] Cargando factura ID: ${id}`);
        
        // Limpiar modales
        cleanupModals();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Obtener datos de la factura
        const result = await apiRequest(`invoices.php?id=${id}`);
        const invoice = result.data;
        window.currentInvoiceId = id;
        
        console.log('📦 Factura obtenida:', invoice);
        
        // ✅ CARGAR MENSAJES DE TRABAJO si existen
        let workMessagesFromDB = [];
        if (invoice.work_messages) {
            try {
                workMessagesFromDB = JSON.parse(invoice.work_messages);
                console.log('✅ Mensajes cargados desde BD:', workMessagesFromDB);
            } catch (e) {
                console.error('❌ Error parseando mensajes:', e);
            }
        }
        
        // ✅ CARGAR TÍTULO DE MENSAJES (con valor por defecto)
        const workMessagesTitle = invoice.work_messages_title || 'Trabajo Realizado';
        console.log('✅ Título cargado:', workMessagesTitle);
        
        // Construir HTML de items
        let itemsHtml = '';
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.description || item.product_name || ''}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">Q${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td class="text-end">Q${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        // ✅ Construir HTML de mensajes de trabajo con TÍTULO DINÁMICO
        let messagesHtml = '';
        if (workMessagesFromDB && workMessagesFromDB.length > 0) {
            messagesHtml = `
                <div class="mt-4">
                    <h6 class="text-primary">
                        <i class="bi bi-list-check"></i> ${workMessagesTitle}:
                    </h6>
                    <div class="alert alert-light border">
                        <ol class="mb-0">
                            ${workMessagesFromDB.map(msg => `<li>${msg}</li>`).join('')}
                        </ol>
                    </div>
                </div>
            `;
        }
        
        const html = `
            <div class="invoice-document" id="printableInvoice">
                <div class="text-center mb-4">
                    <h2>SISTEMA DE GESTIÓN EMPRESARIAL</h2>
                    <h4>FACTURA</h4>
                    <p class="text-muted">Factura N° ${invoice.number}</p>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6>Facturado a:</h6>
                        <p class="mb-1"><strong>${invoice.client_name} ${invoice.client_last_name || ''}</strong></p>
                        <p class="mb-1">NIT: ${invoice.client_nit || 'N/A'}</p>
                        <p class="mb-1">Tel: ${invoice.client_phone || 'N/A'}</p>
                        <p class="mb-1">Email: ${invoice.client_email || 'N/A'}</p>
                        <p class="mb-1">${invoice.client_address || ''}</p>
                    </div>
                    <div class="col-md-6 text-end">
                        <p class="mb-1"><strong>Factura N°:</strong> ${invoice.number}</p>
                        <p class="mb-1"><strong>Cotización:</strong> ${invoice.quote_number}</p>
                        <p class="mb-1"><strong>Fecha:</strong> ${new Date(invoice.created_at).toLocaleDateString('es-GT')}</p>
                    </div>
                </div>
                
                ${messagesHtml}
                
                <h6 class="mt-4">Productos/Servicios:</h6>
                <table class="table table-bordered">
                    <thead class="table-dark">
                        <tr>
                            <th>Descripción</th>
                            <th class="text-center" width="100">Cant.</th>
                            <th class="text-end" width="120">P. Unit.</th>
                            <th class="text-end" width="120">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr class="table-success">
                            <td colspan="3" class="text-end"><h5 class="mb-0">TOTAL:</h5></td>
                            <td class="text-end"><h4 class="mb-0">Q${parseFloat(invoice.total).toFixed(2)}</h4></td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="text-center mt-4 print-only" style="display:none;">
                    <p class="text-muted small">Gracias por su preferencia</p>
                </div>
            </div>
        `;
        
        $('#invoiceDetails').html(html);
        
        console.log('✅ HTML construido, abriendo modal...');
        
        // Abrir modal
        setTimeout(() => {
            $('#viewInvoiceModal').modal('show');
            console.log('✅ Modal abierto');
        }, 150);
        
    } catch (error) {
        console.error('❌ Error viendo detalle de factura:', error);
        cleanupModals();
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la factura: ' + (error.message || 'Error desconocido'),
            confirmButtonText: 'Entendido'
        });
    }
};

// ============================================
// IMPRIMIR FACTURA - CON TÍTULO DINÁMICO
// ============================================
window.printInvoice = async function(invoiceId) {
    if (!invoiceId) {
        Swal.fire('Error', 'No se encontró el ID de la factura.', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'Preparando impresión...',
            text: 'Por favor espera unos segundos.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch(`${API_BASE}invoices.php?id=${invoiceId}`);
        const result = await response.json();

        if (!result.success || !result.data) {
            Swal.fire('Error', 'No se pudieron obtener los datos de la factura.', 'error');
            return;
        }

        const invoice = result.data;
        const items = invoice.items || [];

        // Cargar mensajes desde BD
        let workMessagesFromDB = [];
        if (invoice.work_messages) {
            try {
                workMessagesFromDB = JSON.parse(invoice.work_messages);
            } catch (e) {
                console.error('Error parseando mensajes:', e);
            }
        }
        
        // ✅ NUEVO: Cargar título desde BD
        const workMessagesTitle = invoice.work_messages_title || 'TRABAJO REALIZADO';

        const fecha = new Date(invoice.created_at).toLocaleDateString('es-GT', { 
            day: '2-digit', month: '2-digit', year: 'numeric' 
        });

        // ✅ Generar filas de mensajes con TÍTULO DINÁMICO (si existen)
        let messagesSection = '';
        if (workMessagesFromDB && workMessagesFromDB.length > 0) {
            let messagesRows = '';
            workMessagesFromDB.forEach((text, index) => {
                messagesRows += `
                    <tr>
                        <td style="text-align: center; font-weight: bold; background-color: #ffe6f0;">${index + 1}</td>
                        <td style="text-align: left; background-color: #ffe6f0;">${text}</td>
                    </tr>
                `;
            });
            
            messagesSection = `
                <div style="text-align: center; color: #5bc0de; font-size: 14px; font-weight: bold; margin: 15px 0 10px 0;">
                    ${workMessagesTitle.toUpperCase()}
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 2px solid #5bc0de;">
                    <thead>
                        <tr>
                            <th style="background-color: #4169e1; color: white; padding: 8px; text-align: center; font-size: 11px; font-weight: bold; width: 10%;">N°</th>
                            <th style="background-color: #4169e1; color: white; padding: 8px; text-align: center; font-size: 11px; font-weight: bold; width: 90%;">Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${messagesRows}
                    </tbody>
                </table>
            `;
        }

        // Generar filas de productos
        let productRows = '';
        items.forEach((item, index) => {
            const bgColor = index % 2 === 0 ? '#f0f8ff' : '#ffffff';
            productRows += `
                <tr>
                    <td style="text-align: center; font-weight: bold; background-color: ${bgColor};">${item.quantity}</td>
                    <td style="text-align: left; background-color: ${bgColor};">${item.description || item.product_name || ''}</td>
                    <td style="text-align: center; background-color: ${bgColor};">${item.product_code || item.code || ''}</td>
                    <td style="text-align: center; background-color: ${bgColor};">Q${Number(item.unit_price).toFixed(2)}</td>
                    <td style="text-align: center; background-color: ${bgColor};">Q${Number(item.total).toFixed(2)}</td>
                </tr>
            `;
        });

        const totalAmount = items.reduce((sum, item) => sum + Number(item.total), 0);
        const totalEnLetras = window.numeroALetras ? window.numeroALetras(totalAmount) : '';

        // Crear ventana de impresión
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Factura ${invoice.number} - Impresión</title>
                <style>
                    @media print {
                        @page { 
                            margin: 1cm;
                            size: letter;
                        }
                        body { margin: 0; padding: 10px; }
                        .no-print { display: none !important; }
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                    }
                    
                    body {
                        font-family: 'Helvetica', Arial, sans-serif;
                        padding: 20px;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    
                    .print-button {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        z-index: 1000;
                        padding: 10px 20px;
                        background-color: #0d6efd;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                    }
                    
                    .print-button:hover {
                        background-color: #0b5ed7;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    
                    .header h1 {
                        font-size: 16px;
                        font-weight: bold;
                        margin: 5px 0;
                    }
                    
                    .header p {
                        margin: 3px 0;
                        font-size: 13px;
                    }
                    
                    .header .email {
                        color: #5bc0de;
                    }
                    
                    .logo {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        width: 120px;
                    }
                    
                    .client-section {
                        background-color: #5bc0de;
                        color: white;
                        padding: 8px;
                        text-align: center;
                        font-weight: bold;
                        font-size: 16px;
                        margin: 20px 0 10px 0;
                        width: 300px;
                    }
                    
                    .invoice-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        font-size: 12px;
                    }
                    
                    .client-box {
                        border: 2px solid #000;
                        border-radius: 10px;
                        padding: 15px;
                        margin-bottom: 20px;
                    }
                    
                    .client-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 12px;
                    }
                    
                    .client-row span:first-child {
                        font-weight: bold;
                    }
                    
                    .invoice-title {
                        text-align: center;
                        color: #4169e1;
                        font-size: 18px;
                        font-weight: bold;
                        margin: 20px 0;
                    }
                    
                    .section-title {
                        text-align: center;
                        color: #5bc0de;
                        font-size: 14px;
                        font-weight: bold;
                        margin: 15px 0 10px 0;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                        border: 2px solid #5bc0de;
                    }
                    
                    table th {
                        background-color: #4169e1;
                        color: white;
                        padding: 8px;
                        text-align: center;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    
                    table.messages th {
                        background-color: #4169e1;
                    }
                    
                    table.products th {
                        background-color: #5bc0de;
                    }
                    
                    table td {
                        padding: 6px;
                        font-size: 10px;
                        border: 1px solid #ddd;
                    }
                    
                    .note {
                        color: red;
                        font-weight: bold;
                        font-size: 10px;
                        margin: 10px 0;
                    }
                    
                    .divider {
                        border-top: 2px solid #000;
                        margin: 15px 0;
                    }
                    
                    .footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: 10px;
                    }
                    
                    .total-text {
                        font-weight: bold;
                        font-size: 11px;
                        text-align: center;
                        flex: 1;
                    }
                    
                    .factura-label {
                        font-weight: bold;
                        font-size: 11px;
                        text-align: right;
                        margin-right: 20px;
                    }
                    
                    .total-amount {
                        text-align: right;
                    }
                    
                    .total-amount .label {
                        color: red;
                        font-weight: bold;
                        font-size: 18px;
                    }
                    
                    .total-amount .amount {
                        color: red;
                        font-weight: bold;
                        font-size: 18px;
                    }
                </style>
            </head>
            <body>
                <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>
                
                <div class="header">
                    <h1>SERVICIOS Y MANTENIMIENTOS TÉCNICOS-ELÉCTRICOS</h1>
                    <p class="email">serytecs@gmail.com</p>
                    <p>Cel. 4967 - 1164</p>
                </div>
                
                <img src="assets/js/logo.png" alt="Logo" class="logo">
                
                <div class="client-section">CLIENTE</div>
                
                <div class="invoice-info">
                    <div><strong>Fecha:</strong> ${fecha.replace(/\//g, ' / ')}</div>
                    <div><strong>N°</strong> ${invoice.number}</div>
                </div>
                
                <div class="client-box">
                    <div class="client-row">
                        <div><strong>Cliente:</strong> ${invoice.client_name} ${invoice.client_last_name || ''}</div>
                        <div><strong>Email:</strong> ${invoice.client_email || ''}</div>
                    </div>
                    <div class="client-row">
                        <div><strong>Teléfono:</strong> ${invoice.client_phone || ''}</div>
                    </div>
                    <div class="client-row">
                        <div><strong>NIT:</strong> ${invoice.client_nit || ''}</div>
                        <div><strong>Tipo:</strong> ${invoice.quote_type}</div>
                    </div>
                    <div class="client-row">
                        <div><strong>Dirección:</strong> ${invoice.client_address || invoice.address || 'Sin dirección'}</div>
                    </div>
                </div>
                
                <div class="invoice-title">Factura</div>
                
                ${messagesSection}
                
                <div class="section-title">MATERIAL UTILIZADO</div>
                <table class="products">
                    <thead>
                        <tr>
                            <th style="width: 10%;">CANT.</th>
                            <th style="width: 45%;">DESCRIPCION</th>
                            <th style="width: 15%;">CODIGO</th>
                            <th style="width: 15%;">P/U</th>
                            <th style="width: 15%;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productRows}
                    </tbody>
                </table>
                
                <p class="note">
                    Nota: Al momento de autorizar la cotización para proyecto, se solicita un 60% de la totalidad como anticipo
                </p>
                
                <div class="divider"></div>
                
                <div class="footer">
                    <div class="total-text">${totalEnLetras}</div>
                    <div class="factura-label">FACTURA</div>
                </div>
                
                <div class="total-amount">
                    <span class="label">TOTAL</span>
                    <span class="amount">Q ${totalAmount.toFixed(2)}</span>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        Swal.close();
        
        printWindow.onload = function() {
            printWindow.focus();
        };
        
        printWindow.onafterprint = function() {
            if (confirm('¿Desea cerrar esta ventana?')) {
                printWindow.close();
            }
        };
        
    } catch (error) {
        console.error('Error al preparar impresión:', error);
        Swal.fire('Error', 'Hubo un problema preparando la impresión.', 'error');
    }
};

//============================================
// DESCARGAR PDF DE FACTURA - CON TÍTULO DINÁMICO
// ============================================
window.downloadInvoicePDF = async function(invoiceId) {
    if (!invoiceId) {
        Swal.fire('Error', 'No se encontró el ID de la factura.', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'Generando PDF...',
            text: 'Por favor espera unos segundos.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch(`${API_BASE}invoices.php?id=${invoiceId}`);
        const result = await response.json();

        if (!result.success || !result.data) {
            Swal.fire('Error', 'No se pudieron obtener los datos de la factura.', 'error');
            return;
        }

        const invoice = result.data;
        const items = invoice.items || [];

        // ✅ Cargar mensajes desde BD
        let workMessagesFromDB = [];
        if (invoice.work_messages) {
            try {
                workMessagesFromDB = JSON.parse(invoice.work_messages);
                console.log('✅ Mensajes cargados para PDF:', workMessagesFromDB);
            } catch (e) {
                console.error('❌ Error parseando mensajes:', e);
            }
        }
        
        // ✅ NUEVO: Cargar el título desde la BD
        let workMessagesTitle = invoice.work_messages_title || 'TRABAJO REALIZADO';
        console.log('✅ Título cargado:', workMessagesTitle);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const logoImg = new Image();
        logoImg.src = 'assets/js/logo.png';
        await new Promise((resolve) => { logoImg.onload = resolve; });

        // Encabezado
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('SERVICIOS Y MANTENIMIENTOS TÉCNICOS ELÉCTRICOS', 95, 20, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        doc.setTextColor(91, 192, 222);
        doc.text('serymtecs@gmail.com', 95, 30, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text('Cel. 4967 - 1164', 95, 38, { align: 'center' });

        const logoWidth = 50;
        const logoHeight = 32;
        doc.addImage(logoImg, 'PNG', 150, 10, logoWidth, logoHeight);

        // Sección cliente
        doc.setFillColor(91, 192, 222);
        doc.rect(15, 48, 85, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('CLIENTE', 57, 56.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Fecha:', 110, 54);
        doc.setFont('helvetica', 'normal');
        const fecha = new Date(invoice.created_at).toLocaleDateString('es-GT', { 
            day: '2-digit', month: '2-digit', year: 'numeric' 
        });
        doc.text(fecha.replace(/\//g, ' / '), 127, 54);

        doc.setFont('helvetica', 'bold');
        doc.text('N°', 165, 54);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.number, 175, 54);

        // Datos del cliente
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.roundedRect(15, 62, 180, 35, 3, 3);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Cliente:', 20, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(`${invoice.client_name} ${invoice.client_last_name || ''}`, 38, 70);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Email:', 120, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.client_email || '', 133, 70);

        doc.setFont('helvetica', 'bold');
        doc.text('Teléfono:', 20, 77);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.client_phone || '', 42, 77);

        doc.setFont('helvetica', 'bold');
        doc.text('NIT:', 20, 84);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.client_nit ? String(invoice.client_nit) : '', 32, 84);

        doc.setFont('helvetica', 'bold');
        doc.text('Tipo:', 120, 84);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.quote_type, 133, 84);

        doc.setFont('helvetica', 'bold');
        doc.text('Direccion:', 20, 91);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.client_address || invoice.address || 'Sin dirección', 45, 91);

        // Título
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(65, 105, 225);
        doc.text('Factura', 105, 107, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // ============================================
        // ✅ PARTE 1: TABLA DE MENSAJES PRIMERO (si existen) CON TÍTULO DINÁMICO
        // ============================================
        let currentY = 117;
        
        if (workMessagesFromDB && workMessagesFromDB.length > 0) {
            // ✅ Subtítulo dinámico (en mayúsculas)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(91, 192, 222);
            doc.text(workMessagesTitle.toUpperCase(), 105, currentY, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            
            currentY += 5;
            
            // Numeración secuencial: 1, 2, 3, etc.
            const messagesData = workMessagesFromDB.map((text, index) => [
                (index + 1).toString(),
                text
            ]);
            
            doc.autoTable({
                startY: currentY,
                head: [['N°', 'Descripción']],
                body: messagesData,
                styles: { 
                    fontSize: 8, 
                    cellPadding: 2,
                    overflow: 'linebreak' 
                },
                headStyles: { 
                    fillColor: [65, 105, 225], 
                    textColor: [255, 255, 255],
                    fontStyle: 'bold', 
                    halign: 'center', 
                    fontSize: 9
                },
                bodyStyles: { 
                    fillColor: [255, 230, 240] 
                },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 160, halign: 'left' }
                },
                margin: { left: 15, right: 15 },
                tableLineColor: [65, 105, 225],
                tableLineWidth: 0.5
            });
            
            currentY = doc.lastAutoTable.finalY + 10;
            console.log(`✅ Tabla de mensajes agregada con título: ${workMessagesTitle}`);
        }

        // ============================================
        // ✅ PARTE 2: TABLA DE PRODUCTOS DESPUÉS
        // ============================================
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(91, 192, 222);
        doc.text('MATERIAL UTILIZADO', 105, currentY, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        
        currentY += 5;

        const tableData = items.map(item => [
            item.quantity.toString(),
            item.description || item.product_name || '',
            item.product_code || item.code || '',
            `Q${Number(item.unit_price).toFixed(2)}`,
            `Q${Number(item.total).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: currentY,
            head: [['CANT.', 'DESCRIPCION', 'CODIGO', 'P/U', 'TOTAL']],
            body: tableData,
            styles: { 
                fontSize: 8, cellPadding: 2, overflow: 'linebreak', 
                cellWidth: 'wrap', halign: 'center', lineWidth: 0.1, 
                lineColor: [255, 255, 255]
            },
            headStyles: { 
                fillColor: [91, 192, 222], textColor: [255, 255, 255], 
                fontStyle: 'bold', halign: 'center', fontSize: 9, 
                lineWidth: 0.1, lineColor: [255, 255, 255]
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 85, halign: 'left' },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' }
            },
            alternateRowStyles: { fillColor: [240, 248, 255] },
            margin: { left: 15, right: 15 },
            tableLineColor: [91, 192, 222],
            tableLineWidth: 0.5
        });

        // Nota y total
        const finalY = doc.lastAutoTable.finalY + 5;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 0, 0);
        doc.text('Nota: Al momento de autorizar la cotización para proyecto, se solicita un 60% de la totalidad como anticipo.', 15, finalY + 5, { maxWidth: 130 });
        doc.setTextColor(0, 0, 0);

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(15, finalY + 12, 195, finalY + 12);

        const totalAmount = items.reduce((sum, item) => sum + Number(item.total), 0);
        const totalEnLetras = window.numeroALetras ? window.numeroALetras(totalAmount) : '';
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(totalEnLetras, 105, finalY + 18, { align: 'center' });
        doc.text('FACTURA', 160, finalY + 18);

        doc.setFontSize(16);
        doc.setTextColor(255, 0, 0);
        doc.text('TOTAL', 145, finalY + 28);
        doc.text(`Q ${totalAmount.toFixed(2)}`, 168, finalY + 28);

        doc.save(`Factura_${invoice.number}.pdf`);
        Swal.close();

    } catch (error) {
        console.error('Error al generar PDF:', error);
        Swal.fire('Error', 'Hubo un problema generando el PDF.', 'error');
    }
};

// =========================
// MÓDULO DE FACTURACIÓN (Manejo de la vista)
// =========================

async function initInvoicesModule() {
    console.log('💰 Inicializando módulo de facturación...');
    
    // ✅ Inicializar tabla
    loadInvoicesTable();
    
    // ✅ Configurar filtro de búsqueda por texto
    $('#invoiceSearch').on('keyup', function() {
        if (window.invoicesTable) {
            window.invoicesTable.search(this.value).draw();
        }
    });
    
    // ✅ Configurar fechas por defecto (último mes)
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    $('#invoiceDateTo').val(today.toISOString().split('T')[0]);
    $('#invoiceDateFrom').val(lastMonth.toISOString().split('T')[0]);
    
    console.log('✅ Módulo de facturación inicializado');
}

function loadInvoicesTable() {
    if (!$('#invoicesTable').length) {
        console.warn('⚠️ Tabla #invoicesTable no encontrada');
        return;
    }

    if ($.fn.DataTable.isDataTable('#invoicesTable')) {
        $('#invoicesTable').DataTable().destroy();
    }
    
    window.invoicesTable = $('#invoicesTable').DataTable({
        ajax: {
            url: API_BASE + 'invoices.php',
            dataSrc: 'data'
        },
        columns: [
            { data: 'number' },
            { data: 'client_name' },
            { 
                data: 'total',
                render: (data) => `Q${parseFloat(data).toFixed(2)}`
            },
            {
                data: 'created_at',
                render: (data) => new Date(data).toLocaleDateString('es-GT')
            },
            {
                data: null,
                render: (data) => `
                    <button class="btn btn-sm btn-info me-1" onclick="viewInvoiceDetail(${data.id})" title="Ver">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteInvoice(${data.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                `
            }
        ],
        order: [[3, 'desc']], // Ordenar por fecha descendente
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
            emptyTable: 'No hay facturas generadas'
        },
        pageLength: 10,
        responsive: true,
        searching: true,
        dom: 'lrtip'
    });
}

// ✅ FUNCIÓN: Filtrar facturas por rango de fechas
window.filterInvoicesByDate = function() {
    const dateFrom = $('#invoiceDateFrom').val();
    const dateTo = $('#invoiceDateTo').val();
    
    if (!dateFrom || !dateTo) {
        Toast.fire({
            icon: 'warning',
            title: 'Debe seleccionar ambas fechas'
        });
        return;
    }
    
    if (new Date(dateFrom) > new Date(dateTo)) {
        Toast.fire({
            icon: 'error',
            title: 'La fecha "Desde" no puede ser mayor que "Hasta"'
        });
        return;
    }
    
    if (!window.invoicesTable) {
        console.error('Tabla de facturas no inicializada');
        return;
    }
    
    // ✅ Filtro personalizado de DataTables
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        // Solo aplicar el filtro a la tabla de facturas
        if (settings.nTable.id !== 'invoicesTable') {
            return true;
        }
        
        const dateStr = data[3]; // Columna de fecha (índice 3)
        
        // Convertir fecha de formato "DD/MM/YYYY" a objeto Date
        const parts = dateStr.split('/');
        if (parts.length !== 3) return true;
        
        const invoiceDate = new Date(parts[2], parts[1] - 1, parts[0]);
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        
        // Ajustar las fechas para incluir todo el día
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        
        return invoiceDate >= fromDate && invoiceDate <= toDate;
    });
    
    // Redibujar la tabla con el filtro aplicado
    window.invoicesTable.draw();
    
    Toast.fire({
        icon: 'success',
        title: 'Filtro aplicado correctamente'
    });
};

// ✅ FUNCIÓN: Limpiar filtros de fecha
window.clearInvoiceFilters = function() {
    // Limpiar campos de fecha
    $('#invoiceDateFrom').val('');
    $('#invoiceDateTo').val('');
    
    // Limpiar búsqueda por texto
    $('#invoiceSearch').val('');
    
    // Remover filtros personalizados
    $.fn.dataTable.ext.search.pop();
    
    // Redibujar tabla
    if (window.invoicesTable) {
        window.invoicesTable.search('').draw();
    }
    
    Toast.fire({
        icon: 'info',
        title: 'Filtros eliminados'
    });
};

// =========================
// MÓDULO DE COTIZACIONES CON INTERFAZ DE TABLA - CORREGIDO
// =========================
let currentQuoteFilter = 'all';
let quoteItemCounter = 0;
let editQuoteItemCounter = 0;
let productsCache = [];
let currentSearchMode = 'new';

async function loadProductsCache() {
    try {
        console.log('📦 Cargando productos en caché...');
        
        // ✅ CRÍTICO: Agregar timestamp para evitar caché del navegador
        const result = await apiRequest('products.php?_t=' + new Date().getTime());
        
        if (result.success && result.data && Array.isArray(result.data)) {
            productsCache = result.data;
            allProducts = result.data; // ✅ Sincronizar ambos caches
            console.log(`✅ ${productsCache.length} productos cargados en caché`);
            return productsCache;
        } else {
            console.warn('⚠️ No se recibieron productos válidos');
            productsCache = [];
            allProducts = [];
            return [];
        }
    } catch (error) {
        console.error('❌ Error cargando productos en caché:', error);
        productsCache = [];
        allProducts = [];
        return [];
    }
}

// ✅ 2. FUNCIÓN CORREGIDA: forceReloadProducts (línea ~1230 aprox)
window.forceReloadProducts = async function() {
    console.log('🔄 Forzando recarga de productos...');
    productsCache = []; // Limpiar caché
    allProducts = []; // Limpiar caché secundario
    return await loadProductsCache(); // ✅ Recargar UNA SOLA VEZ
};

// ============================================
// LÓGICA PARA RELLENAR ESPACIOS VACÍOS O CREAR NUEVOS
// ============================================

function fillOrCreateQuoteItemWithProduct(product) {
    let emptyRow = null;
    
    $('#quoteItems .quote-item').each(function() {
        const productId = $(this).find('.item-product-id').val();
        const name = $(this).find('.item-name').val().trim();
        
        if (!productId && !name) {
            emptyRow = $(this);
            return false;
        }
    });
    
    if (emptyRow) {
        const index = emptyRow.data('index');
        emptyRow.find('.item-code').val(product.code);
        emptyRow.find('.item-product-id').val(product.id);
        emptyRow.find('.item-name').val(product.name).prop('readonly', true).css('background-color', '#f8f9fa');
        emptyRow.find('.item-price').val(product.sale_price).prop('readonly', true).css('background-color', '#f8f9fa');
        emptyRow.find('.item-quantity').attr('max', product.stock || 999999);
        
        if (product.stock > 0) {
            emptyRow.find('td:eq(4)').append(`<br><small class="text-muted">Disponible: ${product.stock}</small>`);
        }
        
        calculateItemTotal(index);
    } else {
        addQuoteItemWithProduct(product);
    }
}

function fillOrCreateEditQuoteItemWithProduct(product) {
    let emptyRow = null;
    
    $('#editQuoteItemsMain .edit-quote-item-main').each(function() {
        const productId = $(this).find('.item-product-id').val();
        const name = $(this).find('.item-name').val().trim();
        
        if (!productId && !name) {
            emptyRow = $(this);
            return false;
        }
    });
    
    if (emptyRow) {
        const index = emptyRow.data('index');
        emptyRow.find('.item-code').val(product.code);
        emptyRow.find('.item-product-id').val(product.id);
        emptyRow.find('.item-original-product-id').val(product.id);
        emptyRow.find('.item-name').val(product.name).prop('readonly', true).css('background-color', '#f8f9fa');
        emptyRow.find('.item-price').val(product.sale_price).prop('readonly', true).css('background-color', '#f8f9fa');
        emptyRow.find('.item-quantity').attr('max', product.stock || 999999);
        
        if (product.stock > 0) {
            emptyRow.find('td:eq(4)').append(`<br><small class="text-muted">Disponible: ${product.stock}</small>`);
        }
        
        calculateEditItemTotalMain(index);
    } else {
        addEditQuoteItemMainWithProduct(product);
    }
}

// ============================================
// FUNCIONES PARA EDITAR COTIZACIÓN PENDIENTE
// ============================================

window.editPendingQuote = async function(quoteId) {
    try {
        await loadProductsCache();
        
        const result = await apiRequest(`quotes.php?id=${quoteId}`);
        const quote = result.data;
        
        // ✅ VERIFICACIÓN: Solo permitir editar cotizaciones pendientes
        if (quote.status !== 'pending') {
            Swal.fire({
                icon: 'warning',
                title: 'No se puede editar',
                text: 'Esta cotización ya fue facturada y no puede ser modificada.',
                confirmButtonText: 'Entendido'
            });
            return;
        }
        
        if (!quote.items || quote.items.length === 0 || parseFloat(quote.total) === 0) {
            const confirmResult = await Swal.fire({
                title: '⚠️ Cotización Vacía',
                html: `
                    <p>Esta cotización no tiene productos o quedó vacía porque los productos fueron asignados a otra factura.</p>
                    <p class="text-muted mt-2">¿Desea eliminar esta cotización vacía?</p>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '<i class="bi bi-trash"></i> Eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d'
            });
            
            if (confirmResult.isConfirmed) {
                await deleteQuote(quoteId, true);
            }
            return;
        }
        
        $('#editQuoteIdMain').val(quote.id);
        $('#editQuoteItemsMain').empty();
        editQuoteItemCounter = 0;
        
        if (quote.items && quote.items.length > 0) {
            quote.items.forEach(item => {
                const product = productsCache.find(p => p.id === item.product_id);
                addEditQuoteItemMainWithProduct(product, item);
            });
        }
        
        calculateEditQuoteTotalMain();
        $('#editQuoteModalMain').modal('show');
    } catch (error) {
        console.error('Error cargando cotización para editar:', error);
        Toast.fire({
            icon: 'error',
            title: 'Error al cargar la cotización'
        });
    }
};

window.addEditQuoteItemMainEmpty = function() {
    addEditQuoteItemMainWithProduct(null, null);
};

function addEditQuoteItemMainWithProduct(product, itemData = null) {
    editQuoteItemCounter++;
    
    const code = product ? product.code : (itemData ? itemData.product_code : '');
    const name = product ? product.name : (itemData ? itemData.description : '');
    const price = product ? product.sale_price : (itemData ? itemData.unit_price : '');
    const quantity = itemData ? itemData.quantity : 1;
    const stock = product ? product.stock : 0;
    const productId = product ? product.id : (itemData ? itemData.product_id : '');
    const total = itemData ? itemData.total : (product ? product.sale_price : 0);
    
    const row = `
        <tr class="edit-quote-item-main" data-index="${editQuoteItemCounter}">
            <input type="hidden" class="item-original-product-id" value="${productId || ''}">
            <input type="hidden" class="item-original-quantity" value="${quantity}">
            <td class="text-center item-number">${String(editQuoteItemCounter).padStart(3, '0')}</td>
            <td>
                <input type="text" class="form-control form-control-sm item-code" value="${code}" readonly style="background-color: #f8f9fa;">
                <input type="hidden" class="item-product-id" value="${productId}">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm item-name" value="${name}" ${product || itemData ? 'readonly style="background-color: #f8f9fa;"' : 'placeholder="Descripción manual"'}>
            </td>
            <td>
                <input type="number" step="0.01" class="form-control form-control-sm item-price" value="${price}" ${product || itemData ? 'readonly style="background-color: #f8f9fa;"' : 'placeholder="0.00"'} onchange="calculateEditItemTotalMain(${editQuoteItemCounter})">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm item-quantity" value="${quantity}" min="1" max="${stock || 999999}" onchange="calculateEditItemTotalMain(${editQuoteItemCounter})">
                ${stock > 0 ? `<small class="text-muted">Disponible: ${stock}</small>` : ''}
            </td>
            <td>
                <input type="text" class="form-control form-control-sm item-total" readonly value="Q ${parseFloat(total).toFixed(2)}" style="background-color: #f8f9fa;">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeEditQuoteItemMain(${editQuoteItemCounter})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;
    
    $('#editQuoteItemsMain').append(row);
    calculateEditQuoteTotalMain();
}

window.removeEditQuoteItemMain = function(index) {
    $(`.edit-quote-item-main[data-index="${index}"]`).remove();
    renumberEditQuoteItems();
    calculateEditQuoteTotalMain();
};

window.calculateEditItemTotalMain = function(index) {
    const item = $(`.edit-quote-item-main[data-index="${index}"]`);
    const quantity = parseFloat(item.find('.item-quantity').val()) || 0;
    const price = parseFloat(item.find('.item-price').val()) || 0;
    const total = quantity * price;
    
    item.find('.item-total').val(`Q ${total.toFixed(2)}`);
    calculateEditQuoteTotalMain();
};

function renumberEditQuoteItems() {
    $('#editQuoteItemsMain .edit-quote-item-main').each(function(index) {
        $(this).find('.item-number').text(String(index + 1).padStart(3, '0'));
    });
}

window.calculateEditQuoteTotalMain = function() {
    let total = 0;
    $('.edit-quote-item-main').each(function() {
        const quantity = parseFloat($(this).find('.item-quantity').val()) || 0;
        const price = parseFloat($(this).find('.item-price').val()) || 0;
        total += quantity * price;
    });
    
    $('#editQuoteTotalMain').text(`Q ${total.toFixed(2)}`);
};

window.saveEditedQuoteMain = async function() {
    const items = [];
    let isValid = true;
    let errorMessage = '';
    
    $('.edit-quote-item-main').each(function() {
        const productId = $(this).find('.item-product-id').val();
        const name = $(this).find('.item-name').val().trim();
        const quantity = parseInt($(this).find('.item-quantity').val());
        const unit_price = parseFloat($(this).find('.item-price').val());
        
        if (!name) {
            errorMessage = 'Todos los productos deben tener un nombre o descripción';
            isValid = false;
            return false;
        }
        
        if (!quantity || quantity <= 0 || !unit_price || unit_price <= 0) {
            errorMessage = 'Todos los items deben tener cantidad y precio válidos';
            isValid = false;
            return false;
        }
        
        items.push({
            product_id: productId ? parseInt(productId) : null,
            description: name,
            quantity,
            unit_price
        });
    });
    
    if (!isValid) {
        Toast.fire({
            icon: 'error',
            title: errorMessage
        });
        return;
    }
    
    if (items.length === 0) {
        Toast.fire({
            icon: 'error',
            title: 'Debe agregar al menos un producto'
        });
        return;
    }
    
    const quoteId = $('#editQuoteIdMain').val();
    
    try {
        const result = await apiRequest('quotes.php', {
            method: 'PUT',
            body: JSON.stringify({
                id: parseInt(quoteId),
                items: items
            })
        });
        
        Toast.fire({
            icon: 'success',
            title: 'Cotización actualizada correctamente'
        });
        
        $('#editQuoteModalMain').modal('hide');
        
        await loadProductsCache();
        
        if (typeof window.reloadPendingQuotesTable === 'function') {
            await window.reloadPendingQuotesTable();
        }
        
        if (typeof window.quotesTable !== 'undefined' && window.quotesTable && window.quotesTable.ajax) {
            window.quotesTable.ajax.reload(null, false);
        }
        
    } catch (error) {
        console.error('Error actualizando cotización:', error);
        Toast.fire({
            icon: 'error',
            title: error.message || 'Error al actualizar la cotización'
        });
    }
};

// ============================================
// MODAL DE BÚSQUEDA DE PRODUCTOS - SIMPLIFICADO
// ============================================

window.searchProductForQuote = function() {
    currentSearchMode = 'new';
    showProductSearchModal();
};

window.searchProductForEditQuote = function() {
    currentSearchMode = 'edit';
    showProductSearchModal();
};

async function showProductSearchModal() {
    $('#productSearchInput').val('');
    
    // ✅ Si no hay productos, cargar SOLO UNA VEZ
    if (!productsCache || productsCache.length === 0) {
        console.log('⚠️ Cache vacío, cargando productos...');
        
        Toast.fire({
            icon: 'info',
            title: 'Cargando productos...'
        });
        
        await loadProductsCache();
        
        if (productsCache.length === 0) {
            Toast.fire({
                icon: 'error',
                title: 'No hay productos disponibles'
            });
            return;
        }
    }
    
    displayProductSearchResults('');
    $('#searchProductModal').modal('show');
    
    // Event listener para búsqueda
    $('#productSearchInput').off('input').on('input', function() {
        displayProductSearchResults($(this).val());
    });
}

function displayProductSearchResults(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    
    // ✅ VALIDACIÓN: Verificar que productsCache tenga datos
    if (!productsCache || !Array.isArray(productsCache)) {
        $('#productSearchResults').html('<div class="alert alert-warning">Cargando productos...</div>');
        return;
    }
    
    if (productsCache.length === 0) {
        $('#productSearchResults').html('<div class="alert alert-info">No hay productos registrados en el sistema</div>');
        return;
    }
    
    let results = productsCache;
    if (searchTerm) {
        results = productsCache.filter(p => 
            (p.name && p.name.toLowerCase().includes(searchTerm)) || 
            (p.code && p.code.toLowerCase().includes(searchTerm))
        );
    }
    
    let html = '';
    if (results.length === 0) {
        html = '<div class="alert alert-info">No se encontraron productos con ese criterio de búsqueda</div>';
    } else {
        results.forEach(product => {
            const stockBadge = product.stock > 0 
                ? `<span class="badge bg-success">Stock: ${product.stock}</span>`
                : `<span class="badge bg-danger">Sin stock</span>`;
            
            html += `
                <div class="card mb-2" style="cursor: pointer;" onclick="selectProductFromSearch(${product.id})">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${product.name}</strong><br>
                                <small class="text-muted">Código: ${product.code}</small>
                            </div>
                            <div class="text-end">
                                ${stockBadge}<br>
                                <strong>Q${parseFloat(product.sale_price).toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    $('#productSearchResults').html(html);
}

window.selectProductFromSearch = function(productId) {
    const product = productsCache.find(p => p.id === productId);
    if (!product) {
        Toast.fire({
            icon: 'error',
            title: 'Producto no encontrado'
        });
        return;
    }
    
    $('#searchProductModal').modal('hide');
    
    if (currentSearchMode === 'new') {
        fillOrCreateQuoteItemWithProduct(product);
    } else {
        fillOrCreateEditQuoteItemWithProduct(product);
    }
};

// ============================================
// FUNCIONES PARA CREAR NUEVA COTIZACIÓN
// ============================================

window.openQuoteModal = async function() {
    $('#quoteForm')[0].reset();
    $('#quoteItems').empty();
    $('#quoteTotal').text('Q 0.00');
    quoteItemCounter = 0;
    
    // ✅ Solo cargar clientes (productos ya están en caché)
    await loadClientsForQuotes();
    $('#quoteModal').modal('show');
};

// ✅ CORRECCIÓN CRÍTICA: Filtrar correctamente las cotizaciones
window.filterQuotes = function(type) {
    console.log('🔍 Filtrando cotizaciones:', type);
    currentQuoteFilter = type;
    
    $('#quoteTypeTabs .nav-link').removeClass('active');
    $(`#quoteTypeTabs .nav-link[data-type="${type}"]`).addClass('active');
    
    loadQuotesTable();
};

window.addQuoteItemEmpty = function() {
    addQuoteItemWithProduct(null);
};

function addQuoteItemWithProduct(product) {
    quoteItemCounter++;
    
    const code = product ? product.code : '';
    const name = product ? product.name : '';
    const price = product ? product.sale_price : '';
    const stock = product ? product.stock : 0;
    const productId = product ? product.id : '';
    
    const row = `
        <tr class="quote-item" data-index="${quoteItemCounter}">
            <td class="text-center item-number">${String(quoteItemCounter).padStart(3, '0')}</td>
            <td>
                <input type="text" class="form-control form-control-sm item-code" value="${code}" readonly style="background-color: #f8f9fa;">
                <input type="hidden" class="item-product-id" value="${productId}">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm item-name" value="${name}" ${product ? 'readonly style="background-color: #f8f9fa;"' : 'placeholder="Descripción manual"'}>
            </td>
            <td>
                <input type="number" step="0.01" class="form-control form-control-sm item-price" value="${price}" ${product ? 'readonly style="background-color: #f8f9fa;"' : 'placeholder="0.00"'} onchange="calculateItemTotal(${quoteItemCounter})">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm item-quantity" value="1" min="1" max="${stock || 999999}" onchange="calculateItemTotal(${quoteItemCounter})">
                ${stock > 0 ? `<small class="text-muted">Disponible: ${stock}</small>` : ''}
            </td>
            <td>
                <input type="text" class="form-control form-control-sm item-total" readonly value="Q ${product ? parseFloat(price).toFixed(2) : '0.00'}" style="background-color: #f8f9fa;">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeQuoteItem(${quoteItemCounter})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;
    
    $('#quoteItems').append(row);
    calculateQuoteTotal();
}

window.removeQuoteItem = function(index) {
    $(`.quote-item[data-index="${index}"]`).remove();
    renumberQuoteItems();
    calculateQuoteTotal();
};

function renumberQuoteItems() {
    $('#quoteItems .quote-item').each(function(index) {
        $(this).find('.item-number').text(String(index + 1).padStart(3, '0'));
    });
}

window.calculateItemTotal = function(index) {
    const item = $(`.quote-item[data-index="${index}"]`);
    const quantity = parseFloat(item.find('.item-quantity').val()) || 0;
    const price = parseFloat(item.find('.item-price').val()) || 0;
    const total = quantity * price;
    
    item.find('.item-total').val(`Q ${total.toFixed(2)}`);
    calculateQuoteTotal();
};

window.calculateQuoteTotal = function() {
    let total = 0;
    $('.quote-item').each(function() {
        const quantity = parseFloat($(this).find('.item-quantity').val()) || 0;
        const price = parseFloat($(this).find('.item-price').val()) || 0;
        total += quantity * price;
    });
    
    $('#quoteTotal').text(`Q ${total.toFixed(2)}`);
};

window.saveQuote = async function() {
    const items = [];
    let isValid = true;
    let errorMessage = '';
    
    $('.quote-item').each(function() {
        const productId = $(this).find('.item-product-id').val();
        const name = $(this).find('.item-name').val().trim();
        const quantity = parseInt($(this).find('.item-quantity').val());
        const unit_price = parseFloat($(this).find('.item-price').val());
        
        if (!name) {
            errorMessage = 'Todos los productos deben tener un nombre o descripción';
            isValid = false;
            return false;
        }
        
        if (!quantity || quantity <= 0 || !unit_price || unit_price <= 0) {
            errorMessage = 'Todos los items deben tener cantidad y precio válidos';
            isValid = false;
            return false;
        }
        
        items.push({
            product_id: productId ? parseInt(productId) : null,
            description: name,
            quantity,
            unit_price
        });
    });
    
    if (!isValid) {
        Toast.fire({
            icon: 'error',
            title: errorMessage
        });
        return;
    }
    
    if (items.length === 0) {
        Toast.fire({
            icon: 'error',
            title: 'Debe agregar al menos un producto'
        });
        return;
    }
    
    const quoteType = $('#quoteType').val();
    const clientId = $('#quoteClient').val();
    
    if (!quoteType || !clientId) {
        Toast.fire({
            icon: 'error',
            title: 'Debe seleccionar tipo de cotización y cliente'
        });
        return;
    }
    
    const quoteData = {
        type: quoteType,
        client_id: parseInt(clientId),
        items: items
    };
    
    try {
        const result = await apiRequest('quotes.php', {
            method: 'POST',
            body: JSON.stringify(quoteData)
        });
        
        Toast.fire({
            icon: 'success',
            title: result.message || 'Cotización guardada correctamente'
        });
        
        $('#quoteModal').modal('hide');
        
        await loadProductsCache();
        
        if (typeof window.quotesTable !== 'undefined' && window.quotesTable && window.quotesTable.ajax) {
            window.quotesTable.ajax.reload(null, false);
        }
        
        if (typeof window.reloadPendingQuotesTable === 'function') {
            await window.reloadPendingQuotesTable();
        }
        
    } catch (error) {
        console.error('❌ Error guardando cotización:', error);
        
        const errorMsg = error.message || error.error || 'Error al guardar la cotización';
        
        Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: errorMsg,
            confirmButtonText: 'Entendido'
        });
    }
};

window.viewQuote = async function(id) {
    try {
        const result = await apiRequest(`quotes.php?id=${id}`);
        const quote = result.data;
        
        window.currentQuoteId = id;
        
        let itemsHtml = '';
        if (quote.items && quote.items.length > 0) {
            quote.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.description}</td>
                        <td>${item.quantity}</td>
                        <td>Q${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td>Q${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        const html = `
            <div class="mb-3">
                <strong>Número:</strong> ${quote.number} | 
                <strong>Tipo:</strong> <span class="badge bg-primary">${quote.type}</span> |
                <strong>Estado:</strong> <span class="badge bg-${quote.status === 'pending' ? 'warning' : 'success'}">${quote.status === 'pending' ? 'Pendiente' : 'Facturada'}</span>
            </div>
            <div class="mb-3">
                <strong>Cliente:</strong> ${quote.client_name} ${quote.client_last_name || ''}<br>
                <strong>Teléfono:</strong> ${quote.client_phone || 'N/A'}<br>
                <strong>Email:</strong> ${quote.client_email || 'N/A'}
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                        <td><strong>Q${parseFloat(quote.total).toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        $('#quoteDetails').html(html);
        $('#viewQuoteModal').modal('show');
    } catch (error) {
        console.error('Error cargando cotización:', error);
    }
};

window.deleteQuote = async function(id, skipConfirmation = false) {
    let confirmed = skipConfirmation;
    
    if (!skipConfirmation) {
        const result = await Swal.fire({
            title: '¿Eliminar cotización?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        confirmed = result.isConfirmed;
    }
    
    if (confirmed) {
        try {
            await apiRequest(`quotes.php?id=${id}`, { method: 'DELETE' });
            
            Toast.fire({
                icon: 'success',
                title: 'Cotización eliminada correctamente'
            });
            
            if (window.quotesTable && typeof window.quotesTable.ajax !== 'undefined') {
                window.quotesTable.ajax.reload(null, false);
            }
            
            if (typeof window.reloadPendingQuotesTable === 'function') {
                await window.reloadPendingQuotesTable();
            }
            
        } catch (error) {
            console.error('Error eliminando cotización:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Ocurrió un error al eliminar la cotización'
            });
        }
    }
};

// ============================================
// DESCARGAR PDF DE COTIZACIÓN NORMAL
// ============================================
window.downloadQuotePDF = async function() {
    if (!window.currentQuoteId) {
        Toast.fire({ icon: 'error', title: 'No se pudo identificar la cotización' });
        return;
    }

    try {
        Swal.fire({
            title: 'Generando PDF...',
            text: 'Por favor espera unos segundos.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch(`api/quotes.php?id=${window.currentQuoteId}`);
        const data = await response.json();

        if (!data.success) {
            Swal.fire('Error', 'No se pudo obtener la información de la cotización.', 'error');
            return;
        }

        const quote = data.data;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const logoImg = new Image();
        logoImg.src = 'assets/js/logo.png';
        await new Promise((resolve) => { logoImg.onload = resolve; });

        // Encabezado
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('SERVICIOS Y MANTENIMIENTOS TÉCNICOS ELÉCTRICOS', 95, 20, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        doc.setTextColor(91, 192, 222);
        doc.text('serymtecs@gmail.com', 95, 30, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text('Cel. 4967 - 1164', 95, 38, { align: 'center' });

        const logoWidth = 50;
        const logoHeight = 32;
        doc.addImage(logoImg, 'PNG', 150, 10, logoWidth, logoHeight);

        // Sección cliente
        doc.setFillColor(91, 192, 222);
        doc.rect(15, 48, 85, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('CLIENTE', 57, 56.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Fecha:', 110, 54);
        doc.setFont('helvetica', 'normal');
        const fecha = new Date().toLocaleDateString('es-GT', { 
            day: '2-digit', month: '2-digit', year: 'numeric' 
        });
        doc.text(fecha.replace(/\//g, ' / '), 127, 54);

        doc.setFont('helvetica', 'bold');
        doc.text('N°', 165, 54);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.number, 175, 54);

        // Datos del cliente
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.roundedRect(15, 62, 180, 35, 3, 3);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Cliente:', 20, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(`${quote.client_name} ${quote.client_last_name}`, 38, 70);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Email:', 120, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.client_email || '', 133, 70);

        doc.setFont('helvetica', 'bold');
        doc.text('Teléfono:', 20, 77);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.client_phone || '', 42, 77);

        doc.setFont('helvetica', 'bold');
        doc.text('NIT:', 20, 84);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.client_nit ? String(quote.client_nit) : '', 32, 84);

        doc.setFont('helvetica', 'bold');
        doc.text('Tipo:', 120, 84);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.type, 133, 84);

        doc.setFont('helvetica', 'bold');
        doc.text('Direccion:', 20, 91);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.client_address || quote.address || 'Sin dirección', 45, 91);

        // ✅ Título según tipo
        let tableTitle = '';
        if (quote.type === 'MA') {
            tableTitle = 'MATERIAL UTILIZADO';
        } else if (quote.type === 'MO') {
            tableTitle = 'MANO DE OBRA';
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(65, 105, 225);
        doc.text(tableTitle, 105, 107, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Tabla de productos
        const items = quote.items || [];
        const tableData = items.map(item => [
            item.quantity.toString(),
            item.description || item.product_name || '',
            item.product_code || item.code || '',
            `Q${Number(item.unit_price).toFixed(2)}`,
            `Q${Number(item.total).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 112,
            head: [['CANT.', 'DESCRIPCION', 'CODIGO', 'P/U', 'TOTAL']],
            body: tableData,
            styles: { 
                fontSize: 8, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap',
                halign: 'center', lineWidth: 0.1, lineColor: [255, 255, 255]
            },
            headStyles: { 
                fillColor: [91, 192, 222], textColor: [255, 255, 255], fontStyle: 'bold',
                halign: 'center', fontSize: 9, lineWidth: 0.1, lineColor: [255, 255, 255]
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 85, halign: 'left' },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' }
            },
            alternateRowStyles: { fillColor: [240, 248, 255] },
            margin: { left: 15, right: 15 },
            tableLineColor: [91, 192, 222],
            tableLineWidth: 0.5
        });

        const finalY = doc.lastAutoTable.finalY + 5;

        // Nota
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 0, 0);
        doc.text('Nota: Al momento de autorizar la cotización para proyecto, se solicita un 60% de la totalidad como anticipo.', 15, finalY + 5, { maxWidth: 130 });
        doc.setTextColor(0, 0, 0);

        // Línea negra
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(15, finalY + 12, 195, finalY + 12);

        // Total
        const totalAmount = items.reduce((sum, item) => sum + Number(item.total), 0);
        const totalEnLetras = window.numeroALetras(totalAmount);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(totalEnLetras, 105, finalY + 18, { align: 'center' });

        const footerType = quote.type === 'MA' ? 'MATERIALES' : 'MANO DE OBRA';
        doc.text(footerType, 160, finalY + 18);

        doc.setFontSize(16);
        doc.setTextColor(255, 0, 0);
        doc.text('TOTAL', 145, finalY + 28);
        doc.text(`Q ${totalAmount.toFixed(2)}`, 168, finalY + 28);

        doc.save(`Cotizacion_${quote.number}.pdf`);
        Swal.close();
        
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Ocurrió un problema al generar el PDF.', 'error');
    }
};

// ============================================
// FUNCIÓN CRÍTICA CORREGIDA: loadQuotesTable
// ============================================

async function initQuotesModule() {
    console.log('📋 Inicializando módulo de cotizaciones...');
    
    try {
        // ✅ Cargar productos solo una vez al inicializar
        await loadProductsCache();
        await loadClientsForQuotes();
        loadQuotesTable();
        
        console.log('✅ Módulo de cotizaciones inicializado');
    } catch (error) {
        console.error('❌ Error inicializando módulo de cotizaciones:', error);
    }
}

window.initQuotesModule = initQuotesModule;

async function loadClientsForQuotes() {
    try {
        const result = await apiRequest('clients.php');
        const select = $('#quoteClient');
        
        if (!select.length) {
            console.warn('⚠️ Select #quoteClient no encontrado');
            return;
        }
        
        select.empty().append('<option value="">Seleccionar cliente...</option>');
        
        if (result.data && Array.isArray(result.data)) {
            result.data.forEach(client => {
                const lastName = client.last_name ? ` ${client.last_name}` : '';
                select.append(`<option value="${client.id}">${client.name}${lastName}</option>`);
            });
        }
        
        console.log('✅ Clientes cargados en cotizaciones');
    } catch (error) {
        console.error('Error loading clients for quotes:', error);
    }
}

// =========================
// ✅ TABLA DE COTIZACIONES NORMALES - SIN CACHÉ
// =========================
function loadQuotesTable() {
    if (!$('#quotesTable').length) {
        console.warn('⚠️ Tabla #quotesTable no encontrada');
        return;
    }

    // Destruir tabla si existe
    if ($.fn.DataTable.isDataTable('#quotesTable')) {
        $('#quotesTable').DataTable().clear().destroy();
        console.log('🗑️ Tabla anterior destruida');
    }
    
    let url = 'quotes.php';
    if (currentQuoteFilter === 'pending') {
        url = 'quotes.php?status=pending';
    }
    
    console.log(`🔍 Inicializando tabla con URL: ${API_BASE}${url}`);
    
    window.quotesTable = $('#quotesTable').DataTable({
        ajax: {
            url: API_BASE + url,
            // ✅ CRÍTICO: Desactivar caché completamente
            cache: false,
            data: function(d) {
                // ✅ Agregar timestamp único en cada petición
                d._t = new Date().getTime();
                return d;
            },
            dataSrc: function(json) {
                if (!json.data || !Array.isArray(json.data)) {
                    console.warn('⚠️ No hay datos válidos');
                    return [];
                }
                
                if (currentQuoteFilter === 'all' || currentQuoteFilter === 'pending') {
                    return json.data;
                }
                
                const filtered = json.data.filter(q => q.type === currentQuoteFilter);
                return filtered;
            }
        },
        columns: [
            { data: 'number' },
            { 
                data: 'type',
                render: (data) => `<span class="badge bg-${data === 'MO' ? 'info' : 'primary'}">${data}</span>`
            },
            { data: 'client_name' },
            { 
                data: 'total',
                render: (data) => `Q${parseFloat(data).toFixed(2)}`
            },
            {
                data: 'status',
                render: (data) => {
                    const badge = data === 'pending' ? 'warning' : 'success';
                    const text = data === 'pending' ? 'Pendiente' : 'Facturada';
                    return `<span class="badge bg-${badge}">${text}</span>`;
                }
            },
            {
                data: 'created_at',
                render: (data) => new Date(data).toLocaleDateString('es-GT')
            },
            {
                data: null,
                render: (data) => {
                    const editDeleteButtons = data.status === 'pending' ? `
                        <button class="btn btn-sm btn-warning" onclick="editPendingQuote(${data.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteQuote(${data.id})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : '';
                    
                    return `
                        <button class="btn btn-sm btn-info" onclick="viewQuote(${data.id})" title="Ver">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${editDeleteButtons}
                    `;
                }
            }
        ],
        order: [[5, 'desc']],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        pageLength: 10,
        responsive: true,
        // ✅ NO guardar estado
        stateSave: false,
        // ✅ Destruir al reinicializar
        destroy: true
    });
    
    console.log('✅ quotesTable inicializada');
}

// =========================
// MÓDULO DE COMBOS CON COTIZACIONES - CORREGIDO
// =========================
let allProducts = [];
let comboProductCounter = 0;

// ✅ NUEVA FUNCIÓN: Recargar productos forzadamente
async function forceReloadProducts() {
    console.log('🔄 Recargando productos desde servidor...');
    try {
        const result = await apiRequest('products.php?_t=' + new Date().getTime());
        allProducts = result.data || [];
        console.log(`✅ ${allProducts.length} productos cargados`);
        return allProducts;
    } catch (error) {
        console.error('❌ Error recargando productos:', error);
        allProducts = [];
        return [];
    }
}

// ✅ HACER FUNCIÓN GLOBAL
window.forceReloadProducts = forceReloadProducts;

async function initCombosModule() {
    console.log('📦 [COMBOS] Inicializando módulo...');
    
    // ✅ Cargar productos UNA SOLA VEZ
    await loadProductsCache();
    await loadCombos();
    
    console.log('✅ [COMBOS] Módulo inicializado');
}

// ✅ HACER FUNCIÓN GLOBAL
window.initCombosModule = initCombosModule;

async function loadAllProducts() {
    await forceReloadProducts();
}

// ✅ HACER FUNCIÓN GLOBAL
window.loadAllProducts = loadAllProducts;

async function loadCombos() {
    try {
        const result = await apiRequest('combos.php?_t=' + new Date().getTime());
        const combos = result.data || [];
        
        const grid = $('#combosGrid');
        grid.empty();
        
        if (combos.length === 0) {
            grid.html(`
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> No hay combos registrados. 
                        Haz clic en "Nuevo Combo" para crear uno.
                    </div>
                </div>
            `);
            return;
        }
        
        combos.forEach(combo => {
            const card = `
                <div class="col-md-4 mb-3">
                    <div class="card h-100 hover-shadow">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title mb-0">${combo.name}</h5>
                                <span class="badge bg-primary">${combo.camera_count} cámaras</span>
                            </div>
                            <p class="text-muted mb-2">
                                <small>${combo.products ? combo.products.length : 0} productos incluidos</small>
                            </p>
                            <h4 class="text-primary mb-3">Q${parseFloat(combo.price).toFixed(2)}</h4>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary flex-fill" onclick="viewCombo(${combo.id})">
                                    <i class="bi bi-eye"></i> Ver
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="editCombo(${combo.id})">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteCombo(${combo.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            grid.append(card);
        });
    } catch (error) {
        console.error('Error cargando combos:', error);
        $('#combosGrid').html(`
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error al cargar combos
                </div>
            </div>
        `);
    }
}

// ✅ HACER FUNCIÓN GLOBAL
window.loadCombos = loadCombos;

// ============================================
// MODAL DE BÚSQUEDA DE PRODUCTOS - CORREGIDO
// ============================================

// ✅ 4. FUNCIÓN CORREGIDA: searchProductForCombo (línea ~2900 aprox)
window.searchProductForCombo = async function() {
    console.log('🔍 [SEARCH PRODUCT] Abriendo búsqueda...');
    
    // ✅ CRÍTICO: Si no hay productos, cargar UNA SOLA VEZ
    if (!allProducts || allProducts.length === 0) {
        console.log('⚠️ [SEARCH] Cache vacío, cargando productos...');
        
        Swal.fire({
            title: 'Cargando productos...',
            text: 'Un momento por favor',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        await loadProductsCache(); // ✅ Una sola llamada
        Swal.close();
        
        if (allProducts.length === 0) {
            Toast.fire({
                icon: 'error',
                title: 'No hay productos disponibles'
            });
            return;
        }
    }
    
    // Mostrar modal de búsqueda
    $('#comboProductSearchInput').val('');
    displayComboProductSearchResults('');
    $('#searchComboProductModal').modal('show');
    
    // Event listener para búsqueda
    $('#comboProductSearchInput').off('keyup').on('keyup', function() {
        displayComboProductSearchResults($(this).val());
    });
};

// ✅ 5. FUNCIÓN CORREGIDA: displayComboProductSearchResults (línea ~2950 aprox)
function displayComboProductSearchResults(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    
    // ✅ VALIDACIÓN CRÍTICA: Verificar que allProducts tenga datos
    if (!allProducts || !Array.isArray(allProducts)) {
        $('#comboProductSearchResults').html('<div class="alert alert-warning">Cargando productos...</div>');
        return;
    }
    
    if (allProducts.length === 0) {
        $('#comboProductSearchResults').html('<div class="alert alert-info">No hay productos registrados en el sistema</div>');
        return;
    }
    
    let results = allProducts;
    if (searchTerm) {
        results = allProducts.filter(p => 
            (p.name && p.name.toLowerCase().includes(searchTerm)) || 
            (p.code && p.code.toLowerCase().includes(searchTerm))
        );
    }
    
    let html = '';
    if (results.length === 0) {
        html = '<div class="alert alert-info">No se encontraron productos con ese criterio de búsqueda</div>';
    } else {
        results.forEach(product => {
            const stockBadge = product.stock > 0 
                ? `<span class="badge bg-success">Stock: ${product.stock}</span>`
                : `<span class="badge bg-danger">Sin stock</span>`;
            
            html += `
                <div class="card mb-2" style="cursor: pointer;" onclick="selectComboProductFromSearch(${product.id})">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${product.name}</strong><br>
                                <small class="text-muted">Código: ${product.code}</small>
                            </div>
                            <div class="text-end">
                                ${stockBadge}<br>
                                <strong>Q${parseFloat(product.sale_price).toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    $('#comboProductSearchResults').html(html);
}

window.selectComboProductFromSearch = function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    $('#searchComboProductModal').modal('hide');
    fillOrCreateComboProductWithProduct(product);
};

// ============================================
// FUNCIONES PARA AGREGAR/EDITAR PRODUCTOS
// ============================================

// ✅ 3. FUNCIÓN CORREGIDA: openComboModal (línea ~2850 aprox)
window.openComboModal = async function() {
    console.log('📦 [COMBO MODAL] Abriendo modal...');
    
    // ✅ CRÍTICO: Verificar si ya hay productos en cache ANTES de cargar
    if (!allProducts || allProducts.length === 0) {
        console.log('⚠️ [COMBO MODAL] Cache vacío, cargando productos...');
        
        Swal.fire({
            title: 'Preparando formulario...',
            text: 'Cargando productos disponibles',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        await loadProductsCache(); // ✅ Una sola llamada
        Swal.close();
        
        if (allProducts.length === 0) {
            Toast.fire({
                icon: 'error',
                title: 'No hay productos disponibles en el sistema'
            });
            return;
        }
    }
    
    // Resetear formulario
    $('#comboForm')[0].reset();
    $('#comboId').val('');
    $('#comboModalLabel').text('Nuevo Combo');
    $('#comboProducts').empty();
    $('#comboTotalPrice').text('Q 0.00');
    comboProductCounter = 0;
    
    $('#comboModal').modal('show');
};

window.addComboProductEmpty = function() {
    addComboProductWithProduct(null);
};

function addComboProductWithProduct(product) {
    comboProductCounter++;
    
    const code = product ? product.code : '';
    const name = product ? product.name : '';
    const price = product ? product.sale_price : '';
    const stock = product ? product.stock : 0;
    const productId = product ? product.id : '';
    
    const row = `
        <tr class="combo-product-item" data-index="${comboProductCounter}">
            <td class="text-center item-number">${String(comboProductCounter).padStart(3, '0')}</td>
            <td>
                <input type="text" class="form-control form-control-sm item-code" value="${code}" readonly style="background-color: #f8f9fa;">
                <input type="hidden" class="item-product-id" value="${productId}">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm item-name" value="${name}" ${product ? 'readonly style="background-color: #f8f9fa;"' : 'placeholder="Descripción manual"'}>
            </td>
            <td>
                <input type="number" step="0.01" class="form-control form-control-sm item-price" value="${price}" ${product ? '' : 'readonly style="background-color: #f8f9fa;"'} placeholder="0.00" onchange="calculateComboItemTotal(${comboProductCounter})">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm item-quantity" value="1" min="1" max="${stock || 999999}" onchange="calculateComboItemTotal(${comboProductCounter})">
                ${stock > 0 ? `<small class="text-muted">Disponible: ${stock}</small>` : ''}
            </td>
            <td>
                <input type="text" class="form-control form-control-sm item-total" readonly value="Q ${product ? parseFloat(price).toFixed(2) : '0.00'}" style="background-color: #f8f9fa;">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeComboProduct(${comboProductCounter})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;
    
    $('#comboProducts').append(row);
    calculateComboTotal();
}

function fillOrCreateComboProductWithProduct(product) {
    let emptyRow = null;
    
    $('#comboProducts .combo-product-item').each(function() {
        const productId = $(this).find('.item-product-id').val();
        const name = $(this).find('.item-name').val().trim();
        
        if (!productId && !name) {
            emptyRow = $(this);
            return false;
        }
    });
    
    if (emptyRow) {
        const index = emptyRow.data('index');
        emptyRow.find('.item-code').val(product.code);
        emptyRow.find('.item-product-id').val(product.id);
        emptyRow.find('.item-name').val(product.name).prop('readonly', true).css('background-color', '#f8f9fa');
        emptyRow.find('.item-price').val(product.sale_price).prop('readonly', false).css('background-color', '');
        emptyRow.find('.item-quantity').attr('max', product.stock || 999999);
        
        if (product.stock > 0) {
            emptyRow.find('td:eq(4)').append(`<br><small class="text-muted">Disponible: ${product.stock}</small>`);
        }
        
        calculateComboItemTotal(index);
    } else {
        addComboProductWithProduct(product);
    }
}

window.removeComboProduct = function(index) {
    $(`.combo-product-item[data-index="${index}"]`).remove();
    renumberComboProducts();
    calculateComboTotal();
};

function renumberComboProducts() {
    $('#comboProducts .combo-product-item').each(function(index) {
        $(this).find('.item-number').text(String(index + 1).padStart(3, '0'));
    });
}

window.calculateComboItemTotal = function(index) {
    const item = $(`.combo-product-item[data-index="${index}"]`);
    const quantity = parseFloat(item.find('.item-quantity').val()) || 0;
    const price = parseFloat(item.find('.item-price').val()) || 0;
    const total = quantity * price;
    
    item.find('.item-total').val(`Q ${total.toFixed(2)}`);
    calculateComboTotal();
};

function calculateComboTotal() {
    let total = 0;
    $('#comboProducts .combo-product-item').each(function() {
        const quantity = parseFloat($(this).find('.item-quantity').val()) || 0;
        const price = parseFloat($(this).find('.item-price').val()) || 0;
        total += quantity * price;
    });
    
    $('#comboTotalPrice').text(`Q ${total.toFixed(2)}`);
}

window.saveCombo = async function() {
    // ✅ CRÍTICO: Prevenir que el evento se propague y cierre el modal
    event.preventDefault();
    event.stopPropagation();
    
    const form = $('#comboForm')[0];
    if (!form.checkValidity()) {
        form.reportValidity();
        return false; // ✅ Importante: return false
    }
    
    let totalPrice = 0;
    $('#comboProducts .combo-product-item').each(function() {
        const quantity = parseFloat($(this).find('.item-quantity').val()) || 0;
        const price = parseFloat($(this).find('.item-price').val()) || 0;
        totalPrice += quantity * price;
    });
    
    const comboData = {
        id: $('#comboId').val() || null,
        name: $('#comboName').val(),
        camera_count: parseInt($('#cameraCount').val()),
        price: totalPrice,
        products: []
    };
    
    $('#comboProducts .combo-product-item').each(function() {
        const productId = $(this).find('.item-product-id').val();
        const quantity = parseInt($(this).find('.item-quantity').val());
        
        if (productId && quantity) {
            comboData.products.push({
                product_id: parseInt(productId),
                quantity: quantity
            });
        }
    });
    
    if (comboData.products.length === 0) {
        Toast.fire({
            icon: 'error',
            title: 'Debe agregar al menos un producto al combo'
        });
        return false; // ✅ Importante: return false
    }
    
    console.log('📤 Enviando combo:', comboData);
    
    try {
        const method = comboData.id ? 'PUT' : 'POST';
        const endpoint = 'combos.php';
        
        const result = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(comboData)
        });
        
        console.log('✅ Respuesta del servidor:', result);
        
        Toast.fire({
            icon: 'success',
            title: result.message || 'Combo guardado correctamente'
        });
        
        // ✅ Cerrar modal correctamente
        $('#comboModal').modal('hide');
        
        // ✅ Recargar productos y combos
        await loadProductsCache();
        await loadCombos();
        
        return false; // ✅ Importante: return false
    } catch (error) {
        console.error('❌ Error guardando combo:', error);
        
        let errorMsg = 'Error al guardar el combo';
        if (error.errors && Array.isArray(error.errors)) {
            errorMsg = error.errors.join(', ');
        } else if (error.error) {
            errorMsg = error.error;
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: errorMsg,
            confirmButtonText: 'Entendido'
        });
        
        return false; // ✅ Importante: return false
    }
};

// =========================
// COMPATIBILIDAD CON SISTEMA DE TABS
// =========================
// Las funciones init deben estar disponibles tanto global como localmente
// para que funcionen con el sistema moduleInitializers.init()

// ✅ 6. FUNCIÓN CORREGIDA: editCombo (línea ~3100 aprox)
window.editCombo = async function(id) {
    try {
        console.log(`✏️ [EDIT COMBO] Editando combo ${id}...`);
        
        // ✅ CRÍTICO: Cargar productos si no existen (UNA SOLA VEZ)
        if (!allProducts || allProducts.length === 0) {
            console.log('⚠️ [EDIT COMBO] Cache vacío, cargando productos...');
            
            Swal.fire({
                title: 'Cargando combo...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            await loadProductsCache(); // ✅ Una sola llamada
        }
        
        const result = await apiRequest(`combos.php?id=${id}`);
        const combo = result.data;
        
        Swal.close();
        
        if (!combo) {
            Toast.fire({ icon: 'error', title: 'Combo no encontrado' });
            return;
        }
        
        $('#comboId').val(combo.id);
        $('#comboName').val(combo.name);
        $('#cameraCount').val(combo.camera_count);
        $('#comboModalLabel').text('Editar Combo');
        
        $('#comboProducts').empty();
        $('#comboTotalPrice').text('Q 0.00');
        comboProductCounter = 0;
        
        if (combo.products && combo.products.length > 0) {
            combo.products.forEach(product => {
                const productData = allProducts.find(p => p.id === product.product_id);
                if (productData) {
                    comboProductCounter++;
                    
                    const row = `
                        <tr class="combo-product-item" data-index="${comboProductCounter}">
                            <td class="text-center item-number">${String(comboProductCounter).padStart(3, '0')}</td>
                            <td>
                                <input type="text" class="form-control form-control-sm item-code" value="${productData.code}" readonly style="background-color: #f8f9fa;">
                                <input type="hidden" class="item-product-id" value="${productData.id}">
                            </td>
                            <td>
                                <input type="text" class="form-control form-control-sm item-name" value="${productData.name}" readonly style="background-color: #f8f9fa;">
                            </td>
                            <td>
                                <input type="number" step="0.01" class="form-control form-control-sm item-price" value="${productData.sale_price}" onchange="calculateComboItemTotal(${comboProductCounter})">
                            </td>
                            <td>
                                <input type="number" class="form-control form-control-sm item-quantity" value="${product.quantity}" min="1" max="${productData.stock || 999999}" onchange="calculateComboItemTotal(${comboProductCounter})">
                                ${productData.stock > 0 ? `<small class="text-muted">Disponible: ${productData.stock}</small>` : ''}
                            </td>
                            <td>
                                <input type="text" class="form-control form-control-sm item-total" readonly value="Q ${(productData.sale_price * product.quantity).toFixed(2)}" style="background-color: #f8f9fa;">
                            </td>
                            <td class="text-center">
                                <button type="button" class="btn btn-sm btn-danger" onclick="removeComboProduct(${comboProductCounter})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    
                    $('#comboProducts').append(row);
                }
            });
        }
        
        calculateComboTotal();
        $('#comboModal').modal('show');
    } catch (error) {
        console.error('❌ Error cargando combo:', error);
        Swal.close();
        Toast.fire({
            icon: 'error',
            title: 'Error al cargar el combo'
        });
    }
};

window.viewCombo = async function(id) {
    try {
        const result = await apiRequest(`combos.php?id=${id}`);
        const combo = result.data;
        
        let productsHtml = '';
        if (combo.products && combo.products.length > 0) {
            productsHtml = combo.products.map(p => `
                <tr>
                    <td>${p.product_name}</td>
                    <td>${p.product_code}</td>
                    <td class="text-center">${p.quantity}</td>
                    <td class="text-end">Q${parseFloat(p.sale_price || 0).toFixed(2)}</td>
                </tr>
            `).join('');
        } else {
            productsHtml = '<tr><td colspan="4" class="text-center text-muted">No hay productos</td></tr>';
        }
        
        const html = `
            <div class="mb-3">
                <h5>${combo.name}</h5>
                <p class="text-muted mb-1">
                    <i class="bi bi-camera"></i> ${combo.camera_count} cámaras
                </p>
                <h4 class="text-primary">Q${parseFloat(combo.price).toFixed(2)}</h4>
            </div>
            
            <h6 class="mb-3">Productos Incluidos:</h6>
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th class="text-center">Cantidad</th>
                        <th class="text-end">Precio Unit.</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsHtml}
                </tbody>
            </table>
        `;
        
        $('#comboDetails').html(html);
        $('#viewComboModal').modal('show');
    } catch (error) {
        console.error('Error cargando detalle:', error);
        Toast.fire({
            icon: 'error',
            title: 'Error al cargar el detalle'
        });
    }
};

window.deleteCombo = async function(id) {
    try {
        console.log(`🗑️ [DELETE COMBO] Iniciando eliminación del combo ${id}`);
        
        const comboResult = await apiRequest(`combos.php?id=${id}`);
        const combo = comboResult.data;
        
        console.log('📦 Combo a eliminar:', combo);
        
        const quotesResponse = await apiRequest('combo_quotes.php');
        const allQuotes = quotesResponse.data || [];
        
        console.log('📋 Total de cotizaciones de combos:', allQuotes.length);
        
        const comboQuotes = allQuotes.filter(q => parseInt(q.combo_id) === parseInt(id));
        console.log(`📋 Cotizaciones del combo ${id}:`, comboQuotes);
        
        const pendingQuotes = comboQuotes.filter(q => q.status === 'pending');
        const invoicedQuotes = comboQuotes.filter(q => q.status === 'invoiced');
        
        console.log(`⏳ Cotizaciones pendientes: ${pendingQuotes.length}`);
        console.log(`✅ Cotizaciones facturadas: ${invoicedQuotes.length}`);
        
        if (pendingQuotes.length > 0) {
            const quotesList = pendingQuotes.map(q => q.number).join(', ');
            
            console.log('❌ No se puede eliminar: hay cotizaciones pendientes');
            
            await Swal.fire({
                icon: 'warning',
                title: 'No se puede eliminar el combo',
                html: `
                    <p>Este combo tiene <strong>${pendingQuotes.length}</strong> cotización(es) pendiente(s):</p>
                    <div class="alert alert-warning mt-3">
                        <strong>${quotesList}</strong>
                    </div>
                    <p class="text-muted mt-3">
                        <i class="bi bi-info-circle"></i> 
                        Debes <strong>eliminar o facturar</strong> estas cotizaciones primero.
                    </p>
                `,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#6c757d'
            });
            return;
        }
        
        let warningMsg = '<p>Esta acción no se puede deshacer.</p>';
        
        if (invoicedQuotes.length > 0) {
            warningMsg += `
                <div class="alert alert-info mt-3">
                    <i class="bi bi-info-circle"></i> 
                    <strong>Nota:</strong> Este combo tiene ${invoicedQuotes.length} cotización(es) facturada(s) (históricas).
                    <br>Se eliminará el combo pero las cotizaciones facturadas permanecerán en el sistema.
                </div>
            `;
        }
        
        const result = await Swal.fire({
            title: '¿Eliminar combo?',
            html: warningMsg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: '<i class="bi bi-trash"></i> Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        
        if (!result.isConfirmed) {
            console.log('❌ Eliminación cancelada por el usuario');
            return;
        }
        
        console.log('🔄 Enviando petición DELETE...');
        
        await apiRequest(`combos.php?id=${id}`, {
            method: 'DELETE'
        });
        
        console.log('✅ Combo eliminado exitosamente');
        
        Toast.fire({
            icon: 'success',
            title: 'Combo eliminado correctamente'
        });
        
        await loadCombos();
        
    } catch (error) {
        console.error('❌ Error eliminando combo:', error);
        
        let errorMsg = 'Error al eliminar el combo';
        
        if (error.message) {
            if (error.message.includes('cotizaciones pendientes')) {
                errorMsg = error.message;
            } else if (error.message.includes('FOREIGN KEY') || 
                       error.message.includes('Foreign key') ||
                       error.message.includes('Integrity constraint')) {
                errorMsg = 'No se puede eliminar el combo porque tiene cotizaciones asociadas. Elimina primero las cotizaciones pendientes desde el panel "Cotizaciones de Combos".';
            } else {
                errorMsg = error.message;
            }
        } else if (error.error) {
            errorMsg = error.error;
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Error al eliminar',
            html: `
                <p>${errorMsg}</p>
                <div class="mt-3 text-start">
                    <small class="text-muted">
                        <strong>Sugerencia:</strong><br>
                        1. Ve a "Cotizaciones de Combos"<br>
                        2. Elimina las cotizaciones pendientes del combo<br>
                        3. Intenta eliminar el combo nuevamente
                    </small>
                </div>
            `,
            confirmButtonText: 'Entendido'
        });
    }
};

// =========================
// MÓDULO DE COTIZACIONES DE COMBOS - CORREGIDO
// =========================
let selectedComboForQuote = null;
let comboQuoteProductCounter = 0;

window.initComboQuotesModule = async function() {
    console.log('📋 Inicializando módulo de cotizaciones de combos...');
    await loadProductsCache();
    await loadClientsForComboQuotes();
    loadComboQuotesTable();
    console.log('✅ Módulo de cotizaciones de combos inicializado');
};

/*async function loadProductsCache() {
    // ✅ Usar la función mejorada de recarga
    if (typeof forceReloadProducts === 'function') {
        await forceReloadProducts();
    } else {
        // Fallback si no existe la función
        try {
            const result = await apiRequest('products.php?_t=' + new Date().getTime());
            allProducts = result.data || [];
        } catch (error) {
            console.error('Error loading products:', error);
            allProducts = [];
        }
    }
}*/

async function loadClientsForComboQuotes() {
    try {
        const result = await apiRequest('clients.php?_t=' + new Date().getTime());
        const select = $('#comboQuoteClient');
        
        if (!select.length) {
            console.warn('⚠️ Select #comboQuoteClient no encontrado');
            return;
        }
        
        select.empty().append('<option value="">Seleccionar cliente...</option>');
        
        if (result.data && Array.isArray(result.data)) {
            result.data.forEach(client => {
                const lastName = client.last_name ? ` ${client.last_name}` : '';
                select.append(`<option value="${client.id}">${client.name}${lastName}</option>`);
            });
        }
        
        console.log('✅ Clientes cargados para cotizaciones de combos');
    } catch (error) {
        console.error('Error loading clients for combo quotes:', error);
    }
}

// =========================
// TABLA DE COTIZACIONES DE COMBOS - SIN CACHÉ
// =========================
function loadComboQuotesTable() {
    if (!$('#comboQuotesTable').length) {
        console.warn('⚠️ Tabla #comboQuotesTable no encontrada');
        return;
    }

    if ($.fn.DataTable.isDataTable('#comboQuotesTable')) {
        $('#comboQuotesTable').DataTable().clear().destroy();
        console.log('🗑️ Tabla anterior destruida');
    }
    
    console.log('🔄 Inicializando tabla de combo quotes...');
    
    window.comboQuotesTable = $('#comboQuotesTable').DataTable({
        ajax: {
            url: API_BASE + 'combo_quotes.php',
            cache: false,
            data: function(d) {
                d._t = new Date().getTime();
                return d;
            },
            dataSrc: 'data'
        },
        columns: [
            { data: 'number' },
            { data: 'combo_name' },
            { data: 'client_name' },
            { 
                data: 'total',
                render: (data) => `Q${parseFloat(data).toFixed(2)}`
            },
            {
                data: 'status',
                render: (data) => {
                    const badge = data === 'pending' ? 'warning' : 'success';
                    const text = data === 'pending' ? 'Pendiente' : 'Facturada';
                    return `<span class="badge bg-${badge}">${text}</span>`;
                }
            },
            {
                data: 'created_at',
                render: (data) => new Date(data).toLocaleDateString('es-GT')
            },
            {
                data: null,
                render: (data) => `
                    <button class="btn btn-sm btn-info" onclick="viewComboQuote(${data.id})" title="Ver">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="downloadComboQuotePDF(${data.id})" title="Descargar PDF">
                        <i class="bi bi-file-pdf"></i>
                    </button>
                    ${data.status === 'pending' ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteComboQuote(${data.id})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                `
            }
        ],
        order: [[5, 'desc']],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        pageLength: 10,
        responsive: true,
        stateSave: false,
        destroy: true
    });
    
    console.log('✅ comboQuotesTable inicializada');
}

// ============================================
// SELECCIONAR COMBO PARA COTIZAR - CORREGIDO
// ============================================

window.openSelectComboModal = async function() {
    try {
        // ✅ CRÍTICO: Obtener datos frescos del servidor
        console.log('🔄 Cargando combos disponibles...');
        
        Swal.fire({
            title: 'Cargando combos...',
            text: 'Un momento por favor',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const result = await apiRequest('combos.php?_t=' + new Date().getTime());
        const combos = result.data || [];
        
        Swal.close();
        
        if (combos.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No hay combos disponibles',
                text: 'Debe crear al menos un combo antes de generar una cotización',
                confirmButtonText: 'Entendido'
            });
            return;
        }
        
        let combosHtml = '';
        combos.forEach(combo => {
            combosHtml += `
                <div class="col-md-6 mb-3">
                    <div class="card hover-shadow" style="cursor: pointer;" onclick="selectComboForQuote(${combo.id})">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="card-title mb-1">${combo.name}</h5>
                                    <p class="text-muted mb-1">
                                        <i class="bi bi-camera"></i> ${combo.camera_count} cámaras
                                    </p>
                                    <p class="text-muted mb-0">
                                        <small>${combo.products ? combo.products.length : 0} productos</small>
                                    </p>
                                </div>
                                <div class="text-end">
                                    <h4 class="text-primary mb-0">Q${parseFloat(combo.price).toFixed(2)}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        $('#selectComboGrid').html(combosHtml);
        $('#selectComboModal').modal('show');
        
    } catch (error) {
        console.error('Error cargando combos:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los combos disponibles'
        });
    }
};

window.selectComboForQuote = async function(comboId) {
    try {
        console.log(`🎯 Seleccionando combo ${comboId} para cotizar...`);
        
        // ✅ CRÍTICO: Mostrar loading mientras se cargan los datos
        Swal.fire({
            title: 'Cargando combo...',
            text: 'Preparando cotización',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        // ✅ Recargar productos primero
        await loadProductsCache();
        
        // ✅ Obtener datos del combo con productos
        const result = await apiRequest(`combos.php?id=${comboId}&_t=` + new Date().getTime());
        const combo = result.data;
        
        console.log('📦 Combo cargado:', combo);
        console.log('📦 Productos del combo:', combo.products);
        
        // ✅ Validar que el combo tenga productos
        if (!combo.products || combo.products.length === 0) {
            Swal.close();
            Swal.fire({
                icon: 'warning',
                title: 'Combo sin productos',
                text: 'Este combo no tiene productos configurados. Por favor, edita el combo y agrega productos.',
                confirmButtonText: 'Entendido'
            });
            return;
        }
        
        selectedComboForQuote = combo;
        
        // ✅ Cerrar modal de selección
        $('#selectComboModal').modal('hide');
        
        Swal.close();
        
        // ✅ Esperar a que el modal se cierre completamente
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ✅ Abrir modal de cotización con los datos del combo
        await openComboQuoteModal(combo);
        
    } catch (error) {
        console.error('❌ Error cargando combo:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el combo seleccionado: ' + (error.message || error.error || 'Error desconocido')
        });
    }
};

async function openComboQuoteModal(combo) {
    console.log('📝 Abriendo modal de cotización para:', combo.name);
    
    $('#comboQuoteForm')[0].reset();
    $('#comboQuoteId').val('');
    $('#comboQuoteComboId').val(combo.id);
    $('#comboQuoteComboName').text(combo.name);
    $('#comboQuoteCameraCount').text(combo.camera_count);
    $('#comboQuoteProducts').empty();
    comboQuoteProductCounter = 0;
    
    // ✅ Validar que haya productos
    if (!combo.products || combo.products.length === 0) {
        console.error('❌ Combo sin productos');
        Toast.fire({
            icon: 'error',
            title: 'El combo no tiene productos configurados'
        });
        return;
    }
    
    // ✅ Agregar productos del combo con precios editables
    let productsAdded = 0;
    
    for (const product of combo.products) {
        const productData = allProducts.find(p => p.id === product.product_id);
        
        if (!productData) {
            console.warn(`⚠️ Producto ${product.product_id} no encontrado en allProducts`);
            continue;
        }
        
        comboQuoteProductCounter++;
        productsAdded++;
        
        console.log(`➕ Agregando producto: ${productData.name} (${product.quantity} unidades)`);
        
        const row = `
            <tr class="combo-quote-item" data-index="${comboQuoteProductCounter}">
                <td class="text-center item-number">${String(comboQuoteProductCounter).padStart(3, '0')}</td>
                <td>
                    <input type="text" class="form-control form-control-sm item-code" value="${productData.code}" readonly style="background-color: #f8f9fa;">
                    <input type="hidden" class="item-product-id" value="${productData.id}">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm item-name" value="${productData.name}" readonly style="background-color: #f8f9fa;">
                </td>
                <td>
                    <input type="number" step="0.01" class="form-control form-control-sm item-price" value="${productData.sale_price}" onchange="calculateComboQuoteItemTotal(${comboQuoteProductCounter})">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm item-quantity" value="${product.quantity}" min="1" max="${productData.stock || 999999}" onchange="calculateComboQuoteItemTotal(${comboQuoteProductCounter})">
                    ${productData.stock > 0 ? `<small class="text-muted">Disponible: ${productData.stock}</small>` : ''}
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm item-total" readonly value="Q ${(productData.sale_price * product.quantity).toFixed(2)}" style="background-color: #f8f9fa;">
                </td>
            </tr>
        `;
        
        $('#comboQuoteProducts').append(row);
    }
    
    console.log(`✅ ${productsAdded} productos agregados al modal`);
    
    if (productsAdded === 0) {
        Toast.fire({
            icon: 'error',
            title: 'No se pudieron cargar los productos del combo'
        });
        return;
    }
    
    calculateComboQuoteTotal();
    
    // ✅ Mostrar el modal
    $('#comboQuoteModal').modal('show');
    
    console.log('✅ Modal de cotización abierto correctamente');
}

window.calculateComboQuoteItemTotal = function(index) {
    const item = $(`.combo-quote-item[data-index="${index}"]`);
    const quantity = parseFloat(item.find('.item-quantity').val()) || 0;
    const price = parseFloat(item.find('.item-price').val()) || 0;
    const total = quantity * price;
    
    item.find('.item-total').val(`Q ${total.toFixed(2)}`);
    calculateComboQuoteTotal();
};

function calculateComboQuoteTotal() {
    let total = 0;
    $('#comboQuoteProducts .combo-quote-item').each(function() {
        const quantity = parseFloat($(this).find('.item-quantity').val()) || 0;
        const price = parseFloat($(this).find('.item-price').val()) || 0;
        total += quantity * price;
    });
    
    $('#comboQuoteTotal').text(`Q ${total.toFixed(2)}`);
}

// ============================================
// GUARDAR COTIZACIÓN DE COMBO - CON RECARGA DE DASHBOARD
// ============================================

window.saveComboQuote = async function() {
    const form = $('#comboQuoteForm')[0];
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const items = [];
    let isValid = true;
    let errorMessage = '';
    
    $('#comboQuoteProducts .combo-quote-item').each(function() {
        const productId = $(this).find('.item-product-id').val();
        const name = $(this).find('.item-name').val().trim();
        const quantity = parseInt($(this).find('.item-quantity').val());
        const unit_price = parseFloat($(this).find('.item-price').val());
        
        if (!name) {
            errorMessage = 'Todos los productos deben tener un nombre';
            isValid = false;
            return false;
        }
        
        if (!quantity || quantity <= 0 || !unit_price || unit_price <= 0) {
            errorMessage = 'Todos los items deben tener cantidad y precio válidos';
            isValid = false;
            return false;
        }
        
        items.push({
            product_id: productId ? parseInt(productId) : null,
            description: name,
            quantity,
            unit_price
        });
    });
    
    if (!isValid) {
        Toast.fire({
            icon: 'error',
            title: errorMessage
        });
        return;
    }
    
    if (items.length === 0) {
        Toast.fire({
            icon: 'error',
            title: 'Debe tener al menos un producto'
        });
        return;
    }
    
    const clientId = $('#comboQuoteClient').val();
    
    if (!clientId) {
        Toast.fire({
            icon: 'error',
            title: 'Debe seleccionar un cliente'
        });
        return;
    }
    
    const quoteData = {
        combo_id: parseInt($('#comboQuoteComboId').val()),
        client_id: parseInt(clientId),
        items: items
    };
    
    console.log('📤 Guardando cotización de combo:', quoteData);
    
    try {
        const result = await apiRequest('combo_quotes.php', {
            method: 'POST',
            body: JSON.stringify(quoteData)
        });
        
        console.log('✅ Cotización guardada:', result);
        
        Toast.fire({
            icon: 'success',
            title: result.message || 'Cotización de combo creada exitosamente'
        });
        
        $('#comboQuoteModal').modal('hide');
        
        // ✅ Recargar tabla de cotizaciones de combos
        if (typeof window.comboQuotesTable !== 'undefined' && window.comboQuotesTable && window.comboQuotesTable.ajax) {
            console.log('🔄 Recargando tabla de cotizaciones de combos...');
            window.comboQuotesTable.ajax.reload(null, false);
        }
        
        // ✅ Recargar tabla de cotizaciones pendientes
        if (typeof window.reloadPendingQuotesTable === 'function') {
            await window.reloadPendingQuotesTable();
        }
        
        // ✅ Recargar vista de combos
        if (typeof loadCombos === 'function') {
            await loadCombos();
        }
        
        // ✅✅ NUEVO: Recargar estadísticas del dashboard
        if (typeof window.reloadDashboardStats === 'function') {
            await window.reloadDashboardStats();
            console.log('📊 Estadísticas del dashboard actualizadas');
        } else if (typeof window.loadDashboardStats === 'function') {
            await window.loadDashboardStats();
            console.log('📊 Estadísticas del dashboard actualizadas');
        }
        
    } catch (error) {
        console.error('❌ Error guardando cotización:', error);
        
        const errorMsg = error.message || error.error || 'Error al guardar la cotización';
        
        Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: errorMsg,
            confirmButtonText: 'Entendido'
        });
    }
};

// ============================================
// RECARGAR TABLA DE COTIZACIONES DE COMBOS
// ============================================
window.forceReloadComboQuotesTable = async function() {
    console.log('🔄 [FORCE RELOAD] Iniciando recarga forzada de combo quotes...');
    
    try {
        if (window.comboQuotesTable && 
            typeof window.comboQuotesTable.ajax !== 'undefined' && 
            typeof window.comboQuotesTable.ajax.reload === 'function') {
            
            console.log('🔄 Recargando con ajax.reload()...');
            
            return new Promise((resolve) => {
                window.comboQuotesTable.ajax.reload(function(json) {
                    console.log('✅ Tabla recargada. Datos:', json);
                    resolve(true);
                }, true);
            });
        }
        
        console.log('🔄 Reinicializando tabla desde cero...');
        
        if ($.fn.DataTable.isDataTable('#comboQuotesTable')) {
            $('#comboQuotesTable').DataTable().destroy();
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (typeof loadComboQuotesTable === 'function') {
            loadComboQuotesTable();
            console.log('✅ Tabla reinicializada');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error recargando tabla:', error);
        return false;
    }
};

// ============================================
// VER COTIZACIÓN DE COMBO
// ============================================

window.viewComboQuote = async function(id) {
    try {
        const result = await apiRequest(`combo_quotes.php?id=${id}`);
        const quote = result.data;
        
        window.currentComboQuoteId = id;
        
        let itemsHtml = '';
        if (quote.items && quote.items.length > 0) {
            quote.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">Q${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td class="text-end">Q${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        const html = `
            <div class="mb-3">
                <div class="row">
                    <div class="col-md-6">
                        <strong>Número:</strong> ${quote.number}<br>
                        <strong>Combo:</strong> ${quote.combo_name} 
                        <span class="badge bg-primary">${quote.camera_count} cámaras</span>
                    </div>
                    <div class="col-md-6 text-end">
                        <strong>Estado:</strong> 
                        <span class="badge bg-${quote.status === 'pending' ? 'warning' : 'success'}">
                            ${quote.status === 'pending' ? 'Pendiente' : 'Facturada'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <strong>Cliente:</strong> ${quote.client_name} ${quote.client_last_name || ''}<br>
                <strong>Teléfono:</strong> ${quote.client_phone || 'N/A'}<br>
                <strong>Email:</strong> ${quote.client_email || 'N/A'}
            </div>
            
            <h6>Productos del Combo:</h6>
            <table class="table table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>Descripción</th>
                        <th class="text-center" width="100">Cantidad</th>
                        <th class="text-end" width="120">Precio Unit.</th>
                        <th class="text-end" width="120">Total</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                    <tr class="table-primary">
                        <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                        <td class="text-end"><h5 class="mb-0">Q${parseFloat(quote.total).toFixed(2)}</h5></td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        $('#viewComboQuoteDetails').html(html);
        $('#viewComboQuoteModal').modal('show');
    } catch (error) {
        console.error('Error cargando cotización:', error);
        Toast.fire({
            icon: 'error',
            title: 'Error al cargar la cotización'
        });
    }
};

// ============================================
// ELIMINAR COTIZACIÓN DE COMBO - CON RECARGA DE DASHBOARD
// ============================================

window.deleteComboQuote = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar cotización?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        try {
            await apiRequest(`combo_quotes.php?id=${id}`, { method: 'DELETE' });
            
            Toast.fire({
                icon: 'success',
                title: 'Cotización eliminada correctamente'
            });
            
            if (window.comboQuotesTable && typeof window.comboQuotesTable.ajax !== 'undefined') {
                window.comboQuotesTable.ajax.reload(null, false);
                console.log('✅ Tabla de cotizaciones de combos recargada');
            }
            
            if (typeof window.reloadPendingQuotesTable === 'function') {
                await window.reloadPendingQuotesTable();
                console.log('✅ Tabla de cotizaciones pendientes recargada');
            }
            
            if (typeof loadCombos === 'function') {
                await loadCombos();
                console.log('✅ Vista de combos recargada');
            }
            
            // ✅✅ NUEVO: Recargar estadísticas del dashboard
            if (typeof window.reloadDashboardStats === 'function') {
                await window.reloadDashboardStats();
                console.log('📊 Estadísticas del dashboard actualizadas');
            } else if (typeof window.loadDashboardStats === 'function') {
                await window.loadDashboardStats();
                console.log('📊 Estadísticas del dashboard actualizadas');
            }
            
        } catch (error) {
            console.error('Error eliminando cotización:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Ocurrió un error al eliminar la cotización'
            });
        }
    }
};

// ============================================
// DESCARGAR PDF DE COMBO
// ============================================
window.downloadComboQuotePDF = async function(quoteId) {
    if (!quoteId) {
        Swal.fire('Error', 'No se encontró el ID de la cotización.', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'Generando PDF...',
            text: 'Por favor espera unos segundos.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch(`${API_BASE}combo_quotes.php?id=${quoteId}`);
        const data = await response.json();

        if (!data.success) {
            Swal.fire('Error', 'No se pudo obtener la información de la cotización.', 'error');
            return;
        }

        const quote = data.data;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const logoImg = new Image();
        logoImg.src = 'assets/js/logo.png';
        await new Promise((resolve) => { logoImg.onload = resolve; });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('SERVICIOS Y MANTENIMIENTOS TÉCNICOS ELÉCTRICOS', 95, 20, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        doc.setTextColor(91, 192, 222);
        doc.text('serymtecs@gmail.com', 95, 30, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text('Cel. 4967 - 1164', 95, 38, { align: 'center' });

        const logoWidth = 50;
        const logoHeight = 32;
        doc.addImage(logoImg, 'PNG', 150, 10, logoWidth, logoHeight);

        doc.setFillColor(91, 192, 222);
        doc.rect(15, 48, 85, 12, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('CLIENTE', 57, 56.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Fecha:', 110, 54);
        doc.setFont('helvetica', 'normal');
        const fecha = new Date().toLocaleDateString('es-GT', { 
            day: '2-digit', month: '2-digit', year: 'numeric' 
        });
        doc.text(fecha.replace(/\//g, ' / '), 127, 54);

        doc.setFont('helvetica', 'bold');
        doc.text('N°', 165, 54);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.number, 175, 54);

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.roundedRect(15, 62, 180, 35, 3, 3);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Cliente:', 20, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(`${quote.client_name} ${quote.client_last_name || ''}`, 38, 70);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Email:', 120, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.client_email || '', 133, 70);

        doc.setFont('helvetica', 'bold');
        doc.text('Teléfono:', 20, 77);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.client_phone || '', 42, 77);

        doc.setFont('helvetica', 'bold');
        doc.text('NIT:', 20, 84);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.client_nit ? String(quote.client_nit) : '', 32, 84);

        doc.setFont('helvetica', 'bold');
        doc.text('Tipo:', 120, 84);
        doc.setFont('helvetica', 'normal');
        doc.text('COMBO', 133, 84);

        doc.setFont('helvetica', 'bold');
        doc.text('Direccion:', 20, 91);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.client_address || quote.address || 'Sin dirección', 45, 91);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(65, 105, 225);
        doc.text('COMBO', 105, 107, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        const items = quote.items || [];
        const tableData = items.map(item => [
            item.quantity.toString(),
            item.description || '',
            item.product_code || item.code || '',
            `Q${Number(item.unit_price).toFixed(2)}`,
            `Q${Number(item.total).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 112,
            head: [['CANT.', 'DESCRIPCION', 'CODIGO', 'P/U', 'TOTAL']],
            body: tableData,
            styles: { 
                fontSize: 8, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap',
                halign: 'center', lineWidth: 0.1, lineColor: [255, 255, 255]
            },
            headStyles: { 
                fillColor: [91, 192, 222], textColor: [255, 255, 255], fontStyle: 'bold',
                halign: 'center', fontSize: 9, lineWidth: 0.1, lineColor: [255, 255, 255]
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 85, halign: 'left' },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' }
            },
            alternateRowStyles: { fillColor: [240, 248, 255] },
            margin: { left: 15, right: 15 },
            tableLineColor: [91, 192, 222],
            tableLineWidth: 0.5
        });

        const finalY = doc.lastAutoTable.finalY + 5;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 0, 0);
        doc.text('Nota: Al momento de autorizar la cotización para proyecto, se solicita un 60% de la totalidad como anticipo.', 15, finalY + 5, { maxWidth: 130 });
        doc.setTextColor(0, 0, 0);

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(15, finalY + 12, 195, finalY + 12);

        const totalAmount = items.reduce((sum, item) => sum + Number(item.total), 0);
        const totalEnLetras = window.numeroALetras(totalAmount);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(totalEnLetras, 105, finalY + 18, { align: 'center' });
        doc.text('COMBO', 160, finalY + 18);

        doc.setFontSize(16);
        doc.setTextColor(255, 0, 0);
        doc.text('TOTAL', 145, finalY + 28);
        doc.text(`Q ${totalAmount.toFixed(2)}`, 168, finalY + 28);

        doc.save(`Cotizacion_Combo_${quote.number}.pdf`);
        Swal.close();
        
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Ocurrió un problema al generar el PDF.', 'error');
    }
};

// ============================================
// UTILIDAD: Convertir números a letras
// ============================================
window.numeroALetras = function(num) {
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    
    function convertirGrupo(n) {
        if (n === 0) return '';
        if (n === 100) return 'CIEN';
        
        let resultado = '';
        const c = Math.floor(n / 100);
        if (c > 0) {
            resultado += centenas[c];
            n %= 100;
            if (n > 0) resultado += ' ';
        }
        
        if (n >= 10 && n < 20) {
            resultado += especiales[n - 10];
        } else {
            const d = Math.floor(n / 10);
            const u = n % 10;
            
            if (d > 0) {
                resultado += decenas[d];
                if (u > 0) {
                    resultado += (d === 2 ? '' : ' Y ') + unidades[u];
                }
            } else if (u > 0) {
                resultado += unidades[u];
            }
        }
        
        return resultado;
    }
    
    const partes = num.toFixed(2).split('.');
    const entero = parseInt(partes[0]);
    const centavos = parseInt(partes[1]);
    
    if (entero === 0) return 'CERO QUETZALES';
    
    let resultado = '';
    
    if (entero >= 1000000) {
        const millones = Math.floor(entero / 1000000);
        if (millones === 1) {
            resultado += 'UN MILLÓN';
        } else {
            resultado += convertirGrupo(millones) + ' MILLONES';
        }
        const resto = entero % 1000000;
        if (resto > 0) resultado += ' ';
    }
    
    const miles = Math.floor((entero % 1000000) / 1000);
    if (miles > 0) {
        if (miles === 1) {
            resultado += 'MIL';
        } else {
            resultado += convertirGrupo(miles) + ' MIL';
        }
        const resto = entero % 1000;
        if (resto > 0) resultado += ' ';
    }
    
    const restoFinal = entero % 1000;
    if (restoFinal > 0) {
        resultado += convertirGrupo(restoFinal);
    }
    
    resultado += ' QUETZALES';
    
    if (centavos > 0) {
        resultado += ' CON ' + convertirGrupo(centavos) + ' CENTAVOS';
    }
    
    return resultado.trim();
};

// =========================
// UTILIDADES GLOBALES MEJORADAS
// =========================

/**
 * Destruir DataTable de forma segura
 */
window.safeDestroyDataTable = function(selector) {
    try {
        if (!$(selector).length) {
            return false;
        }
        if (!$.fn.DataTable.isDataTable(selector)) {
            return false;
        }
        
        const instance = $(selector).DataTable();
        instance.clear();
        instance.destroy(true);
        
        console.log(`✅ DataTable destruida: ${selector}`);
        return true;
    } catch (error) {
        console.warn(`⚠️ Error destruyendo ${selector}:`, error.message);
        return false;
    }
};

// =========================
// MÓDULO DE CLIENTES - CORREGIDO
// =========================
async function initClientsModule() {
    console.log('👥 [CLIENTES] Inicializando...');
    
    const selector = '#clientsTable';
    
    const elementExists = await window.waitForElement(selector, 20, 150);
    if (!elementExists) {
        console.error('❌ [CLIENTES] El elemento nunca apareció en el DOM');
        return;
    }
    
    window.safeDestroyDataTable(selector);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
        console.log('👥 [CLIENTES] Creando DataTable...');
        
        window.clientsTable = $(selector).DataTable({
            ajax: { 
                url: API_BASE + 'clients.php', 
                dataSrc: 'data',
                cache: false, // ✅ Desactivar caché
                error: function(xhr, error, thrown) {
                    console.error('❌ [CLIENTES] Error AJAX:', error);
                }
            },
            columns: [
                {
                    data: null,
                    render: (data) => {
                        const lastName = data.last_name ? ` ${data.last_name}` : '';
                        return `${data.name}${lastName}`;
                    }
                },
                { 
                    data: 'nit', 
                    defaultContent: '-',
                    render: (data) => data || '-'
                },
                { data: 'phone', defaultContent: '-' },
                { data: 'email', defaultContent: '-' },
                { data: 'address', defaultContent: '-' },
                {
                    data: null,
                    orderable: false,
                    render: data => `
                        <button class="btn btn-sm btn-primary" onclick="editClient(${data.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteClient(${data.id})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    `
                }
            ],
            order: [[0, 'asc']],
            pageLength: 10,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
                emptyTable: "No hay clientes registrados",
                zeroRecords: "No se encontraron clientes"
            },
            responsive: true,
            drawCallback: function() {
                console.log('👥 [CLIENTES] Tabla renderizada correctamente');
            }
        });

        // Agregar validación en tiempo real al campo de teléfono
        $('#clientPhone').on('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });

        console.log('✅ [CLIENTES] DataTable creada exitosamente');
    } catch (error) {
        console.error('❌ [CLIENTES] Error creando DataTable:', error);
    }
}

// ✅ EXPONER GLOBALMENTE
window.initClientsModule = initClientsModule;

window.saveClient = async function(formData) {
    try {
        if (!formData.name || !formData.last_name) {
            Toast.fire({
                icon: 'error',
                title: 'El nombre y apellido son obligatorios'
            });
            return;
        }

        // Validación de NIT
        if (formData.nit && formData.nit.trim() !== '') {
            if (!/^\d+$/.test(formData.nit.trim())) {
                Toast.fire({
                    icon: 'error',
                    title: 'El NIT debe contener solo números'
                });
                return;
            }
        }

        // Validación de teléfono
        if (formData.phone && formData.phone.trim() !== '') {
            if (!/^\d+$/.test(formData.phone.trim())) {
                Toast.fire({
                    icon: 'error',
                    title: 'El teléfono debe contener solo números'
                });
                return;
            }
        }

        const id = formData.id;
        const method = id ? 'PUT' : 'POST';
        const endpoint = 'clients.php';

        const result = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(formData)
        });

        Toast.fire({ 
            icon: 'success', 
            title: result.message || 'Cliente guardado correctamente' 
        });
        
        $('#clientModal').modal('hide');

        // ✅ CRÍTICO: Recargar tabla de clientes
        if (window.clientsTable && window.clientsTable.ajax) {
            window.clientsTable.ajax.reload(null, false);
        }
        
        // ✅ NUEVO: Recargar estadísticas del dashboard
        if (typeof window.reloadDashboardStats === 'function') {
            await window.reloadDashboardStats();
        }
        
    } catch (error) {
        console.error("Error en saveClient:", error);
        Toast.fire({ icon: 'error', title: 'Error guardando cliente' });
    }
};

window.editClient = async function(id) {
    try {
        const result = await apiRequest(`clients.php?id=${id}`);
        if (result.success && result.data) {
            const client = result.data;
            
            $('#clientId').val(client.id);
            $('#clientName').val(client.name);
            $('#clientLastName').val(client.last_name || '');
            $('#clientNit').val(client.nit || '');
            $('#clientPhone').val(client.phone || '');
            $('#clientEmail').val(client.email || '');
            $('#clientAddress').val(client.address || '');
            
            $('#clientModalLabel').text('Editar Cliente');
            $('#clientModal').modal('show');
            
            // Asegurar que la validación esté activa después de cargar datos
            $('#clientPhone').on('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }
    } catch (error) {
        console.error('Error editando cliente:', error);
        Toast.fire({ icon: 'error', title: 'Error al cargar cliente' });
    }
};

window.deleteClient = async function(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await apiRequest(`clients.php?id=${id}`, {
                method: 'DELETE'
            });

            Toast.fire({ 
                icon: 'success', 
                title: response.message || 'Cliente eliminado' 
            });
            
            // Recargar tabla de clientes
            if (window.clientsTable && window.clientsTable.ajax) {
                window.clientsTable.ajax.reload(null, false);
            }
            
            // ✅ Recargar estadísticas del dashboard
            if (typeof window.loadDashboardStats === 'function') {
                await window.loadDashboardStats();
            }
            
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            Toast.fire({ icon: 'error', title: error.message || 'Error al eliminar' });
        }
    }
};

// =========================
// MÓDULO DE PRODUCTOS - CORREGIDO
// =========================
async function initProductsModule() {
    console.log('📦 [PRODUCTOS] Inicializando...');
    
    const selector = '#productsTable';
    
    const elementExists = await window.waitForElement(selector, 20, 150);
    if (!elementExists) {
        console.error('❌ [PRODUCTOS] El elemento nunca apareció en el DOM');
        return;
    }
    
    window.safeDestroyDataTable(selector);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
        console.log('📦 [PRODUCTOS] Creando DataTable...');
        
        window.productsTable = $(selector).DataTable({
            ajax: { 
                url: API_BASE + 'products.php', 
                dataSrc: 'data',
                cache: false, // ✅ Desactivar caché
                error: function(xhr, error, thrown) {
                    console.error('❌ [PRODUCTOS] Error AJAX:', error);
                }
            },
            columns: [
                { data: 'code' },
                { data: 'name' },
                { 
                    data: 'purchase_price', 
                    render: d => `Q${parseFloat(d).toFixed(2)}` 
                },
                { 
                    data: 'sale_price', 
                    render: d => `Q${parseFloat(d).toFixed(2)}` 
                },
                { 
                    data: 'profit_percentage', 
                    render: d => `${parseFloat(d).toFixed(2)}%` 
                },
                {
                    data: 'stock',
                    render: (data) => {
                        const badge = data > 0 ? 'bg-success' : 'bg-danger';
                        return `<span class="badge ${badge}">${data}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    render: data => `
                        <button class="btn btn-sm btn-primary" onclick="editProduct(${data.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${data.id})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    `
                }
            ],
            order: [[1, 'asc']],
            pageLength: 10,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
                emptyTable: "No hay datos disponibles",
                zeroRecords: "No se encontraron registros"
            },
            responsive: true,
            drawCallback: function() {
                console.log('📦 [PRODUCTOS] Tabla renderizada correctamente');
            }
        });

        console.log('✅ [PRODUCTOS] DataTable creada exitosamente');
    } catch (error) {
        console.error('❌ [PRODUCTOS] Error creando DataTable:', error);
    }
}

// ✅ EXPONER GLOBALMENTE
window.initProductsModule = initProductsModule;

window.editProduct = async function(id) {
    try {
        const result = await apiRequest(`products.php?id=${id}`);
        if (result.success && result.data) {
            const product = result.data;
            
            $('#productId').val(product.id);
            $('#productCode').val(product.code);
            $('#productName').val(product.name);
            $('#purchasePrice').val(product.purchase_price);
            $('#salePrice').val(product.sale_price);
            $('#stock').val(product.stock);
            
            $('#productModalLabel').text('Editar Producto');
            $('#productModal').modal('show');
        }
    } catch (error) {
        console.error('Error editando producto:', error);
        Toast.fire({ icon: 'error', title: 'Error al cargar producto' });
    }
};

window.deleteProduct = async function(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await apiRequest(`products.php?id=${id}`, {
                method: 'DELETE'
            });

            Toast.fire({ icon: 'success', title: response.message || 'Producto eliminado' });
            
            // Recargar tabla de productos
            if (window.productsTable && window.productsTable.ajax) {
                window.productsTable.ajax.reload(null, false);
            }
            
            // ✅ Recargar estadísticas del dashboard
            if (typeof window.loadDashboardStats === 'function') {
                await window.loadDashboardStats();
            }
            
            // Recargar estadísticas del inventario si está abierto
            if (typeof loadInventoryStats === 'function') {
                await loadInventoryStats();
            }
            
            // Recargar tabla de stock bajo
            if (typeof loadLowStockProductsTable === 'function') {
                await loadLowStockProductsTable();
            }
            
            if (typeof loadProductsCache === 'function') {
    await loadProductsCache();
}
            
        } catch (error) {
            console.error('Error eliminando producto:', error);
            Toast.fire({ icon: 'error', title: error.message || 'Error al eliminar' });
        }
    }
};

window.saveProduct = async function(formData) {
    try {
        const id = formData.id;
        const method = id ? 'PUT' : 'POST';
        const endpoint = 'products.php' + (id ? `?id=${id}` : '');

        const result = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(formData)
        });

        Toast.fire({ icon: 'success', title: result.message || 'Producto guardado correctamente' });
        $('#productModal').modal('hide');

        // ✅ CRÍTICO: Recargar tabla de productos
        if (window.productsTable && window.productsTable.ajax) {
            window.productsTable.ajax.reload(null, false);
        }
        
        // ✅ NUEVO: Recargar estadísticas del dashboard
        if (typeof window.reloadDashboardStats === 'function') {
            await window.reloadDashboardStats();
        }
        
        // ✅ NUEVO: Si hay inventario abierto, recargar estadísticas
        if (typeof window.loadInventoryStats === 'function') {
            await window.loadInventoryStats();
            
            if (typeof window.loadLowStockProductsTable === 'function') {
                await window.loadLowStockProductsTable();
            }
        }
         // Recargar tabla de stock bajo si está abierta
        if (typeof loadLowStockProductsTable === 'function') {
            await loadLowStockProductsTable();
        }
        if (typeof loadProductsCache === 'function') {
    await loadProductsCache();
}
        
    } catch (error) {
        console.error("Error en saveProduct:", error);
        const errorMsg = error.message || error.error || 'Error guardando producto';
        Toast.fire({ icon: 'error', title: errorMsg });
    }
};

// =========================
// MÓDULO DE COTIZACIONES PENDIENTES - CON SELECTOR DE TÍTULO
// =========================

window.initPendingQuotesModule = async function() {
    console.log('⏳ [PENDING QUOTES] Inicializando...');
    
    if (typeof loadProductsCache === 'function') {
        await loadProductsCache();
    }
    
    await loadPendingQuotesFullTable();
};

// ✅ Variable global para el título de la sección
window.workMessagesTitle = 'Trabajo realizado';

// ✅ Función para actualizar el título
window.updateWorkMessagesTitle = function() {
    const select = document.getElementById('workMessagesTitleSelect');
    const titleElement = document.getElementById('workMessagesSectionTitle');
    
    if (select && titleElement) {
        window.workMessagesTitle = select.value;
        titleElement.textContent = `${select.value} (Opcional)`;
        console.log('✅ Título actualizado:', window.workMessagesTitle);
    }
};

// ✅ FUNCIÓN CRÍTICA: Obtener TODOS los datos de cotizaciones pendientes
async function fetchAllPendingQuotes() {
    try {
        console.log('⏳ [FETCH] Obteniendo cotizaciones normales pendientes...');
        
        // Obtener cotizaciones normales
        let normalQuotes = [];
        try {
            const normalResponse = await fetch(`${API_BASE}quotes.php?status=pending`);
            const normalData = await normalResponse.json();
            normalQuotes = normalData.data || [];
            console.log(`✅ [FETCH] Cotizaciones normales: ${normalQuotes.length}`);
        } catch (e) {
            console.error('❌ [FETCH] Error en cotizaciones normales:', e);
        }
        
        console.log('⏳ [FETCH] Obteniendo cotizaciones de combos pendientes...');
        
        // Obtener cotizaciones de combos
        let comboQuotes = [];
        try {
            const comboResponse = await fetch(`${API_BASE}combo_quotes.php?status=pending`);
            const comboData = await comboResponse.json();
            comboQuotes = (comboData.data || []).map(q => ({
                ...q,
                is_combo: true,
                type: 'COMBO'
            }));
            console.log(`✅ [FETCH] Cotizaciones de combos: ${comboQuotes.length}`);
        } catch (e) {
            console.error('❌ [FETCH] Error en cotizaciones de combos:', e);
        }
        
        // Combinar y ordenar
        const allQuotes = [...normalQuotes, ...comboQuotes]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        console.log(`✅ [FETCH] Total de cotizaciones pendientes: ${allQuotes.length}`);
        return allQuotes;
        
    } catch (error) {
        console.error('❌ [FETCH] Error crítico:', error);
        return [];
    }
}

async function loadPendingQuotesFullTable() {
    console.log('⏳ [PENDING QUOTES] Cargando tabla...');
    
    const selector = '#pendingQuotesFullTable';
    
    // Esperar a que el elemento exista
    let attempts = 0;
    while (!$(selector).length && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 150));
        attempts++;
    }
    
    if (!$(selector).length) {
        console.error('❌ [PENDING QUOTES] Elemento no encontrado después de esperar');
        return;
    }
    
    // Destruir tabla anterior si existe
    if ($.fn.DataTable.isDataTable(selector)) {
        $(selector).DataTable().destroy();
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    try {
        console.log('⏳ [PENDING QUOTES] Pre-cargando datos...');
        
        const allQuotes = await fetchAllPendingQuotes();
        
        console.log(`✅ [PENDING QUOTES] Datos pre-cargados: ${allQuotes.length} cotizaciones`);
        
        if (!allQuotes || allQuotes.length === 0) {
            console.warn('⚠️ [PENDING QUOTES] No hay cotizaciones pendientes');
        }
        
        console.log('⏳ [PENDING QUOTES] Creando DataTable...');
        
        window.pendingQuotesFullTable = $(selector).DataTable({
            data: allQuotes || [],
            columns: [
                { 
                    data: 'number',
                    defaultContent: 'N/A'
                },
                { 
                    data: null,
                    defaultContent: '',
                    render: function(data, type, row) {
                        if (!data) return '-';
                        if (data.is_combo) {
                            return '<span class="badge bg-purple">COMBO</span>';
                        }
                        const badgeType = data.type === 'MO' ? 'info' : 'primary';
                        return `<span class="badge bg-${badgeType}">${data.type}</span>`;
                    }
                },
                { 
                    data: null,
                    defaultContent: '',
                    render: function(data, type, row) {
                        if (!data) return '-';
                        if (data.is_combo) {
                            return '<span class="badge bg-warning text-dark">Cotización de Combo</span>';
                        }
                        return '<span class="badge bg-success">Cotización Normal</span>';
                    }
                },
                { 
                    data: 'client_name',
                    defaultContent: 'Sin cliente'
                },
                { 
                    data: 'total',
                    defaultContent: '0.00',
                    render: function(data, type, row) {
                        const total = parseFloat(data) || 0;
                        return `Q${total.toFixed(2)}`;
                    }
                },
                {
                    data: 'created_at',
                    defaultContent: '-',
                    render: function(data, type, row) {
                        if (!data) return '-';
                        try {
                            return new Date(data).toLocaleDateString('es-GT');
                        } catch (e) {
                            return data;
                        }
                    }
                },
                {
                    data: null,
                    orderable: false,
                    defaultContent: '',
                    render: function(data, type, row) {
                        if (!data || !data.id) return '';
                        const isCombo = data.is_combo ? 'true' : 'false';
                        return `
                            <button class="btn btn-sm btn-success" onclick="previewInvoiceFromPending(${data.id}, ${isCombo})" title="Facturar">
                                <i class="bi bi-receipt"></i> Facturar
                            </button>
                        `;
                    }
                }
            ],
            order: [[5, 'desc']],
            pageLength: 10,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
                emptyTable: 'No hay cotizaciones pendientes',
                zeroRecords: 'No se encontraron cotizaciones pendientes'
            },
            responsive: true
        });

        console.log('✅ [PENDING QUOTES] DataTable inicializada correctamente');
        
    } catch (error) {
        console.error('❌ [PENDING QUOTES] Error al crear tabla:', error);
        console.error('Stack:', error.stack);
    }
}

// =========================
// FUNCIÓN UNIFICADA: Preview invoice desde tabla de pendientes
// =========================
window.previewInvoiceFromPending = async function(quoteId, isCombo) {
    console.log(`📋 [PREVIEW] quote_id=${quoteId}, is_combo=${isCombo}`);
    
    selectedQuoteForInvoice = quoteId;
    window.currentInvoiceIsCombo = isCombo;
    
    // ✅ Limpiar mensajes de trabajo y resetear título
    window.workMessages = [];
    window.workMessagesTitle = 'Trabajo realizado'; // Resetear al valor por defecto
    
    // Cargar la previsualización según el tipo
    if (isCombo) {
        await previewComboInvoice(quoteId);
    } else {
        await previewInvoice(quoteId);
    }
};

// =========================
// FUNCIÓN: Previsualizar factura COMBO
// =========================
async function previewComboInvoice(quoteId) {
    try {
        cleanupModals();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        console.log(`🔍 [COMBO PREVIEW] Obteniendo datos de combo: ${quoteId}`);
        
        const result = await apiRequest(`combo_quotes.php?id=${quoteId}`);
        
        if (!result || !result.data) {
            throw new Error('No se pudieron obtener los datos de la cotización de combo');
        }
        
        const quote = result.data;
        selectedQuoteForInvoice = quoteId;
        window.currentInvoiceIsCombo = true;
        
        console.log(`✅ [COMBO PREVIEW] Datos obtenidos:`, quote);
        
        // Validar stock
        let hasStockIssues = false;
        let stockWarnings = [];
        
        if (quote.items && quote.items.length > 0) {
            for (const item of quote.items) {
                if (item.product_id) {
                    const productResult = await apiRequest(`products.php?id=${item.product_id}`);
                    const product = productResult.data;
                    
                    if (product.stock < item.quantity) {
                        hasStockIssues = true;
                        if (product.stock === 0) {
                            stockWarnings.push(`${item.description}: Sin stock disponible`);
                        } else {
                            stockWarnings.push(`${item.description}: Solo hay ${product.stock} disponibles (necesita ${item.quantity})`);
                        }
                    }
                }
            }
        }
        
        if (hasStockIssues) {
            const warningHtml = stockWarnings.map(w => `<li>${w}</li>`).join('');
            
            await Swal.fire({
                title: '⚠️ Stock Insuficiente',
                html: `
                    <div class="text-start">
                        <p><strong>Los siguientes productos tienen problemas de stock:</strong></p>
                        <ul class="text-danger">${warningHtml}</ul>
                        <p class="text-muted mt-3">
                            <i class="bi bi-info-circle"></i> 
                            Debe editar esta cotización desde el panel de "Cotizaciones de Combos" para ajustar las cantidades.
                        </p>
                    </div>
                `,
                icon: 'warning',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#6c757d'
            });
            return;
        }
        
        const total = parseFloat(quote.total) || 0;
        
        let itemsHtml = '';
        if (quote.items && quote.items.length > 0) {
            quote.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">Q${parseFloat(item.unit_price).toFixed(2)}</td>
                        <td class="text-end">Q${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        const html = `
            <div class="invoice-preview">
                <div class="text-center mb-4">
                    <h3>SISTEMA DE GESTIÓN EMPRESARIAL</h3>
                    <p class="text-muted">Previsualización de Factura - COMBO</p>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6>Datos del Cliente:</h6>
                        <p class="mb-1"><strong>${quote.client_name} ${quote.client_last_name || ''}</strong></p>
                        <p class="mb-1">Tel: ${quote.client_phone || 'N/A'}</p>
                        <p class="mb-1">Email: ${quote.client_email || 'N/A'}</p>
                        <p class="mb-1">${quote.client_address || ''}</p>
                    </div>
                    <div class="col-md-6 text-end">
                        <p class="mb-1"><strong>Cotización:</strong> ${quote.number}</p>
                        <p class="mb-1"><strong>Combo:</strong> ${quote.combo_name || 'N/A'}</p>
                        <p class="mb-1"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-GT')}</p>
                        <p class="mb-1"><strong>Tipo:</strong> <span class="badge bg-purple">COMBO</span></p>
                    </div>
                </div>
                
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Descripción</th>
                            <th class="text-center" width="100">Cant.</th>
                            <th class="text-end" width="120">P. Unit.</th>
                            <th class="text-end" width="120">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr class="table-primary">
                            <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                            <td class="text-end"><h5 class="mb-0">Q${total.toFixed(2)}</h5></td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="alert alert-warning mt-4">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Al confirmar, se <strong>descontará el stock</strong> de los productos y otras cotizaciones pendientes serán ajustadas.
                </div>
            </div>
        `;
        
        $('#invoicePreview').html(html);
        
        // Mostrar sección de mensajes de trabajo
        const workMessagesSection = document.getElementById('workMessagesSection');
        if (workMessagesSection) {
            workMessagesSection.style.display = 'block';
            
            // ✅ Resetear el select al valor por defecto
            const titleSelect = document.getElementById('workMessagesTitleSelect');
            if (titleSelect) {
                titleSelect.value = 'Trabajo realizado';
                window.workMessagesTitle = 'Trabajo realizado';
            }
            
            // Actualizar título
            const titleElement = document.getElementById('workMessagesSectionTitle');
            if (titleElement) {
                titleElement.textContent = 'Trabajo realizado (Opcional)';
            }
            
            window.renderWorkMessages();
        }
        
        console.log(`✅ [COMBO PREVIEW] Modal de previsualización cargado correctamente`);
        
        setTimeout(() => {
            $('#invoicePreviewModal').modal('show');
        }, 100);
        
    } catch (error) {
        console.error('❌ Error previsualizando factura combo:', error);
        cleanupModals();
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo cargar la previsualización de la factura de combo',
            confirmButtonText: 'Entendido'
        });
    }
}

// ✅ FUNCIÓN: Recargar tabla de cotizaciones pendientes
window.reloadPendingQuotesTable = async function() {
    console.log('🔄 [PENDING QUOTES] Recargando tabla...');
    
    try {
        const newData = await fetchAllPendingQuotes();
        
        if (window.pendingQuotesFullTable && typeof window.pendingQuotesFullTable.clear === 'function') {
            window.pendingQuotesFullTable.clear();
            window.pendingQuotesFullTable.rows.add(newData);
            window.pendingQuotesFullTable.draw();
            console.log('✅ [PENDING QUOTES] Tabla recargada');
        } else {
            console.warn('⚠️ [PENDING QUOTES] DataTable no está disponible, reinicializando...');
            await loadPendingQuotesFullTable();
        }
    } catch (error) {
        console.error('❌ [PENDING QUOTES] Error al recargar:', error);
    }
};

// ============================================
// ✅ confirmInvoiceGeneration - CON RECARGA DE DASHBOARD
// ============================================
window.confirmInvoiceGeneration = async function() {
    if (!selectedQuoteForInvoice) return;
    
    try {
        const isCombo = window.currentInvoiceIsCombo || false;
        
        // Obtener solo los mensajes con texto
        const messagesWithText = window.workMessages
            .filter(msg => msg.text && msg.text.trim() !== '')
            .map(msg => msg.text);
        
        console.log(`📄 [CONFIRM INVOICE] quote_id=${selectedQuoteForInvoice}, is_combo=${isCombo}`);
        console.log(`📋 [CONFIRM INVOICE] Mensajes a guardar:`, messagesWithText);
        console.log(`🏷️ [CONFIRM INVOICE] Título seleccionado:`, window.workMessagesTitle);
        
        const result = await apiRequest('invoices.php', {
            method: 'POST',
            body: JSON.stringify({ 
                quote_id: selectedQuoteForInvoice,
                is_combo: isCombo,
                work_messages: messagesWithText.length > 0 ? JSON.stringify(messagesWithText) : null,
                work_messages_title: window.workMessagesTitle
            })
        });
        
        // Cerrar modal
        $('#invoicePreviewModal').modal('hide');
        await new Promise(resolve => setTimeout(resolve, 300));
        cleanupModals();
        
        // Recarga de tablas
        console.log('🔄 Recargando todas las tablas después de facturar...');
        
        const safeReload = (tableName, displayName) => {
            try {
                const table = window[tableName];
                if (table && table.ajax && typeof table.ajax.reload === 'function') {
                    table.ajax.reload(null, false);
                    console.log(`✅ ${displayName} recargada`);
                    return true;
                }
            } catch (e) {
                console.log(`ℹ️ ${displayName}: ${e.message}`);
            }
            return false;
        };
        
        safeReload('invoicesTable', 'Facturas');
        safeReload('quotesTable', 'Cotizaciones');
        safeReload('comboQuotesTable', 'Cotizaciones de Combos');
        safeReload('productsTable', 'Productos');
        
        if (typeof window.reloadPendingQuotesTable === 'function') {
            try {
                await window.reloadPendingQuotesTable();
                console.log('✅ Cotizaciones pendientes recargadas');
            } catch (e) {
                console.log('ℹ️ Pendientes no recargadas:', e.message);
            }
        }
        
        if (typeof loadProductsCache === 'function') {
            try {
                await loadProductsCache();
                console.log('✅ Caché de productos recargado');
            } catch (e) {
                console.log('ℹ️ Caché no recargado:', e.message);
            }
        }
        
        // ✅✅ NUEVO: Recargar estadísticas del dashboard
        if (typeof window.reloadDashboardStats === 'function') {
            try {
                await window.reloadDashboardStats();
                console.log('📊 Estadísticas del dashboard actualizadas después de facturar');
            } catch (e) {
                console.log('ℹ️ Dashboard no recargado:', e.message);
            }
        } else if (typeof window.loadDashboardStats === 'function') {
            try {
                await window.loadDashboardStats();
                console.log('📊 Estadísticas del dashboard actualizadas después de facturar');
            } catch (e) {
                console.log('ℹ️ Dashboard no recargado:', e.message);
            }
        }
        
        setTimeout(() => {
            console.log('🔄 Recarga secundaria...');
            safeReload('quotesTable', 'Cotizaciones');
            safeReload('comboQuotesTable', 'Cotizaciones de Combos');
        }, 1000);
        
        let alertHtml = `<p>La factura <strong>${result.data.number}</strong> se ha generado exitosamente.</p>`;
        
        if (result.adjusted_quotes && result.adjusted_quotes.length > 0) {
            alertHtml += `
                <div class="alert alert-info mt-3 text-start">
                    <i class="bi bi-info-circle"></i>
                    <strong>Cotizaciones ajustadas:</strong><br>
                    ${result.adjusted_quotes.map(q => `• ${q}`).join('<br>')}
                </div>
            `;
        }
        
        alertHtml += `<p class="text-muted mt-3"><small>El stock de productos ha sido actualizado.</small></p>`;
        
        await Swal.fire({
            icon: 'success',
            title: isCombo ? '✅ Factura de Combo Generada' : '✅ Factura Generada',
            html: alertHtml,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#198754'
        });
        
        console.log('✅✅✅ Facturación completada y tablas recargadas');
        
        // Limpiar variables
        selectedQuoteForInvoice = null;
        window.currentInvoiceIsCombo = false;
        window.workMessages = [];
        window.workMessagesTitle = 'Trabajo realizado';
        
    } catch (error) {
        console.error('❌ Error generando factura:', error);
        cleanupModals();
        
        if (error.message) {
            let errorMsg = error.message;
            
            if (errorMsg.includes('Foreign Key') || errorMsg.includes('FOREIGN KEY')) {
                errorMsg = 'Error de configuración en la base de datos.';
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Error al Facturar',
                text: errorMsg,
                confirmButtonText: 'Entendido'
            });
        }
    }
};

// ============================================
// GESTIÓN DE MENSAJES DE TRABAJO
// ============================================

window.workMessages = [];

window.addWorkMessage = function() {
    const messageObj = {
        id: Date.now(),
        text: ''
    };
    
    window.workMessages.push(messageObj);
    renderWorkMessages();
};

window.removeWorkMessage = function(id) {
    window.workMessages = window.workMessages.filter(msg => msg.id !== id);
    renderWorkMessages();
};

window.updateWorkMessage = function(id, text) {
    const message = window.workMessages.find(msg => msg.id === id);
    if (message) {
        message.text = text;
    }
};

window.renderWorkMessages = function() {
    const tbody = document.getElementById('workMessagesList');
    if (!tbody) return;
    
    if (window.workMessages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay mensajes agregados</td></tr>';
        return;
    }
    
    tbody.innerHTML = window.workMessages.map((msg, index) => `
        <tr>
            <td class="text-center"><strong>●</strong></td>
            <td>
                <input type="text" 
                       class="form-control-plaintext" 
                       value="${msg.text || ''}" 
                       onchange="updateWorkMessage(${msg.id}, this.value)"
                       placeholder="Escriba el mensaje aquí...">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeWorkMessage(${msg.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

console.log('✅ Módulo de cotizaciones pendientes con selector de título cargado');

// =========================
// FUNCIÓN: RECARGAR ESTADÍSTICAS DEL DASHBOARD
// =========================
window.loadDashboardStats = async function() {
    console.log('📊 Cargando estadísticas del dashboard...');
    
    try {
        // Llamar al API de estadísticas con cache-busting
        const result = await apiRequest('stats.php?_t=' + new Date().getTime());
        
        if (result.success && result.data) {
            const stats = result.data;
            
            // Actualizar valores en el DOM
            $('#totalProducts').text(stats.total_products || 0);
            $('#totalClients').text(stats.total_clients || 0);
            $('#totalQuotes').text(stats.total_quotes || 0);
            $('#lowStock').text(stats.low_stock_products || 0);
            
            console.log('✅ Estadísticas del dashboard actualizadas:', stats);
        } else {
            console.warn('⚠️ No se recibieron datos válidos del dashboard');
        }
    } catch (error) {
        console.error('❌ Error cargando estadísticas del dashboard:', error);
    }
};

// Cargar estadísticas cuando se active el tab de dashboard
$(document).on('shown.bs.tab', 'button[data-bs-toggle="tab"]', function (e) {
    const target = $(e.target).attr('data-bs-target');
    if (target === '#dashboard') {
        window.loadDashboardStats();
    }
});

// Cargar estadísticas inicialmente si estamos en el dashboard
$(document).ready(function() {
    // Esperar un momento para que el DOM esté completamente listo
    setTimeout(function() {
        if ($('#dashboard').hasClass('show active')) {
            window.loadDashboardStats();
        }
    }, 500);
});

// =========================
// DECLARAR FUNCIONES GLOBALES
// =========================
window.initProductsModule = window.initProductsModule || null;
window.initInventoryModule = window.initInventoryModule || null;
window.initClientsModule = window.initClientsModule || null;
window.initCombosModule = window.initCombosModule || null;
window.initQuotesModule = window.initQuotesModule || null;
window.initInvoicesModule = window.initInvoicesModule || null;
window.initPendingQuotesModule = window.initPendingQuotesModule || null;
window.initComboQuotesModule = window.initComboQuotesModule || null;
window.saveMovement = window.saveMovement || null;

// =========================
// INICIALIZACIÓN AL CARGAR
// =========================
$(document).ready(function() {
    console.log('🚀 Sistema iniciando...');
    
    // Inicializar tab activo (Dashboard por defecto)
    const activeTab = $('.tab-pane.show.active').attr('id');
    if (activeTab && activeTab !== 'dashboard') {
        console.log(`📍 Inicializando tab activo: ${activeTab}`);
        setTimeout(() => initializeTabContent(activeTab), 300);
    }
    
    // Listener de cambio de tabs
    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        const target = $(e.target).attr('data-bs-target');
        const tabId = target.replace('#', '');
        
        console.log(`📍 Tab activado: ${tabId}`);
        
        // Delay breve para permitir que el contenido se renderice
        setTimeout(() => initializeTabContent(tabId), 200);
    });
    
    console.log('✅ Sistema listo');
});

// =========================
// INICIALIZAR CONTENIDO DE TAB - VERSIÓN CON DIAGNÓSTICO COMPLETO
// =========================
async function initializeTabContent(tabId) {
    console.log(`🔍 ========== PROCESANDO TAB: ${tabId} ==========`);
    
    // Configuración de tabs
    const tabConfig = {
        'products': {
            name: 'PRODUCTOS',
            selectors: ['#productsTable', '.products-container', '#products'],
            init: () => window.initProductsModule?.()
        },
        'inventory': {
            name: 'INVENTARIO',
            selectors: ['#inventoryTable', '.inventory-container', '#inventory'],
            init: () => window.initInventoryModule?.()
        },
        'clients': {
            name: 'CLIENTES',
            selectors: ['#clientsTable', '.clients-container', '#clients'],
            init: () => window.initClientsModule?.()
        },
        'combos': {
            name: 'COMBOS',
            selectors: ['#combosGrid', '.combos-container', '#combos'],
            init: () => window.initCombosModule?.()
        },
        'combo-quotes': {
            name: 'COMBO COTIZACIONES',
            selectors: ['#comboQuotesTable', '.combo-quotes-container', '#combo-quotes'],
            init: () => window.initComboQuotesModule?.()
        },
        'quotes': {
            name: 'COTIZACIONES',
            selectors: ['#quotesTable', '.quotes-container', '#quotes'],
            init: () => window.initQuotesModule?.()
        },
        'pending-quotes': {
            name: 'COTIZACIONES PENDIENTES',
            selectors: ['#pendingQuotesFullTable', '.pending-quotes-container', '#pending-quotes'],
            init: () => window.initPendingQuotesModule?.()
        },
        'invoices': {
            name: 'FACTURAS',
            selectors: ['#invoicesTable', '.invoices-container', '#invoices'],
            init: () => window.initInvoicesModule?.()
        },
        'dashboard': {
            name: 'DASHBOARD',
            selectors: [],
            init: null
        }
    };
    
    const config = tabConfig[tabId];
    
    if (!config) {
        console.error(`❌ No hay configuración para: ${tabId}`);
        console.log('📋 Tabs disponibles:', Object.keys(tabConfig));
        return;
    }
    
    console.log(`📌 Tab encontrado: ${config.name}`);
    
    // Dashboard no requiere inicialización
    if (tabId === 'dashboard') {
        console.log('ℹ️ Dashboard - sin inicialización necesaria');
        return;
    }
    
    // Verificar que la función de inicialización existe
    console.log(`🔍 Verificando función de inicialización...`);
    console.log(`   - Existe config.init: ${!!config.init}`);
    console.log(`   - Tipo de config.init: ${typeof config.init}`);
    
    if (!config.init) {
        console.error(`❌ No hay función init para ${config.name}`);
        return;
    }
    
    // Verificar que la función global existe
    const globalFuncName = `init${config.name.charAt(0) + config.name.slice(1).toLowerCase().replace(/\s/g, '')}Module`;
    console.log(`🔍 Buscando función global: window.${globalFuncName}`);
    console.log(`   - Existe en window: ${typeof window[globalFuncName]}`);
    
    try {
        console.log(`⏳ Buscando elementos en el DOM...`);
        let elementFound = false;
        let foundSelector = null;
        
        // Verificar qué elementos existen AHORA en el DOM
        console.log(`📊 Estado actual del DOM para ${config.name}:`);
        config.selectors.forEach(sel => {
            const exists = $(sel).length > 0;
            const isVisible = $(sel).is(':visible');
            console.log(`   - ${sel}: ${exists ? '✅ existe' : '❌ no existe'} ${exists ? (isVisible ? '(visible)' : '(oculto)') : ''}`);
        });
        
        // Intentar encontrar selector con timeout corto
        for (const selector of config.selectors) {
            let attempts = 0;
            while (attempts < 3) {
                if ($(selector).length > 0) {
                    elementFound = true;
                    foundSelector = selector;
                    console.log(`✅ Elemento encontrado: ${selector} (intento ${attempts + 1})`);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (elementFound) break;
        }
        
        if (!elementFound) {
            console.warn(`⚠️ Ningún elemento encontrado para ${config.name}`);
            console.log(`📋 Elementos disponibles en el tab #${tabId}:`, $(`#${tabId}`).find('*').map((i, el) => el.id || el.className).get().filter(Boolean).slice(0, 10));
        } else {
            console.log(`✅ Selector válido encontrado: ${foundSelector}`);
        }
        
        // Delay adicional
        console.log(`⏳ Esperando 150ms antes de inicializar...`);
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Inicializar el módulo
        console.log(`🔧 Llamando a moduleInitializers.init("${tabId}", "${config.name}", ...)`);
        
        // Verificar que moduleInitializers existe
        if (typeof moduleInitializers === 'undefined') {
            console.error(`❌ CRÍTICO: moduleInitializers no está definido`);
            return;
        }
        
        console.log(`✅ moduleInitializers está disponible`);
        await moduleInitializers.init(tabId, config.name, config.init);
        
        console.log(`✅ ========== ${config.name} COMPLETADO ==========`);
        
    } catch (error) {
        console.error(`❌ ========== ERROR EN ${config.name} ==========`);
        console.error(`Error completo:`, error);
        console.error(`Stack trace:`, error.stack);
    }
}

console.log("📦 main.js V9 (con diagnóstico completo) cargado");