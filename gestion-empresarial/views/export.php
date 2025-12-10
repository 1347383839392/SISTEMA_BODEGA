<?php
/**
 * Vista de Exportación de Base de Datos
 * Sistema de Gestión Empresarial
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exportar Base de Datos - Sistema de Gestión Empresarial</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
        }
        
        .export-card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(26, 35, 50, 0.1);
            overflow: hidden;
        }
        
        .card-header {
            background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%);
            border: none;
            padding: 25px;
        }
        
        .export-icon {
            font-size: 4rem;
            color: #d4af37;
            margin-bottom: 20px;
        }
        
        .info-box {
            background: #f8f9fa;
            border-left: 4px solid #d4af37;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .table-list {
            max-height: 300px;
            overflow-y: auto;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
        }
        
        .table-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .table-item:last-child {
            border-bottom: none;
        }
        
        .table-item i {
            color: #d4af37;
            margin-right: 10px;
        }
        
        .btn-export {
            background: linear-gradient(135deg, #d4af37 0%, #e8c968 100%);
            border: none;
            padding: 15px 40px;
            border-radius: 10px;
            color: #1a2332;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }
        
        .btn-export:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);
            color: #1a2332;
        }
        
        .btn-export:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .loading-spinner {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .success-message {
            display: none;
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .error-message {
            display: none;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="export-card">
                    <div class="card-header text-white">
                        <h4 class="mb-0">
                            <i class="fas fa-download me-2"></i>
                            Exportar Base de Datos
                        </h4>
                    </div>
                    <div class="card-body p-4">
                        <!-- Icono principal -->
                        <div class="text-center">
                            <i class="fas fa-database export-icon"></i>
                        </div>
                        
                        <!-- Información importante -->
                        <div class="info-box">
                            <h6><i class="fas fa-info-circle me-2"></i>Información de Exportación:</h6>
                            <ul class="mb-0">
                                <li>Se exportarán <strong>todas las tablas</strong> del sistema</li>
                                <li>El archivo incluirá la <strong>estructura y datos</strong> completos</li>
                                <li>Formato: <strong>SQL</strong> compatible con MySQL/MariaDB</li>
                                <li>El archivo se descargará automáticamente</li>
                            </ul>
                        </div>
                        
                        <!-- Lista de tablas a exportar -->
                        <div class="mb-4">
                            <h6 class="mb-3"><i class="fas fa-list me-2"></i>Tablas que se exportarán:</h6>
                            <div class="table-list">
                                <div class="table-item">
                                    <i class="fas fa-users"></i>
                                    <span><strong>clients</strong> - Clientes del sistema</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-box"></i>
                                    <span><strong>products</strong> - Productos y servicios</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-file-invoice"></i>
                                    <span><strong>quotes</strong> - Cotizaciones</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-list-ul"></i>
                                    <span><strong>quote_items</strong> - Items de cotizaciones</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-layer-group"></i>
                                    <span><strong>combos</strong> - Combos de productos</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-cubes"></i>
                                    <span><strong>combo_products</strong> - Productos en combos</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-file-alt"></i>
                                    <span><strong>combo_quotes</strong> - Cotizaciones de combos</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-clipboard-list"></i>
                                    <span><strong>combo_quote_items</strong> - Items de cotizaciones de combos</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-warehouse"></i>
                                    <span><strong>inventory</strong> - Inventario</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-exchange-alt"></i>
                                    <span><strong>inventory_movements</strong> - Movimientos de inventario</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-receipt"></i>
                                    <span><strong>invoices</strong> - Facturas</span>
                                </div>
                                <div class="table-item">
                                    <i class="fas fa-calculator"></i>
                                    <span><strong>counters</strong> - Contadores del sistema</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Botón de exportación -->
                        <div class="text-center">
                            <button type="button" class="btn btn-export" id="exportBtn" onclick="exportDatabase()">
                                <i class="fas fa-download me-2"></i>
                                Exportar Base de Datos Completa
                            </button>
                        </div>
                        
                        <!-- Spinner de carga -->
                        <div class="loading-spinner" id="loadingSpinner">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Exportando...</span>
                            </div>
                            <p class="mt-3">Generando respaldo de la base de datos...</p>
                            <small class="text-muted">Esto puede tomar unos momentos dependiendo del tamaño de los datos</small>
                        </div>
                        
                        <!-- Mensaje de éxito -->
                        <div class="success-message" id="successMessage">
                            <i class="fas fa-check-circle me-2"></i>
                            <strong>¡Exportación exitosa!</strong>
                            <p class="mb-0 mt-2">El archivo de respaldo se ha descargado correctamente.</p>
                        </div>
                        
                        <!-- Mensaje de error -->
                        <div class="error-message" id="errorMessage">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Error en la exportación</strong>
                            <p class="mb-0 mt-2" id="errorText"></p>
                        </div>
                    </div>
                </div>
                
                <!-- Botones de navegación -->
                <div class="text-center mt-4">
                    <a href="../api/herramientas.php" class="btn btn-outline-primary">
                        <i class="fas fa-home me-2"></i>Volver al Inicio
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function exportDatabase() {
            const exportBtn = document.getElementById('exportBtn');
            const loadingSpinner = document.getElementById('loadingSpinner');
            const successMessage = document.getElementById('successMessage');
            const errorMessage = document.getElementById('errorMessage');
            
            // Deshabilitar botón y mostrar spinner
            exportBtn.disabled = true;
            loadingSpinner.style.display = 'block';
            successMessage.style.display = 'none';
            errorMessage.style.display = 'none';
            
            // Crear un iframe oculto para la descarga
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = '../api/export.php';
            document.body.appendChild(iframe);
            
            // Simular tiempo de procesamiento y mostrar resultado
            setTimeout(() => {
                loadingSpinner.style.display = 'none';
                successMessage.style.display = 'block';
                exportBtn.disabled = false;
                
                // Remover iframe después de la descarga
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 2000);
            }, 2000);
            
            // Manejar errores
            iframe.onerror = function() {
                loadingSpinner.style.display = 'none';
                errorMessage.style.display = 'block';
                document.getElementById('errorText').textContent = 'No se pudo generar el archivo de exportación. Por favor, intente nuevamente.';
                exportBtn.disabled = false;
                document.body.removeChild(iframe);
            };
        }
    </script>
</body>
</html>