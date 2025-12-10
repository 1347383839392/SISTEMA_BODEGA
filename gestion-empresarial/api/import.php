<?php
/**
 * API de Importación
 * Importa un respaldo SQL completo de la base de datos
 * Sistema de Gestión Empresarial
 */

require_once __DIR__ . '/../config.php';

// Configurar límites para archivos grandes
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);
ini_set('upload_max_filesize', '50M');
ini_set('post_max_size', '50M');

try {
    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse([
            'success' => false,
            'error' => 'Método no permitido. Use POST.'
        ], 405);
    }

    // Verificar si se subió un archivo
    if (!isset($_FILES['sql_file']) || $_FILES['sql_file']['error'] !== UPLOAD_ERR_OK) {
        $error_messages = [
            UPLOAD_ERR_INI_SIZE => 'El archivo excede el tamaño máximo permitido por el servidor',
            UPLOAD_ERR_FORM_SIZE => 'El archivo excede el tamaño máximo del formulario',
            UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
            UPLOAD_ERR_NO_FILE => 'No se seleccionó ningún archivo',
            UPLOAD_ERR_NO_TMP_DIR => 'Falta la carpeta temporal',
            UPLOAD_ERR_CANT_WRITE => 'Error al escribir el archivo en disco',
            UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida del archivo'
        ];
        
        $error_code = $_FILES['sql_file']['error'] ?? UPLOAD_ERR_NO_FILE;
        $error_message = $error_messages[$error_code] ?? 'Error desconocido al subir el archivo';
        
        jsonResponse([
            'success' => false,
            'error' => $error_message
        ], 400);
    }

    $file = $_FILES['sql_file'];
    
    // Validar extensión del archivo
    $allowed_extensions = ['sql', 'txt'];
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($file_extension, $allowed_extensions)) {
        jsonResponse([
            'success' => false,
            'error' => 'Tipo de archivo no válido. Solo se permiten archivos .sql o .txt'
        ], 400);
    }

    // Validar tamaño del archivo (máximo 50MB)
    $max_size = 50 * 1024 * 1024; // 50MB
    if ($file['size'] > $max_size) {
        jsonResponse([
            'success' => false,
            'error' => 'El archivo es demasiado grande. Tamaño máximo: 50MB'
        ], 400);
    }

    // Leer contenido del archivo
    $sql_content = file_get_contents($file['tmp_name']);
    
    if ($sql_content === false) {
        jsonResponse([
            'success' => false,
            'error' => 'No se pudo leer el contenido del archivo'
        ], 500);
    }

    // Validar que el contenido no esté vacío
    if (empty(trim($sql_content))) {
        jsonResponse([
            'success' => false,
            'error' => 'El archivo está vacío o no contiene datos válidos'
        ], 400);
    }

    // Obtener conexión a la base de datos
    $db = getDB();
    
    // Iniciar transacción para asegurar integridad
    $db->beginTransaction();
    
    try {
        // Deshabilitar verificación de claves foráneas temporalmente
        $db->exec("SET FOREIGN_KEY_CHECKS=0");
        
        // Limpiar el contenido SQL
        $sql_content = preg_replace('/--.*$/m', '', $sql_content); // Eliminar comentarios de línea
        $sql_content = preg_replace('/\\/\\*.*?\\*\\//s', '', $sql_content); // Eliminar comentarios de bloque
        
        // Dividir en declaraciones individuales de forma segura
        $statements = splitSqlStatements($sql_content);
        
        $executed_count = 0;
        $errors = [];
        
        foreach ($statements as $statement) {
            $statement = trim($statement);
            
            // Saltar declaraciones vacías
            if (empty($statement)) {
                continue;
            }
            
            // Saltar declaraciones de configuración que pueden causar problemas
            if (preg_match('/^(SET|START TRANSACTION|COMMIT)/i', $statement)) {
                continue;
            }
            
            try {
                $db->exec($statement);
                $executed_count++;
            } catch (PDOException $e) {
                // Registrar error pero continuar con las demás declaraciones
                $errors[] = [
                    'statement' => substr($statement, 0, 100) . '...',
                    'error' => $e->getMessage()
                ];
                
                // Si hay demasiados errores, abortar
                if (count($errors) > 10) {
                    throw new Exception('Demasiados errores durante la importación. Proceso abortado.');
                }
            }
        }
        
        // Rehabilitar verificación de claves foráneas
        $db->exec("SET FOREIGN_KEY_CHECKS=1");
        
        // Verificar integridad de la base de datos después de la importación
        $integrity_check = $db->query("SELECT COUNT(*) as total FROM clients")->fetch();
        
        if ($integrity_check === false) {
            throw new Exception('Error al verificar la integridad de la base de datos');
        }
        
        // Confirmar transacción solo si está activa
        if ($db && $db->inTransaction()) {
            $db->commit();
        }
        
        // Respuesta de éxito
        $response = [
            'success' => true,
            'message' => 'Base de datos importada exitosamente',
            'statistics' => [
                'executed_statements' => $executed_count,
                'errors_count' => count($errors),
                'file_size' => formatBytes($file['size']),
                'import_time' => date('Y-m-d H:i:s')
            ]
        ];
        
        // Incluir errores si los hay, pero no como falla crítica
        if (!empty($errors)) {
            $response['warnings'] = [
                'message' => 'Se encontraron algunos errores menores durante la importación',
                'errors' => array_slice($errors, 0, 5) // Solo mostrar los primeros 5 errores
            ];
        }
        
        jsonResponse($response);
        
    } catch (Exception $e) {
        // Revertir transacción en caso de error
        if ($db && $db->inTransaction()) {
            $db->rollback();
        }
        
        // Rehabilitar verificación de claves foráneas
        try {
            if ($db) {
                $db->exec("SET FOREIGN_KEY_CHECKS=1");
            }
        } catch (Exception $cleanup_error) {
            error_log("Error al rehabilitar FOREIGN_KEY_CHECKS: " . $cleanup_error->getMessage());
        }
        
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error en import.php: " . $e->getMessage());
    
    jsonResponse([
        'success' => false,
        'error' => 'Error durante la importación: ' . $e->getMessage(),
        'details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ], 500);
}

/**
 * Splits a string of SQL statements into an array of individual statements.
 */
function splitSqlStatements($sql) {
    $statements = [];
    $statement = '';
    $in_string = false;
    $string_char = '';

    for ($i = 0; $i < strlen($sql); $i++) {
        $char = $sql[$i];
        
        if ($in_string) {
            if ($char === $string_char) {
                // Check for escaped quote like \'
                if ($i > 0 && $sql[$i - 1] === '\\') {
                    // It's an escaped quote, so we are still inside the string
                } else {
                    $in_string = false;
                }
            }
        } else {
            if ($char === '\'' || $char === '"') {
                $in_string = true;
                $string_char = $char;
            } elseif ($char === ';') {
                if (trim($statement)) {
                    $statements[] = $statement;
                }
                $statement = '';
                continue; // Skip adding the semicolon to the next statement
            }
        }
        $statement .= $char;
    }

    if (trim($statement)) {
        $statements[] = $statement;
    }

    return $statements;
}

/**
 * Formatear bytes a formato legible
 */
function formatBytes($bytes, $precision = 2) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}

/**
 * Validar estructura de tabla esperada
 */
function validateTableStructure($db, $table_name, $expected_columns) {
    try {
        $stmt = $db->query("DESCRIBE `$table_name`");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($expected_columns as $expected_column) {
            if (!in_array($expected_column, $columns)) {
                return false;
            }
        }
        
        return true;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Limpiar y optimizar base de datos después de importación
 */
function optimizeDatabase($db) {
    try {
        // Tablas principales del sistema
        $tables = [
            'clients', 'products', 'quotes', 'quote_items', 
            'combos', 'combo_products', 'combo_quotes', 'combo_quote_items',
            'inventory', 'inventory_movements', 'invoices', 'counters'
        ];
        
        foreach ($tables as $table) {
            $db->exec("OPTIMIZE TABLE `$table`");
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error optimizando base de datos: " . $e->getMessage());
        return false;
    }
}
?>