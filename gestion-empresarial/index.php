<?php
require_once 'config.php';
require_once 'api/stats.php';

// Obtener estadísticas
$stats = getStats();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo APP_NAME; ?></title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <!-- SweetAlert2 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <!-- DataTables -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    
    <style>

/* ========================================
   FIX PARA MODALES OSCURECIDOS
   ======================================== */

/* Asegurar que solo haya un backdrop */
.modal-backdrop {
    position: fixed !important;
    top: 0;
    left: 0;
    z-index: 1040 !important;
    width: 100vw;
    height: 100vh;
    background-color: #000;
}

.modal-backdrop.show {
    opacity: 0.5 !important;
}

/* Asegurar que el modal esté por encima */
.modal {
    z-index: 1050 !important;
}

.modal.show {
    display: block !important;
}

/* Prevenir acumulación de backdrops */
body.modal-open {
    overflow: hidden;
    padding-right: 0 !important;
}

/* Estilos de impresión */
@media print {
    .modal-header, .modal-footer {
        display: none !important;
    }
    
    .no-print {
        display: none !important;
    }
    
    .print-only {
        display: block !important;
    }
    
    @page {
        margin: 0;
    }
    
    body {
        margin: 1cm;
    }
    
    a[href]:after {
        content: none !important;
    }
    
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}

.no-print {
    /* Visible en pantalla */
}

.print-only {
    display: none;
}

/* Animaciones suaves para modales */
.modal.fade .modal-dialog {
    transition: transform 0.3s ease-out;
}

