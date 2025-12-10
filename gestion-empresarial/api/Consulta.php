<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CONSULTA - Soporte y Desarrollo</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
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
            margin-bottom: 30px;
            border-left: 4px solid #d4af37;
        }
        
        .header-title {
            color: #f8fafc;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .image-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(26, 35, 50, 0.1);
            transition: all 0.3s ease;
            border: 2px solid #e2e8f0;
        }
        
        .image-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(26, 35, 50, 0.15);
            border-color: #d4af37;
        }
        
        .image-card img {
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
    
    <!-- Encabezado con imagen OP.png -->
    <div class="header-section">
        <div class="d-flex align-items-center justify-content-between flex-wrap">
            <div class="d-flex align-items-center mb-3 mb-md-0">
                <img src="../assets/OP.png" alt="Soporte y desarrollo" class="img-fluid me-3" style="max-width: 150px; height: auto;">
                <h1 class="header-title mb-0" style="font-size: 2.5rem;">SOPORTE Y DESARROLLO</h1>
            </div>
        </div>
    </div>
    
    <!-- Contenedor para las imágenes 15 y 16 apiladas verticalmente -->
    <div class="row g-4">
        <div class="col-12 col-md-6">
            <div class="image-card">
               
                <div class="text-center">
                    <img src="../assets/15.png" alt="Información técnica 15" class="img-fluid" style="max-width: 100%; height: auto;">
                </div>
            </div>
        </div>
        
        <div class="col-12 col-md-6">
            <div class="image-card">
             
                <div class="text-center">
                    <img src="../assets/16.png" alt="Información técnica 16" class="img-fluid" style="max-width: 100%; height: auto;">
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<!-- Bootstrap Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">

</body>
</html>