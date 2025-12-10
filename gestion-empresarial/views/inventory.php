<div class="row mb-4">
    <div class="col-md-3">
        <div class="card stat-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <p class="text-muted mb-1">Productos</p>
                        <!-- ✅ CAMBIO: ID único para inventario -->
                        <h4 class="mb-0" id="inventoryTotalProducts">0</h4>
                    </div>
                    <div class="stat-icon bg-primary bg-opacity-10 text-primary">
                        <i class="bi bi-box-seam"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card stat-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <p class="text-muted mb-1">Stock Total</p>
                        <!-- ✅ CAMBIO: ID único para inventario -->
                        <h4 class="mb-0" id="inventoryTotalStock">0</h4>
                    </div>
                    <div class="stat-icon bg-success bg-opacity-10 text-success">
                        <i class="bi bi-boxes"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card stat-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <p class="text-muted mb-1">Stock Bajo</p>
                        <!-- ✅ CAMBIO: ID único para inventario -->
                        <h4 class="mb-0 text-danger" id="inventoryLowStock">0</h4>
                    </div>
                    <div class="stat-icon bg-danger bg-opacity-10 text-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card stat-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <p class="text-muted mb-1">Movimientos</p>
                        <!-- ✅ CAMBIO: ID único para inventario -->
                        <h4 class="mb-0" id="inventoryTotalMovements">0</h4>
                    </div>
                    <div class="stat-icon bg-info bg-opacity-10 text-info">
                        <i class="bi bi-arrow-left-right"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0 text-white"><i class="bi bi-clipboard-data"></i> Movimientos de Inventario</h5>
        <button class="btn btn-primary" onclick="openMovementModal()">
            <i class="bi bi-plus-circle"></i> Registrar Movimiento
        </button>
    </div>
    <div class="card-body">
        <!-- Filtros en una sola línea -->
        <div class="row mb-3 align-items-end">
            <!-- Tabs de tipo de movimiento -->
            <div class="col-md-4">
                <ul class="nav nav-pills mb-0" id="movementTabs">
                    <li class="nav-item">
                        <button class="nav-link active" data-filter="all" onclick="filterMovements('all')">Todos</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" data-filter="in" onclick="filterMovements('in')">Entradas</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" data-filter="out" onclick="filterMovements('out')">Salidas</button>
                    </li>
                </ul>
            </div>

            <!-- Filtro de fechas -->
            <div class="col-md-3">
                <label class="form-label small mb-1">Desde:</label>
                <input type="date" class="form-control" id="dateFrom">
            </div>
            <div class="col-md-3">
                <label class="form-label small mb-1">Hasta:</label>
                <input type="date" class="form-control" id="dateTo">
            </div>
            <div class="col-md-2">
                <button class="btn btn-primary w-100 mb-1" onclick="applyDateFilter()">
                    <i class="bi bi-funnel"></i> Filtrar
                </button>
                <button class="btn btn-secondary w-100" onclick="clearDateFilter()">
                    <i class="bi bi-x-circle"></i> Limpiar
                </button>
            </div>
        </div>
        
        <div class="table-responsive">
            <table id="inventoryTable" class="table table-hover table-striped">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Motivo</th>
                        <th>Documento</th>
                        <th>Stock Actual</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<!-- Productos con Stock Bajo -->
<div class="card mt-4" id="lowStockCard">
    <div class="card-header bg-warning bg-opacity-10">
        <h5 class="mb-0 text-warning"><i class="bi bi-exclamation-triangle"></i> Productos con Stock Bajo</h5>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table id="lowStockTable" class="table table-sm">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Stock Actual</th>
                        <th>Stock Mínimo</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal de Movimiento -->
<div class="modal fade" id="movementModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title mb-0 text-white" id="movementModalTitle">Registrar Movimiento</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="movementForm" onsubmit="event.preventDefault(); saveMovement();">
                <input type="hidden" id="movementId" name="movement_id">
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Tipo de Movimiento *</label>
                        <select class="form-select" id="movementType" name="type" required onchange="updateMovementLabel()">
                            <option value="">Seleccionar...</option>
                            <option value="in">Entrada (Compra/Ingreso)</option>
                            <option value="out">Salida (Venta/Egreso)</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Producto *</label>
                        <select class="form-select" id="movementProduct" name="product_id" required onchange="showCurrentStock()">
                            <option value="">Seleccionar producto...</option>
                        </select>
                        <small class="text-muted" id="currentStock"></small>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label" id="quantityLabel">Cantidad *</label>
                        <input type="number" class="form-control" id="movementQuantity" name="quantity" min="1" required>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Motivo</label>
                        <input type="text" class="form-control" id="movementReason" name="reason" placeholder="Ej: Compra a proveedor, Venta a cliente">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Número de Documento</label>
                        <input type="text" class="form-control" id="movementDocument" name="document_number" placeholder="Ej: FAC-001">
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        El stock se actualizará automáticamente según el tipo de movimiento.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-save"></i> <span id="saveButtonText">Registrar</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>