<?php
/**
 * Utilidades de Base de Datos
 * Funciones auxiliares para importación/exportación
 * Sistema de Gestión Empresarial
 */

require_once __DIR__ . '/../config.php';

/**
 * Verificar integridad de la base de datos
 */
function checkDatabaseIntegrity() {
    try {
        $db = getDB();
        $issues = [];
        
        // Verificar tablas principales
        $required_tables = [
            'clients', 'products', 'quotes', 'quote_items',
            'combos', 'combo_products', 'combo_quotes', 'combo_quote_items',
            'inventory', 'inventory_movements', 'invoices', 'counters'
        ];
        
        foreach ($required_tables as $table) {
            $stmt = $db->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() == 0) {
                $issues[] = "Tabla faltante: $table";
            }
        }
        
        // Verificar integridad referencial
        $integrity_checks = [
            "SELECT COUNT(*) as count FROM quotes q LEFT JOIN clients c ON q.client_id = c.id WHERE c.id IS NULL" => "Cotizaciones con clientes inexistentes",
            "SELECT COUNT(*) as count FROM quote_items qi LEFT JOIN quotes q ON qi.quote_id = q.id WHERE q.id IS NULL" => "Items de cotización huérfanos",
            "SELECT COUNT(*) as count FROM quote_items qi LEFT JOIN products p ON qi.product_id = p.id WHERE qi.product_id IS NOT NULL AND p.id IS NULL" => "Items con productos inexistentes",
            "SELECT COUNT(*) as count FROM invoices i LEFT JOIN quotes q ON i.quote_id = q.id WHERE q.id IS NULL" => "Facturas con cotizaciones inexistentes"
        ];
        
        foreach ($integrity_checks as $query => $description) {
            $result = $db->query($query)->fetch();
            if ($result['count'] > 0) {
                $issues[] = "$description: {$result['count']} registros";
            }
        }
        
        return [
            'success' => empty($issues),
            'issues' => $issues,
            'message' => empty($issues) ? 'Base de datos íntegra' : 'Se encontraron problemas de integridad'
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'issues' => ['Error al verificar integridad: ' . $e->getMessage()],
            'message' => 'Error durante la verificación'
        ];
    }
}

/**
 * Reparar problemas comunes de integridad
 */
function repairDatabaseIntegrity() {
    try {
        $db = getDB();
        $db->beginTransaction();
        
        $repairs = [];
        
        // Eliminar registros huérfanos
        $orphan_queries = [
            "DELETE qi FROM quote_items qi LEFT JOIN quotes q ON qi.quote_id = q.id WHERE q.id IS NULL" => "Items de cotización huérfanos eliminados",
            "DELETE qi FROM quote_items qi LEFT JOIN products p ON qi.product_id = p.id WHERE qi.product_id IS NOT NULL AND p.id IS NULL" => "Items con productos inexistentes eliminados",
            "DELETE i FROM invoices i LEFT JOIN quotes q ON i.quote_id = q.id WHERE q.id IS NULL" => "Facturas huérfanas eliminadas"
        ];
        
        foreach ($orphan_queries as $query => $description) {
            $stmt = $db->prepare($query);
            $stmt->execute();
            $affected = $stmt->rowCount();
            if ($affected > 0) {
                $repairs[] = "$description: $affected registros";
            }
        }
        
        // Recalcular totales de cotizaciones
        $db->exec("
            UPDATE quotes q SET total = (
                SELECT COALESCE(SUM(qi.total), 0) 
                FROM quote_items qi 
                WHERE qi.quote_id = q.id
            )
        ");
        $repairs[] = "Totales de cotizaciones recalculados";
        
        // Verificar y corregir contadores
        $counters = ['MO', 'MA', 'invoices', 'combo_quotes'];
        foreach ($counters as $counter) {
            $stmt = $db->prepare("INSERT IGNORE INTO counters (counter_name, counter_value) VALUES (?, 0)");
            $stmt->execute([$counter]);
        }
        $repairs[] = "Contadores verificados";
        
        $db->commit();
        
        return [
            'success' => true,
            'repairs' => $repairs,
            'message' => 'Reparaciones completadas exitosamente'
        ];
        
    } catch (Exception $e) {
        $db->rollback();
        return [
            'success' => false,
            'repairs' => [],
            'message' => 'Error durante las reparaciones: ' . $e->getMessage()
        ];
    }
}

/**
 * Obtener estadísticas de la base de datos
 */
function getDatabaseStats() {
    try {
        $db = getDB();
        
        $stats = [];
        
        // Contadores por tabla
        $tables = [
            'clients' => 'Clientes',
            'products' => 'Productos',
            'quotes' => 'Cotizaciones',
            'quote_items' => 'Items de Cotización',
            'combos' => 'Combos',
            'invoices' => 'Facturas',
            'inventory_movements' => 'Movimientos de Inventario'
        ];
        
        foreach ($tables as $table => $label) {
            $result = $db->query("SELECT COUNT(*) as count FROM $table")->fetch();
            $stats['counts'][$label] = $result['count'];
        }
        
        // Estadísticas adicionales
        $additional_stats = [
            "SELECT COUNT(*) as count FROM quotes WHERE status = 'pending'" => "Cotizaciones Pendientes",
            "SELECT COUNT(*) as count FROM products WHERE stock < min_stock" => "Productos con Stock Bajo",
            "SELECT COALESCE(SUM(total), 0) as total FROM quotes WHERE status = 'pending'" => "Valor Total Cotizaciones Pendientes",
            "SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE DATE(created_at) = CURDATE()" => "Ventas del Día"
        ];
        
        foreach ($additional_stats as $query => $label) {
            $result = $db->query($query)->fetch();
            $key = array_key_first($result);
            $stats['additional'][$label] = $result[$key];
        }
        
        // Información del sistema
        $db_size = $db->query("
            SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS db_size_mb
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        ")->fetch();
        
        $stats['system'] = [
            'database_size' => ($db_size['db_size_mb'] ?? 0) . ' MB',
            'last_check' => date('Y-m-d H:i:s')
        ];
        
        return [
            'success' => true,
            'stats' => $stats
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
        ];
    }
}

// Manejo de peticiones AJAX
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'check_integrity':
            jsonResponse(checkDatabaseIntegrity());
            break;
            
        case 'repair_integrity':
            jsonResponse(repairDatabaseIntegrity());
            break;
            
        case 'get_stats':
            jsonResponse(getDatabaseStats());
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Acción no válida'
            ], 400);
    }
}
?>