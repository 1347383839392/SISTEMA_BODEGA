<?php
/**
 * API de Inventario
 * Gestión de movimientos de inventario (entradas/salidas)
 */

require_once __DIR__ . '/../config.php';

// Limpiar cualquier salida previa
if (ob_get_level()) {
    ob_end_clean();
}

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

try {
    switch ($method) {
        case 'GET':
            // Obtener movimientos de inventario
            $type = isset($_GET['type']) ? $_GET['type'] : null;
            $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : null;
            $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : null;
            
            $sql = "
                SELECT 
                    im.*,
                    p.name as product_name,
                    p.code as product_code
                FROM inventory_movements im
                LEFT JOIN products p ON im.product_id = p.id
                WHERE 1=1
            ";
            
            $params = [];
            
            // Filtro por tipo
            if ($type === 'in' || $type === 'out') {
                $sql .= " AND im.type = ?";
                $params[] = $type;
            }
            
            // Filtro por rango de fechas
            if ($date_from && $date_to) {
                $sql .= " AND DATE(im.created_at) BETWEEN ? AND ?";
                $params[] = $date_from;
                $params[] = $date_to;
            } elseif ($date_from) {
                $sql .= " AND DATE(im.created_at) >= ?";
                $params[] = $date_from;
            } elseif ($date_to) {
                $sql .= " AND DATE(im.created_at) <= ?";
                $params[] = $date_to;
            }
            
            $sql .= " ORDER BY im.created_at DESC";
            
            if (!empty($params)) {
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            } else {
                $stmt = $db->query($sql);
            }
            
            $movements = $stmt->fetchAll();
            
            jsonResponse([
                'success' => true,
                'data' => $movements
            ]);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Verificar si es una edición
            if (isset($input['id']) && !empty($input['id'])) {
                // EDITAR MOVIMIENTO
                $movement_id = (int)$input['id'];
                
                // Obtener el movimiento original
                $stmt = $db->prepare("SELECT * FROM inventory_movements WHERE id = ?");
                $stmt->execute([$movement_id]);
                $old_movement = $stmt->fetch();
                
                if (!$old_movement) {
                    jsonResponse(['success' => false, 'error' => 'Movimiento no encontrado'], 404);
                }
                
                // Nuevos datos
                $product_id = (int)$input['product_id'];
                $type = $input['type'];
                $quantity = (int)$input['quantity'];
                $reason = isset($input['reason']) ? sanitize($input['reason']) : null;
                $document_number = isset($input['document_number']) ? sanitize($input['document_number']) : null;
                
                // Validaciones
                if (!in_array($type, ['in', 'out'])) {
                    jsonResponse(['success' => false, 'error' => 'Tipo de movimiento inválido'], 400);
                }
                
                if ($quantity <= 0) {
                    jsonResponse(['success' => false, 'error' => 'La cantidad debe ser mayor a 0'], 400);
                }
                
                // Iniciar transacción
                $db->beginTransaction();
                
                try {
                    // Revertir el movimiento anterior
                    $stmt = $db->prepare("SELECT stock FROM products WHERE id = ?");
                    $stmt->execute([$old_movement['product_id']]);
                    $product = $stmt->fetch();
                    $current_stock = (int)$product['stock'];
                    
                    // Revertir stock anterior
                    $reverted_stock = $old_movement['type'] === 'in' 
                        ? $current_stock - (int)$old_movement['quantity'] 
                        : $current_stock + (int)$old_movement['quantity'];
                    
                    $stmt = $db->prepare("UPDATE products SET stock = ? WHERE id = ?");
                    $stmt->execute([$reverted_stock, $old_movement['product_id']]);
                    
                    // Aplicar nuevo movimiento
                    $stmt = $db->prepare("SELECT stock FROM products WHERE id = ?");
                    $stmt->execute([$product_id]);
                    $product = $stmt->fetch();
                    
                    if (!$product) {
                        throw new Exception('Producto no encontrado');
                    }
                    
                    $current_stock = (int)$product['stock'];
                    $new_stock = $type === 'in' ? $current_stock + $quantity : $current_stock - $quantity;
                    
                    if ($new_stock < 0) {
                        throw new Exception("Stock insuficiente. Stock disponible: $current_stock");
                    }
                    
                    // Actualizar stock del producto
                    $stmt = $db->prepare("UPDATE products SET stock = ? WHERE id = ?");
                    $stmt->execute([$new_stock, $product_id]);
                    
                    // Actualizar el movimiento
                    $stmt = $db->prepare("
                        UPDATE inventory_movements 
                        SET product_id = ?, type = ?, quantity = ?, reason = ?, 
                            document_number = ?, current_stock = ?
                        WHERE id = ?
                    ");
                    
                    $stmt->execute([
                        $product_id,
                        $type,
                        $quantity,
                        $reason,
                        $document_number,
                        $new_stock,
                        $movement_id
                    ]);
                    
                    $db->commit();
                    
                    jsonResponse([
                        'success' => true,
                        'message' => 'Movimiento actualizado correctamente'
                    ]);
                    
                } catch (Exception $e) {
                    $db->rollBack();
                    throw $e;
                }
                
            } else {
                // REGISTRAR NUEVO MOVIMIENTO
                // Validar campos requeridos
                $errors = validate($input, ['product_id', 'type', 'quantity']);
                if (!empty($errors)) {
                    jsonResponse(['success' => false, 'errors' => $errors], 400);
                }
                
                $product_id = (int)$input['product_id'];
                $type = $input['type']; // 'in' o 'out'
                $quantity = (int)$input['quantity'];
                $reason = isset($input['reason']) ? sanitize($input['reason']) : null;
                $document_number = isset($input['document_number']) ? sanitize($input['document_number']) : null;
                
                // Validar tipo
                if (!in_array($type, ['in', 'out'])) {
                    jsonResponse(['success' => false, 'error' => 'Tipo de movimiento inválido'], 400);
                }
                
                // Validar cantidad
                if ($quantity <= 0) {
                    jsonResponse(['success' => false, 'error' => 'La cantidad debe ser mayor a 0'], 400);
                }
                
                // Obtener producto actual
                $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
                $stmt->execute([$product_id]);
                $product = $stmt->fetch();
                
                if (!$product) {
                    jsonResponse(['success' => false, 'error' => 'Producto no encontrado'], 404);
                }
                
                // Calcular nuevo stock
                $current_stock = (int)$product['stock'];
                $new_stock = $type === 'in' ? $current_stock + $quantity : $current_stock - $quantity;
                
                // Validar que no quede en negativo
                if ($new_stock < 0) {
                    jsonResponse([
                        'success' => false, 
                        'error' => "Stock insuficiente. Stock actual: $current_stock"
                    ], 400);
                }
                
                // Iniciar transacción
                $db->beginTransaction();
                
                try {
                    // Actualizar stock del producto
                    $stmt = $db->prepare("UPDATE products SET stock = ? WHERE id = ?");
                    $stmt->execute([$new_stock, $product_id]);
                    
                    // Registrar movimiento
                    $stmt = $db->prepare("
                        INSERT INTO inventory_movements 
                        (product_id, type, quantity, reason, document_number, current_stock, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, NOW())
                    ");
                    
                    $stmt->execute([
                        $product_id,
                        $type,
                        $quantity,
                        $reason,
                        $document_number,
                        $new_stock
                    ]);
                    
                    $db->commit();
                    
                    jsonResponse([
                        'success' => true,
                        'message' => 'Movimiento registrado correctamente',
                        'data' => [
                            'previous_stock' => $current_stock,
                            'new_stock' => $new_stock,
                            'movement_id' => $db->lastInsertId()
                        ]
                    ]);
                    
                } catch (Exception $e) {
                    $db->rollBack();
                    throw $e;
                }
            }
            break;
            
        case 'DELETE':
            // Eliminar movimiento
            if (!isset($_GET['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$_GET['id'];
            
            // Obtener el movimiento
            $stmt = $db->prepare("SELECT * FROM inventory_movements WHERE id = ?");
            $stmt->execute([$id]);
            $movement = $stmt->fetch();
            
            if (!$movement) {
                jsonResponse(['success' => false, 'error' => 'Movimiento no encontrado'], 404);
            }
            
            // Iniciar transacción
            $db->beginTransaction();
            
            try {
                // Revertir el stock
                $product_id = $movement['product_id'];
                $quantity = $movement['quantity'];
                $type = $movement['type'];
                
                // Obtener stock actual
                $stmt = $db->prepare("SELECT stock FROM products WHERE id = ?");
                $stmt->execute([$product_id]);
                $current_stock = $stmt->fetch()['stock'];
                
                // Calcular nuevo stock (revertir la operación)
                $new_stock = $type === 'in' ? $current_stock - $quantity : $current_stock + $quantity;
                
                // Validar que no quede negativo al revertir
                if ($new_stock < 0) {
                    throw new Exception('No se puede eliminar: el stock resultante sería negativo');
                }
                
                // Actualizar stock
                $stmt = $db->prepare("UPDATE products SET stock = ? WHERE id = ?");
                $stmt->execute([$new_stock, $product_id]);
                
                // Eliminar movimiento
                $stmt = $db->prepare("DELETE FROM inventory_movements WHERE id = ?");
                $stmt->execute([$id]);
                
                $db->commit();
                
                jsonResponse([
                    'success' => true,
                    'message' => 'Movimiento eliminado y stock revertido'
                ]);
                
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
    }
    
} catch (Exception $e) {
    error_log("Error en inventory.php: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'error' => 'Error en el servidor: ' . $e->getMessage()
    ], 500);
}
?>