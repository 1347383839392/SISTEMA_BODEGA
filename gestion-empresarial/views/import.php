<?php
/**
 * Vista de Importación de Base de Datos
 * Sistema de Gestión Empresarial
 */

// Verificar si hay sesión activa (opcional, ajustar según tu sistema de autenticación)
// session_start();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Importar Base de Datos - Sistema de Gestión Empresarial</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .upload-area {
            border: 2px dashed #007bff;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            background-color: #f8f9fa;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .upload-area:hover {
            border-color: #0056b3;
            background-color: #e3f2fd;
        }
        
        .upload-area.dragover {
            border-color: #28a745;
            background-color: #d4edda;
        }
        
        .file-info {
            display: none;
            margin-top: 15px;
            padding: 15px;
            background-color: #e9ecef;
            border-radius: 5px;
        }
        
        .progress-container {
            display: none;
            margin-top: 20px;
        }
        
        .result-container {
            display: none;
            margin-top: 20px;
        }
        
        .warning-list {
            max-height: 200px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card shadow">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">
                            <i class="fas fa-database me-2"></i>
                            Importar Base de Datos
                        </h4>
                    </div>
                    <div class="card-body">
                        <!-- Información importante -->
                        <div class="alert alert-warning" role="alert">
                            <h6><i class="fas fa-exclamation-triangle me-2"></i>Información Importante:</h6>
                            <ul class="mb-0">
                                <li>Solo archivos .sql o .txt son permitidos</li>
                                <li>Tamaño máximo: 50MB</li>
                                <li>Esta acción <strong>sobrescribirá</strong> todos los datos actuales</li>
                                <li>Se recomienda hacer un respaldo antes de importar</li>
                            </ul>
                        </div>

                        <!-- Formulario de importación -->
                        <form id="importForm" enctype="multipart/form-data">
                            <div class="upload-area" id="uploadArea">
                                <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                                <h5>Arrastra tu archivo SQL aquí</h5>
                                <p class="text-muted">o haz clic para seleccionar un archivo</p>
                                <input type="file" id="sqlFile" name="sql_file" accept=".sql,.txt" style="display: none;">
                            </div>
                            
                            <div class="file-info" id="fileInfo">
                                <h6><i class="fas fa-file me-2"></i>Archivo seleccionado:</h6>
                                <p id="fileName" class="mb-1"></p>
                                <small id="fileSize" class="text-muted"></small>
                            </div>
                            
                            <div class="progress-container" id="progressContainer">
                                <label class="form-label">Progreso de importación:</label>
                                <div class="progress">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                         role="progressbar" style="width: 0%"></div>
                                </div>
                                <small class="text-muted mt-2 d-block">Procesando archivo...</small>
                            </div>
                            
                            <div class="mt-4">
                                <button type="submit" class="btn btn-success btn-lg" id="importBtn" disabled>
                                    <i class="fas fa-upload me-2"></i>
                                    Importar Base de Datos
                                </button>
                                <button type="button" class="btn btn-secondary btn-lg ms-2" onclick="resetForm()">
                                    <i class="fas fa-redo me-2"></i>
                                    Reiniciar
                                </button>
                            </div>
                        </form>
                        
                        <!-- Resultado de la importación -->
                        <div class="result-container" id="resultContainer">
                            <div id="resultContent"></div>
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
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('sqlFile');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const importBtn = document.getElementById('importBtn');
        const importForm = document.getElementById('importForm');
        const progressContainer = document.getElementById('progressContainer');
        const resultContainer = document.getElementById('resultContainer');

        // Eventos de drag and drop
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);
        importForm.addEventListener('submit', handleImport);

        function handleDragOver(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelect();
            }
        }

        function handleFileSelect() {
            const file = fileInput.files[0];
            
            if (file) {
                // Validar extensión
                const allowedExtensions = ['sql', 'txt'];
                const fileExtension = file.name.split('.').pop().toLowerCase();
                
                if (!allowedExtensions.includes(fileExtension)) {
                    alert('Tipo de archivo no válido. Solo se permiten archivos .sql o .txt');
                    resetForm();
                    return;
                }
                
                // Validar tamaño (50MB)
                const maxSize = 50 * 1024 * 1024;
                if (file.size > maxSize) {
                    alert('El archivo es demasiado grande. Tamaño máximo: 50MB');
                    resetForm();
                    return;
                }
                
                // Mostrar información del archivo
                fileName.textContent = file.name;
                fileSize.textContent = formatBytes(file.size);
                fileInfo.style.display = 'block';
                importBtn.disabled = false;
                
                // Ocultar resultados previos
                resultContainer.style.display = 'none';
            }
        }

        function handleImport(e) {
            e.preventDefault();
            
            if (!fileInput.files[0]) {
                alert('Por favor selecciona un archivo');
                return;
            }
            
            // Confirmar acción
            if (!confirm('¿Estás seguro de que deseas importar esta base de datos? Esta acción sobrescribirá todos los datos actuales.')) {
                return;
            }
            
            // Mostrar progreso
            importBtn.disabled = true;
            progressContainer.style.display = 'block';
            resultContainer.style.display = 'none';
            
            // Crear FormData
            const formData = new FormData();
            formData.append('sql_file', fileInput.files[0]);
            
            // Realizar petición
            fetch('../api/import.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                progressContainer.style.display = 'none';
                showResult(data);
            })
            .catch(error => {
                progressContainer.style.display = 'none';
                showResult({
                    success: false,
                    error: 'Error de conexión: ' + error.message
                });
            })
            .finally(() => {
                importBtn.disabled = false;
            });
        }

        function showResult(data) {
            resultContainer.style.display = 'block';
            
            if (data.success) {
                let html = `
                    <div class="alert alert-success">
                        <h5><i class="fas fa-check-circle me-2"></i>¡Importación Exitosa!</h5>
                        <p>${data.message}</p>
                    </div>
                `;
                
                if (data.statistics) {
                    html += `
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">Estadísticas de Importación</h6>
                            </div>
                            <div class="card-body">
                                <ul class="list-unstyled mb-0">
                                    <li><strong>Declaraciones ejecutadas:</strong> ${data.statistics.executed_statements}</li>
                                    <li><strong>Errores encontrados:</strong> ${data.statistics.errors_count}</li>
                                    <li><strong>Tamaño del archivo:</strong> ${data.statistics.file_size}</li>
                                    <li><strong>Fecha de importación:</strong> ${data.statistics.import_time}</li>
                                </ul>
                            </div>
                        </div>
                    `;
                }
                
                if (data.warnings && data.warnings.errors.length > 0) {
                    html += `
                        <div class="alert alert-warning mt-3">
                            <h6><i class="fas fa-exclamation-triangle me-2"></i>Advertencias</h6>
                            <p>${data.warnings.message}</p>
                            <div class="warning-list">
                                ${data.warnings.errors.map(error => `
                                    <small class="d-block"><strong>SQL:</strong> ${error.statement}</small>
                                    <small class="d-block text-danger mb-2"><strong>Error:</strong> ${error.error}</small>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                
                document.getElementById('resultContent').innerHTML = html;
            } else {
                document.getElementById('resultContent').innerHTML = `
                    <div class="alert alert-danger">
                        <h5><i class="fas fa-times-circle me-2"></i>Error en la Importación</h5>
                        <p>${data.error}</p>
                        ${data.details ? `<small class="text-muted">Detalles técnicos: ${data.details.file}:${data.details.line}</small>` : ''}
                    </div>
                `;
            }
        }

        function resetForm() {
            fileInput.value = '';
            fileInfo.style.display = 'none';
            importBtn.disabled = true;
            progressContainer.style.display = 'none';
            resultContainer.style.display = 'none';
            uploadArea.classList.remove('dragover');
        }

        function formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }
    </script>
</body>
</html>