<?php
/**
 * API de Estadísticas Generales - CORREGIDO
 * Retorna estadísticas del sistema
 * ✅ NUEVO: Solo cuenta cotizaciones PENDIENTES (no facturadas)
 */

require_once __DIR__ . '/../config.php';

/**
 * Obtener estadísticas generales del sistema
 */
function getStats() {
    try {
        $db = getDB();
        
        $stats = [
            'total_products' => 0,
            'total_clients' => 0,
            'total_quotes' => 0, // ✅ Solo cotizaciones pendientes (normales + combos)
            'low_stock_products' => 0,
            'total_combos' => 0,
            'total_invoices' => 0
        ];
        
        // Total de productos
        try {
            $stmt = $db->query("SELECT COUNT(*) as total FROM products");
            $stats['total_products'] = (int)$stmt->fetch()['total'];
        } catch (Exception $e) {
            error_log("Error contando productos: " . $e->getMessage());
        }
        
        // Total de clientes
        try {
            $stmt = $db->query("SELECT COUNT(*) as total FROM clients");
            $stats['total_clients'] = (int)$stmt->fetch()['total'];
        } catch (Exception $e) {
            error_log("Error contando clientes: " . $e->getMessage());
        }
        
        // ✅ CORREGIDO: Total de cotizaciones PENDIENTES (normales + combos)
        try {
            $totalQuotesNormal = 0;
            $totalQuotesCombos = 0;
            
            // Contar cotizaciones normales PENDIENTES
            $stmt = $db->query("SELECT COUNT(*) as total FROM quotes WHERE status = 'pending'");
            $totalQuotesNormal = (int)$stmt->fetch()['total'];
            
            // Contar cotizaciones de combos PENDIENTES
            $stmt = $db->query("SELECT COUNT(*) as total FROM combo_quotes WHERE status = 'pending'");
            $totalQuotesCombos = (int)$stmt->fetch()['total'];
            
            // ✅ Sumar solo las pendientes
            $stats['total_quotes'] = $totalQuotesNormal + $totalQuotesCombos;
            
            error_log("📊 Total cotizaciones PENDIENTES: {$stats['total_quotes']} (Normales: {$totalQuotesNormal}, Combos: {$totalQuotesCombos})");
            
        } catch (Exception $e) {
            error_log("Error contando cotizaciones: " . $e->getMessage());
        }
        
        // Productos con stock bajo
        try {
            $stmt = $db->query("
                SELECT COUNT(*) as total 
                FROM products 
                WHERE stock < COALESCE(NULLIF(min_stock, 0), 10)
            ");
            $stats['low_stock_products'] = (int)$stmt->fetch()['total'];
        } catch (Exception $e) {
            error_log("Error contando stock bajo: " . $e->getMessage());
        }
        
        // Total de combos
        try {
            $stmt = $db->query("SELECT COUNT(*) as total FROM combos");
            $stats['total_combos'] = (int)$stmt->fetch()['total'];
        } catch (Exception $e) {
            error_log("Error contando combos: " . $e->getMessage());
        }
        
        // Total de facturas
        try {
            $stmt = $db->query("SELECT COUNT(*) as total FROM invoices");
            $stats['total_invoices'] = (int)$stmt->fetch()['total'];
        } catch (Exception $e) {
            error_log("Error contando facturas: " . $e->getMessage());
        }
        
        return $stats;
        
    } catch (Exception $e) {
        error_log("Error general en getStats: " . $e->getMessage());
        return [
            'total_products' => 0,
            'total_clients' => 0,
            'total_quotes' => 0,
            'low_stock_products' => 0,
            'total_combos' => 0,
            'total_invoices' => 0
        ];
    }
}

/**
 * Obtener estadísticas de inventario
 */
function getInventoryStats() {
    try {
        $db = getDB();
        
        $stats = [
            'total_products' => 0,
            'low_stock' => 0,
            'total_value' => 0,
            'total_stock' => 0,
            'recent_movements' => 0
        ];
        
        // Total de productos
        try {
            $stmt = $db->query("SELECT COUNT(*) as total FROM products");
            $stats['total_products'] = (int)$stmt->fetch()['total'];
        } catch (Exception $e) {
            error_log("Error en total_products: " . $e->getMessage());
        }
        
        // Productos con stock bajo
        try {
            $stmt = $db->query("
                SELECT COUNT(*) as total 
                FROM products 
                WHERE stock < COALESCE(NULLIF(min_stock, 0), 10)
            ");
            $stats['low_stock'] = (int)$stmt->fetch()['total'];
        } catch (Exception $e) {
            error_log("Error en low_stock: " . $e->getMessage());
        }
        
        // Valor total del inventario
        try {
            $stmt = $db->query("SELECT SUM(stock * purchase_price) as total FROM products");
            $result = $stmt->fetch();
            $stats['total_value'] = (float)($result['total'] ?? 0);
        } catch (Exception $e) {
            error_log("Error en total_value: " . $e->getMessage());
        }
        
        // Stock total
        try {
            $stmt = $db->query("SELECT SUM(stock) as total FROM products");
            $result = $stmt->fetch();
            $stats['total_stock'] = (int)($result['total'] ?? 0);
        } catch (Exception $e) {
            error_log("Error en total_stock: " . $e->getMessage());
        }
        
        // Movimientos recientes (últimos 30 días)
        try {
            $stmt = $db->query("SHOW TABLES LIKE 'inventory_movements'");
            if ($stmt->fetch()) {
                $stmt = $db->query("
                    SELECT COUNT(*) as total 
                    FROM inventory_movements 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ");
                $result = $stmt->fetch();
                $stats['recent_movements'] = (int)($result['total'] ?? 0);
            }
        } catch (Exception $e) {
            error_log("Error en recent_movements: " . $e->getMessage());
        }
        
        return $stats;
        
    } catch (Exception $e) {
        error_log("Error general en getInventoryStats: " . $e->getMessage());
        return [
            'total_products' => 0,
            'low_stock' => 0,
            'total_value' => 0,
            'total_stock' => 0,
            'recent_movements' => 0
        ];
    }
}

// Si se llama directamente como API
if (basename($_SERVER['PHP_SELF']) === 'stats.php' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    if (isset($_GET['type']) && $_GET['type'] === 'inventory') {
        $stats = getInventoryStats();
    } else {
        $stats = getStats();
    }
    
    jsonResponse([
        'success' => true,
        'data' => $stats
    ]);
}
?>