<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de Inventario</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .stat-card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-2px);
        }
        .stat-icon {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }
        .nav-pills .nav-link {
            border-radius: 20px;
            margin-right: 5px;
            padding: 8px 16px;
        }
    </style>
</head>
<body>
    <div class="container-fluid py-4">
        <!-- Estadísticas -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <p class="text-muted mb-1">Productos</p>
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
                <!-- Filtros compactos alineados a la izquierda -->
                <div class="row mb-3 g-2">
                    <!-- Tabs de tipo de movimiento -->
                    <div class="col-auto">
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
                </div>

                <!-- Filtros de fecha en una fila compacta -->
                <div class="row mb-3 g-2">
                    <div class="col-md-2">
                        <label class="form-label small mb-1">Desde:</label>
                        <input type="date" class="form-control form-control-sm" id="dateFrom">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small mb-1">Hasta:</label>
                        <input type="date" class="form-control form-control-sm" id="dateTo">
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <button class="btn btn-primary btn-sm w-100" onclick="applyDateFilter()">
                            <i class="bi bi-funnel"></i> Filtrar
                        </button>
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <button class="btn btn-secondary btn-sm w-100" onclick="clearDateFilter()">
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

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function filterMovements(type) {
            document.querySelectorAll('#movementTabs .nav-link').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelector(`[data-filter="${type}"]`).classList.add('active');
            console.log('Filtrar movimientos:', type);
        }

        function toggleSearchMode() {
            console.log('Modo de búsqueda activado');
        }

        function applyDateFilter() {
            const dateFrom = document.getElementById('dateFrom').value;
            const dateTo = document.getElementById('dateTo').value;
            console.log('Filtrar por fechas:', dateFrom, 'hasta', dateTo);
        }

        function clearDateFilter() {
            document.getElementById('dateFrom').value = '';
            document.getElementById('dateTo').value = '';
            console.log('Filtros de fecha limpiados');
        }

        function openMovementModal() {
            const modal = new bootstrap.Modal(document.getElementById('movementModal'));
            modal.show();
        }

        function saveMovement() {
            console.log('Guardar movimiento');
        }

        function updateMovementLabel() {
            console.log('Actualizar etiqueta de movimiento');
        }

        function showCurrentStock() {
            console.log('Mostrar stock actual');
        }

        document.addEventListener('DOMContentLoaded', function() {
            console.log('Sistema de inventario cargado');
        });
    </script>
</body>
</html>