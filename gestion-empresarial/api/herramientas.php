<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Herramientas - Configuración de Base de Datos</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
        }
        
        .container-fluid {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header-section {
            background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 8px 24px rgba(26, 35, 50, 0.2);
            margin-bottom: 40px;
            border-left: 4px solid #d4af37;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .header-title {
            color: #f8fafc;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            margin: 0;
            font-size: 2.5rem;
        }
        
        .tool-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(26, 35, 50, 0.1);
            transition: all 0.3s ease;
            border: 2px solid #e2e8f0;
            text-align: center;
            height: 100%;
        }
        
        .tool-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 28px rgba(26, 35, 50, 0.15);
            border-color: #d4af37;
        }
        
        .tool-image {
            max-width: 400px;
            height: auto;
            margin-bottom: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }
        
        .tool-card:hover .tool-image {
            transform: scale(1.05);
        }
        
        .tool-description {
            color: #1a2332;
            font-size: 1rem;
            font-weight: 500;
            line-height: 1.6;
            margin-top: 15px;
        }
        
        .btn-back {
            background: linear-gradient(135deg, #d4af37 0%, #e8c968 100%);
            border: none;
            padding: 12px 28px;
            border-radius: 10px;
            color: #1a2332;
            font-weight: 600;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }
        
        .btn-back:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);
            color: #1a2332;
        }
        
        .tools-container {
            display: flex;
            gap: 30px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .tool-wrapper {
            flex: 1;
            min-width: 300px;
            max-width: 500px;
        }
    </style>
</head>
<body>

<!-- Contenedor Principal -->
<div class="container-fluid">
    <!-- Botón de regreso -->
    <div class="mb-4">
        <a href="../index.php" class="btn-back">
            <i class="bi bi-arrow-left"></i> Volver al Sistema
        </a>
    </div>
    
    <!-- Encabezado con imagen Herramientas.png -->
    <div class="header-section">
        <div class="header-content">
            <img src="../assets/Herramientas.png" alt="Herramientas" class="img-fluid" style="max-width: 120px; height: auto;">
            <h1 class="header-title">CONFIGURACIÓN DE BASE DE DATOS</h1>
        </div>
    </div>
    
    <!-- Contenedor de herramientas (imágenes 12 y 13 en la misma línea) -->
    <div class="tools-container">
        <!-- Herramienta 1: Exportar Base de Datos -->
        <div class="tool-wrapper">
            <div class="tool-card">
                <a href="../views/export.php">
                    <img src="../assets/12.jpg" alt="Exportar Base de Datos" class="tool-image">
                </a>
                <p class="tool-description">
                    EXPORTAR BASE DE DATOS PARA EL MANTENIMIENTO O MODIFICACIONES DEL SISTEMA
                </p>
            </div>
        </div>
        
        <!-- Herramienta 2: Importar Base de Datos -->
        <div class="tool-wrapper">
            <div class="tool-card">
                <a href="../views/import.php">
                    <img src="../assets/13.jpg" alt="Importar Base de Datos" class="tool-image">
                </a>
                <p class="tool-description">
                    IMPORTAR BASE DE DATOS PARA REINGRESAR LOS DATOS DE LA VERSIÓN ANTERIOR
                </p>
            </div>
        </div>
    </div>
</div>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

</body>
</html>