.modal.show .modal-dialog {
    transform: none;
}

        :root {
            --primary-navy: #1a2332;
            --secondary-navy: #2d3e50;
            --accent-gold: #d4af37;
            --accent-gold-light: #e8c968;
            --elegant-gray: #4a5568;
            --light-gray: #e2e8f0;
            --soft-white: #f8fafc;
            --text-dark: #1e293b;
            --success-green: #059669;
            --info-blue: #0284c7;
            --warning-amber: #d97706;
            --danger-red: #dc2626;
        }
        
        body {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: var(--text-dark);
        }
        
        .navbar {
            background: linear-gradient(135deg, var(--primary-navy) 0%, var(--secondary-navy) 100%);
            box-shadow: 0 4px 20px rgba(26, 35, 50, 0.3);
            border-bottom: 2px solid var(--accent-gold);
            padding: 1rem 0;
        }
        
        .navbar-brand {
            color: var(--soft-white) !important;
            font-weight: 700;
            font-size: 1.5rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .navbar-brand i {
            color: var(--accent-gold);
            margin-right: 0.5rem;
        }
        
        .navbar-text {
            color: var(--light-gray) !important;
            font-weight: 500;
        }
        
        .stat-card {
            border: none;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(26, 35, 50, 0.12);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            background: linear-gradient(135deg, #ffffff 0%, var(--soft-white) 100%);
            border-left: 4px solid var(--accent-gold);
            overflow: hidden;
            position: relative;
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, var(--accent-gold-light) 0%, transparent 70%);
            opacity: 0.1;
            border-radius: 50%;
            transform: translate(30%, -30%);
        }
        
        .stat-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 16px 40px rgba(26, 35, 50, 0.2);
            border-left-color: var(--accent-gold-light);
        }
        
        .stat-icon {
            width: 70px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            font-size: 2rem;
            background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }
        
        .tab-content {
            background: linear-gradient(135deg, #ffffff 0%, var(--soft-white) 100%);
            border-radius: 0 16px 16px 16px;
            padding: 30px;
            box-shadow: 0 8px 24px rgba(26, 35, 50, 0.1);
            border: 1px solid var(--light-gray);
        }
        
        .nav-tabs {
            border-bottom: 3px solid var(--accent-gold);
            background: linear-gradient(135deg, var(--primary-navy) 0%, var(--secondary-navy) 100%);
            border-radius: 16px 16px 0 0;
            padding: 12px 20px 0 20px;
        }
        
        .nav-tabs .nav-link {
            color: var(--light-gray);
            border: none;
            padding: 14px 24px;
            margin-right: 8px;
            border-radius: 12px 12px 0 0;
            transition: all 0.3s ease;
            background: transparent;
            font-weight: 500;
            position: relative;
        }
        
        .nav-tabs .nav-link i {
            margin-right: 8px;
            font-size: 1.1rem;
        }
        
        .nav-tabs .nav-link:hover {
            background: rgba(212, 175, 55, 0.15);
            color: var(--accent-gold-light);
            transform: translateY(-2px);
        }
        
        .nav-tabs .nav-link.active {
            background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%);
            color: var(--primary-navy);
            font-weight: 700;
            box-shadow: 0 -4px 12px rgba(212, 175, 55, 0.3);
        }
        
        .nav-tabs .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--accent-gold);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%);
            border: none;
            padding: 12px 28px;
            border-radius: 10px;
            transition: all 0.3s ease;
            color: var(--primary-navy);
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);
            background: linear-gradient(135deg, var(--accent-gold-light) 0%, var(--accent-gold) 100%);
        }
        
        .table {
            border-radius: 12px;
            overflow: hidden;
            background: white;
            box-shadow: 0 2px 8px rgba(26, 35, 50, 0.08);
        }
        
        .table thead {
            background: linear-gradient(135deg, var(--primary-navy) 0%, var(--secondary-navy) 100%);
            color: var(--soft-white);
        }
        
        .table thead th {
            padding: 16px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 0.5px;
            border: none;
        }
        
        .table tbody tr {
            transition: all 0.2s ease;
        }
        
        .table tbody tr:hover {
            background: linear-gradient(90deg, var(--soft-white) 0%, #f1f5f9 100%);
            transform: scale(1.01);
        }
        
        .badge {
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.85rem;
        }
        
        .badge.bg-success {
            background: linear-gradient(135deg, var(--success-green) 0%, #10b981 100%) !important;
        }
        
        .badge.bg-info {
            background: linear-gradient(135deg, var(--info-blue) 0%, #0ea5e9 100%) !important;
        }
        
        .badge.bg-warning {
            background: linear-gradient(135deg, var(--warning-amber) 0%, #f59e0b 100%) !important;
        }
        
        .badge.bg-danger {
            background: linear-gradient(135deg, var(--danger-red) 0%, #ef4444 100%) !important;
        }
        
        .card {
            background: white;
            border: 1px solid var(--light-gray);
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(26, 35, 50, 0.08);
        }
        
        .card-header {
            background: linear-gradient(135deg, var(--elegant-gray) 0%, var(--secondary-navy) 100%);
            color: white;
            border-radius: 12px 12px 0 0 !important;
            padding: 16px 20px;
            font-weight: 600;
        }
        
        .form-control, .form-select {
            border: 2px solid var(--light-gray);
            background: var(--soft-white);
            border-radius: 8px;
            padding: 10px 16px;
            transition: all 0.3s ease;
        }
        
        .form-control:focus, .form-select:focus {
            border-color: var(--accent-gold);
            box-shadow: 0 0 0 0.25rem rgba(212, 175, 55, 0.15);
            background: white;
        }
        
        .modal-content {
            border-radius: 16px;
            border: none;
            box-shadow: 0 20px 60px rgba(26, 35, 50, 0.3);
        }
        
        .modal-header {
            background: linear-gradient(135deg, var(--primary-navy) 0%, var(--secondary-navy) 100%);
            color: white;
            border-radius: 16px 16px 0 0;
            padding: 20px 24px;
            border-bottom: 3px solid var(--accent-gold);
        }
        
        .modal-title {
            font-weight: 700;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: var(--primary-navy);
            font-weight: 700;
        }
        
        .text-muted {
            color: var(--elegant-gray) !important;
        }
        
        /* Scrollbar personalizado */
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }
        
        ::-webkit-scrollbar-track {
            background: var(--light-gray);
            border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%);
            border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, var(--accent-gold-light) 0%, var(--accent-gold) 100%);
        }

/* Asegurar que el contenido de los tabs sea visible */
.tab-content {
    display: block !important;
    visibility: visible !important;
}

.tab-pane {
    display: none;
}

.tab-pane.active {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
}

/* Asegurar que las tablas DataTables sean visibles */
.dataTables_wrapper {
    display: block !important;
    visibility: visible !important;
}

table.dataTable {
    display: table !important;
    visibility: visible !important;
    width: 100% !important;
}

table.dataTable tbody {
    display: table-row-group !important;
}

table.dataTable tbody tr {
    display: table-row !important;
}

table.dataTable tbody td {
    display: table-cell !important;
}

/* Asegurar que los grids de combos sean visibles */
#combosGrid {
    display: flex !important;
    flex-wrap: wrap !important;
    visibility: visible !important;
}

/* Asegurar que los contenedores sean visibles */
.card, .table-responsive {
    display: block !important;
    visibility: visible !important;
}

    </style>
</head>
<body>
   

 <nav class="navbar navbar-expand-lg mb-4">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="index.php">
                <i class="bi bi-building"></i> <?php echo APP_NAME; ?>
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>

<div class="collapse navbar-collapse" id="navbarNav">
    <ul class="navbar-nav ms-auto">
        <li class="nav-item d-flex align-items-center">
            <span class="navbar-text me-3 fs-4">
                <i class="bi bi-calendar"></i> <?php echo date('d/m/Y H:i'); ?>
            </span>
            <a href="api/Consulta.php">
                <img src="assets/CONSULTA.png" alt="Imagen de Consulta" width="60">
            </a>
            <a href="api/herramientas.php" class="ms-2">
                <img src="assets/Herramientas.png" alt="Imagen de Herramientas" width="60">
            </a>
        </li>
    </ul>
</div>

</div>
        </div>

    </nav>   

  <div class="container-fluid px-4">
    <div class="mb-4 d-flex align-items-center justify-content-center">
        <h1 class="display-4 fw-bold text-dark mb-2 me-3" style="font-size: 3.5rem;">Servicios y Mantenimientos Técnicos Eléctricos</h1>
        <img src="assets/js/logo.png" alt="Logo de Servicios y Mantenimientos Técnicos Eléctricos" class="img-fluid" style="max-width: 200px; height: auto;">
    </div>
</div>
           
        <!-- Tabs de Navegación - ORDEN ACTUALIZADO -->
        <ul class="nav nav-tabs mb-3" id="mainTabs" role="tablist">
            <li class="nav-item">
                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#dashboard">
                    <i class="bi bi-speedometer2"></i> Dashboard
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#inventory">
                    <i class="bi bi-boxes"></i> Inventario
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#products">
                    <i class="bi bi-box-seam"></i> Productos
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#clients">
                    <i class="bi bi-people"></i> Clientes
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#combos">
                    <i class="bi bi-camera"></i> Combos
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#combo-quotes">
                    <i class="bi bi-camera-video"></i> Combos Cotizaciones
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#quotes">
                    <i class="bi bi-file-earmark-text"></i> Cotizaciones
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#pending-quotes">
                    <i class="bi bi-hourglass-split"></i> Cotizaciones Pendientes
                </button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#invoices">
                    <i class="bi bi-receipt"></i> Facturación
                </button>
            </li>
        </ul>

        
        <!-- Dashboard Tab - CORREGIDO CON IDs PARA ACTUALIZACIÓN DINÁMICA -->
<div class="tab-pane fade show active" id="dashboard">
    <!-- Tarjetas de Estadísticas -->
    <div class="row g-4 mb-4">
        <div class="col-md-3">
            <div class="card stat-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <p class="text-muted mb-1">Total Productos</p>
                            <!-- ✅ AGREGADO: id="totalProducts" -->
                            <h3 class="fw-bold mb-0" id="totalProducts"><?php echo $stats['total_products']; ?></h3>
                            <small class="text-muted">productos registrados</small>
                        </div>
                        <div class="stat-icon">
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
                            <p class="text-muted mb-1">Clientes</p>
                            <!-- ✅ AGREGADO: id="totalClients" -->
                            <h3 class="fw-bold mb-0" id="totalClients"><?php echo $stats['total_clients']; ?></h3>
                            <small class="text-muted">clientes registrados</small>
                        </div>
                        <div class="stat-icon">
                            <i class="bi bi-people"></i>
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
                            <p class="text-muted mb-1">Cotizaciones</p>
                            <!-- ✅ AGREGADO: id="totalQuotes" -->
                            <h3 class="fw-bold mb-0" id="totalQuotes"><?php echo $stats['total_quotes']; ?></h3>
                            <small class="text-muted">cotizaciones generadas</small>
                        </div>
                        <div class="stat-icon">
                            <i class="bi bi-file-earmark-text"></i>
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
                            <!-- ✅ AGREGADO: id="lowStock" -->
                            <h3 class="fw-bold mb-0 text-danger" id="lowStock"><?php echo $stats['low_stock_products']; ?></h3>
                            <small class="text-muted">productos con stock < 10</small>
                        </div>
                        <div class="stat-icon bg-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ✅ OPCIONAL: Sección de actividad reciente -->
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <i class="bi bi-clock-history"></i> Actividad Reciente
                </div>
                <div class="card-body">
                    <p class="text-muted mb-0">
                        <i class="bi bi-info-circle"></i> 
                        Las estadísticas se actualizan automáticamente al realizar operaciones en el sistema.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>

            <!-- Inventario Tab -->
            <div class="tab-pane fade" id="inventory">
                <?php include 'views/inventory.php'; ?>
            </div>

            <!-- Productos Tab -->
            <div class="tab-pane fade" id="products">
                <?php include 'views/products.php'; ?>
            </div>

            <!-- Clientes Tab -->
            <div class="tab-pane fade" id="clients">
                <?php include 'views/clients.php'; ?>
            </div>

            <!-- Combos Tab -->
            <div class="tab-pane fade" id="combos">
                <?php include 'views/combos.php'; ?>
            </div>

            <!-- Cotizaciones de Combos Tab -->
            <div class="tab-pane fade" id="combo-quotes">
                <?php include 'views/combo_quotes.php'; ?>
            </div>

            <!-- Cotizaciones Tab -->
            <div class="tab-pane fade" id="quotes">
                <?php include 'views/quotes.php'; ?>
            </div>

            <!-- Cotizaciones Pendientes Tab -->
            <div class="tab-pane fade" id="pending-quotes">
                <?php include 'views/pending_quotes.php'; ?>
            </div>

            <!-- Facturación Tab -->
            <div class="tab-pane fade" id="invoices">
                <?php include 'views/invoices.php'; ?>
            </div>

        </div>
    </div>

<!-- ========================================== -->
<!-- SCRIPTS - ORDEN CRÍTICO -->
<!-- ========================================== -->

<!-- 1. jQuery PRIMERO (obligatorio) -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

<!-- 2. Bootstrap (requiere jQuery) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- jsPDF y autoTable -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>

<!-- 3. SweetAlert2 -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<!-- 4. DataTables (requiere jQuery) -->
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>

<!-- 5. Tu main.js AL FINAL (RUTA RELATIVA) -->
<script src="assets/js/main.js"></script>

<!-- Verificación de carga -->
<script>
if (typeof $ === 'undefined') {
    console.error('❌ jQuery NO está cargado');
    alert('ERROR: jQuery no se cargó correctamente. Verifica tu conexión a internet.');
} else {
    console.log("✅ jQuery cargado correctamente, versión:", $.fn.jquery);
}
</script>

</body>
</html>