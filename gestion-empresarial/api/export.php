<?php
/**
 * API de Exportación
 * Genera un respaldo SQL completo de toda la base de datos
 * Sistema de Gestión Empresarial
 */

require_once __DIR__ . '/../config.php';

// Configurar límites para archivos grandes
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);

try {
    // Permitir método GET para descargas
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse([
            'success' => false,
            'error' => 'Método no permitido. Use GET o POST.'
        ], 405);
    }
    
    $db = getDB();
    
    // Nombre del archivo con timestamp
    $filename = 'backup-gestion-empresarial-' . date('Y-m-d-H-i-s') . '.sql';
    
    // Headers para descarga
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: 0');
    
    // Iniciar output con información del respaldo
    $output = "-- ============================================\n";
    $output .= "-- RESPALDO COMPLETO DE BASE DE DATOS\n";
    $output .= "-- Sistema de Gestión Empresarial\n";
    $output .= "-- Base de datos: " . DB_NAME . "\n";
    $output .= "-- Fecha de exportación: " . date('Y-m-d H:i:s') . "\n";
    $output .= "-- Servidor: " . DB_HOST . "\n";
    $output .= "-- ============================================\n\n";
    
    $output .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
    $output .= "START TRANSACTION;\n";
    $output .= "SET time_zone = \"+00:00\";\n\n";
    
    $output .= "/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n";
    $output .= "/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n";
    $output .= "/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n";
    $output .= "/*!40101 SET NAMES utf8mb4 */;\n\n";
    
    $output .= "-- Deshabilitar verificación de claves foráneas\n";
    $output .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
    
    // Tablas a exportar en el orden correcto por dependencias
    $tables = [
        'clients',
        'products',
        'counters',
        'quotes',
        'quote_items',
        'combos',
        'combo_products',
        'combo_quotes',
        'combo_quote_items',
        'inventory',
        'inventory_movements',
        'invoices'
    ];
    
    // Estadísticas de exportación
    $stats = [
        'total_tables' => 0,
        'total_records' => 0,
        'tables_exported' => []
    ];
    
    foreach ($tables as $table) {
        try {
            // Verificar si la tabla existe
            $check = $db->query("SHOW TABLES LIKE '$table'")->fetch();
            if (!$check) {
                continue; // Saltar si la tabla no existe
            }
            
            $output .= "-- ============================================\n";
            $output .= "-- Tabla: $table\n";
            $output .= "-- ============================================\n\n";
            
            // Obtener estructura de la tabla
            $create_table = $db->query("SHOW CREATE TABLE `$table`")->fetch();
            if ($create_table) {
                $output .= "DROP TABLE IF EXISTS `$table`;\n";
                $output .= $create_table['Create Table'] . ";\n\n";
            }
            
            // Obtener datos de la tabla
            $stmt = $db->query("SELECT * FROM `$table`");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $record_count = count($rows);
            $stats['total_records'] += $record_count;
            
            if ($record_count > 0) {
                $output .= "-- Volcado de datos para la tabla `$table`\n";
                $output .= "-- Registros: $record_count\n\n";
                
                // Obtener nombres de columnas
                $columns = array_keys($rows[0]);
                $columnNames = '`' . implode('`, `', $columns) . '`';
                
                // Agrupar inserts para mejor rendimiento (cada 100 registros)
                $batch_size = 100;
                $batch_count = 0;
                $insert_values = [];
                
                foreach ($rows as $row) {
                    $values = array_map(function($value) use ($db) {
                        if ($value === null) {
                            return 'NULL';
                        }
                        return $db->quote($value);
                    }, array_values($row));
                    
                    $insert_values[] = '(' . implode(', ', $values) . ')';
                    $batch_count++;
                    
                    // Escribir batch cuando alcance el tamaño o sea el último registro
                    if ($batch_count >= $batch_size || $row === end($rows)) {
                        $output .= "INSERT INTO `$table` ($columnNames) VALUES\n";
                        $output .= implode(",\n", $insert_values) . ";\n\n";
                        
                        // Resetear para el siguiente batch
                        $insert_values = [];
                        $batch_count = 0;
                    }
                }
            } else {
                $output .= "-- Sin datos para exportar en la tabla `$table`\n\n";
            }
            
            $stats['total_tables']++;
            $stats['tables_exported'][] = [
                'name' => $table,
                'records' => $record_count
            ];
            
        } catch (Exception $e) {
            error_log("Error exportando tabla $table: " . $e->getMessage());
            $output .= "-- Error al exportar tabla $table: " . $e->getMessage() . "\n\n";
        }
    }
    
    // Rehabilitar verificación de claves foráneas
    $output .= "-- Rehabilitar verificación de claves foráneas\n";
    $output .= "SET FOREIGN_KEY_CHECKS=1;\n";
    $output .= "COMMIT;\n\n";
    
    $output .= "/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n";
    $output .= "/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n";
    $output .= "/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n\n";
    
    // Agregar estadísticas al final del archivo
    $output .= "-- ============================================\n";
    $output .= "-- ESTADÍSTICAS DE EXPORTACIÓN\n";
    $output .= "-- ============================================\n";
    $output .= "-- Total de tablas exportadas: " . $stats['total_tables'] . "\n";
    $output .= "-- Total de registros exportados: " . $stats['total_records'] . "\n";
    $output .= "-- Detalles por tabla:\n";
    foreach ($stats['tables_exported'] as $table_stat) {
        $output .= "--   - " . $table_stat['name'] . ": " . $table_stat['records'] . " registros\n";
    }
    $output .= "-- ============================================\n";
    $output .= "-- FIN DEL RESPALDO\n";
    $output .= "-- ============================================\n";
    
    // Enviar el archivo
    echo $output;
    
} catch (Exception $e) {
    error_log("Error crítico en export.php: " . $e->getMessage());
    http_response_code(500);
    
    // Limpiar headers si ya se enviaron
    if (!headers_sent()) {
        header('Content-Type: text/plain');
    }
    
    echo "-- ============================================\n";
    echo "-- ERROR AL GENERAR RESPALDO\n";
    echo "-- ============================================\n";
    echo "-- Error: " . $e->getMessage() . "\n";
    echo "-- Archivo: " . $e->getFile() . "\n";
    echo "-- Línea: " . $e->getLine() . "\n";
    echo "-- ============================================\n";
}
?>