<?php
/**
 * API de Combos
 * CRUD completo para gestión de combos de cámaras
 * ✅ CORREGIDO: Solo bloquea eliminación si hay cotizaciones PENDIENTES
 */

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $id = (int)$_GET['id'];

                // Obtener combo
                $stmt = $db->prepare("SELECT * FROM combos WHERE id = ?");
                $stmt->execute([$id]);
                $combo = $stmt->fetch();

                if (!$combo) {
                    jsonResponse(['success' => false, 'error' => 'Combo no encontrado'], 404);
                }

                // Obtener productos del combo
                $stmt = $db->prepare("
                    SELECT cp.*, p.name as product_name, p.code as product_code, p.sale_price
                    FROM combo_products cp
                    INNER JOIN products p ON cp.product_id = p.id
                    WHERE cp.combo_id = ?
                ");
                $stmt->execute([$id]);
                $combo['products'] = $stmt->fetchAll();

                jsonResponse(['success' => true, 'data' => $combo]);
            } else {
                // Obtener todos los combos
                $stmt = $db->query("SELECT * FROM combos ORDER BY camera_count");
                $combos = $stmt->fetchAll();

                // Obtener productos de cada combo
                foreach ($combos as &$combo) {
                    $stmt = $db->prepare("
                        SELECT cp.*, p.name as product_name, p.code as product_code
                        FROM combo_products cp
                        INNER JOIN products p ON cp.product_id = p.id
                        WHERE cp.combo_id = ?
                    ");
                    $stmt->execute([$combo['id']]);
                    $combo['products'] = $stmt->fetchAll();
                }

                jsonResponse(['success' => true, 'data' => $combos]);
            }
            break;
            
        case 'POST':
            // Crear nuevo combo
            $input = json_decode(file_get_contents('php://input'), true);
            
            error_log("POST combos.php - Input recibido: " . json_encode($input));
            
            if (!is_array($input)) {
                jsonResponse(['success' => false, 'error' => 'Error: JSON inválido o malformado'], 400);
            }

            // Validar campos obligatorios
            $errors = validate($input, ['name', 'camera_count', 'price']);
            if (!empty($errors)) {
                error_log("Errores de validación: " . json_encode($errors));
                jsonResponse(['success' => false, 'errors' => $errors], 400);
            }
            
            // Validar que haya al menos un producto
            if (!isset($input['products']) || !is_array($input['products']) || empty($input['products'])) {
                jsonResponse(['success' => false, 'error' => 'Debe incluir al menos un producto en el combo'], 400);
            }

            $name = sanitize($input['name']);
            $camera_count = (int)$input['camera_count'];
            $price = (float)$input['price'];
            $image = isset($input['image']) ? sanitize($input['image']) : null;

            // Iniciar transacción
            $db->beginTransaction();

            try {
                // Insertar combo
                $stmt = $db->prepare("
                    INSERT INTO combos (name, camera_count, price, image)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$name, $camera_count, $price, $image]);
                $combo_id = $db->lastInsertId();

                // Insertar productos
                $stmt = $db->prepare("
                    INSERT INTO combo_products (combo_id, product_id, quantity)
                    VALUES (?, ?, ?)
                ");

                foreach ($input['products'] as $product) {
                    $product_id = (int)$product['product_id'];
                    $quantity = (int)$product['quantity'];

                    // Verificar que el producto existe
                    $check = $db->prepare("SELECT id FROM products WHERE id = ?");
                    $check->execute([$product_id]);
                    if (!$check->fetch()) {
                        throw new Exception("Producto ID $product_id no encontrado");
                    }

                    $stmt->execute([$combo_id, $product_id, $quantity]);
                }

                $db->commit();

                // Obtener combo creado
                $stmt = $db->prepare("SELECT * FROM combos WHERE id = ?");
                $stmt->execute([$combo_id]);
                $combo = $stmt->fetch();

                jsonResponse(['success' => true, 'data' => $combo, 'message' => 'Combo creado exitosamente']);
            } catch (Exception $e) {
                $db->rollBack();
                error_log("Error en transacción: " . $e->getMessage());
                throw $e;
            }
            break;
            
        case 'PUT':
            // Actualizar combo
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                jsonResponse(['success' => false, 'error' => 'Error: JSON inválido o malformado'], 400);
            }

            if (!isset($input['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }

            $id = (int)$input['id'];

            $stmt = $db->prepare("SELECT * FROM combos WHERE id = ?");
            $stmt->execute([$id]);
            $combo = $stmt->fetch();

            if (!$combo) {
                jsonResponse(['success' => false, 'error' => 'Combo no encontrado'], 404);
            }

            $name = isset($input['name']) ? sanitize($input['name']) : $combo['name'];
            $camera_count = isset($input['camera_count']) ? (int)$input['camera_count'] : $combo['camera_count'];
            $price = isset($input['price']) ? (float)$input['price'] : $combo['price'];
            $image = isset($input['image']) ? sanitize($input['image']) : $combo['image'];

            // Iniciar transacción
            $db->beginTransaction();

            try {
                // Actualizar combo
                $stmt = $db->prepare("
                    UPDATE combos 
                    SET name = ?, camera_count = ?, price = ?, image = ?
                    WHERE id = ?
                ");
                $stmt->execute([$name, $camera_count, $price, $image, $id]);

                // Si se enviaron productos, actualizar
                if (isset($input['products']) && is_array($input['products'])) {
                    // Eliminar productos actuales
                    $stmt = $db->prepare("DELETE FROM combo_products WHERE combo_id = ?");
                    $stmt->execute([$id]);

                    // Insertar nuevos productos solo si hay alguno
                    if (!empty($input['products'])) {
                        $stmt = $db->prepare("
                            INSERT INTO combo_products (combo_id, product_id, quantity)
                            VALUES (?, ?, ?)
                        ");

                        foreach ($input['products'] as $product) {
                            $product_id = (int)$product['product_id'];
                            $quantity = (int)$product['quantity'];
                            $stmt->execute([$id, $product_id, $quantity]);
                        }
                    }
                }

                $db->commit();

                // Obtener combo actualizado
                $stmt = $db->prepare("SELECT * FROM combos WHERE id = ?");
                $stmt->execute([$id]);
                $updated_combo = $stmt->fetch();

                jsonResponse(['success' => true, 'data' => $updated_combo, 'message' => 'Combo actualizado exitosamente']);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
case 'DELETE':
    // ✅ ELIMINACIÓN MEJORADA: Maneja correctamente las restricciones
    if (!isset($_GET['id'])) {
        jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
    }

    $id = (int)$_GET['id'];
    
    $db->beginTransaction();
    
    try {
        // ✅ PASO 1: Verificar cotizaciones PENDIENTES (bloquea eliminación)
        $stmt = $db->prepare("
            SELECT COUNT(*) as count 
            FROM combo_quotes 
            WHERE combo_id = ? AND status = 'pending'
        ");
        $stmt->execute([$id]);
        $pending_quotes = $stmt->fetch()['count'];
        
        if ($pending_quotes > 0) {
            $db->rollBack();
            jsonResponse([
                'success' => false, 
                'error' => 'No se puede eliminar: el combo tiene ' . $pending_quotes . ' cotización(es) pendiente(s). Elimine primero las cotizaciones pendientes.'
            ], 400);
        }
        
        // ✅ PASO 2: Verificar cotizaciones FACTURADAS
        $stmt = $db->prepare("
            SELECT COUNT(*) as count 
            FROM combo_quotes 
            WHERE combo_id = ? AND status = 'invoiced'
        ");
        $stmt->execute([$id]);
        $invoiced_quotes = $stmt->fetch()['count'];
        
        // ✅ PASO 3: Si hay cotizaciones facturadas, desasociarlas (SET NULL)
        if ($invoiced_quotes > 0) {
            error_log("⚠️ Combo $id tiene $invoiced_quotes cotizaciones facturadas, desasociando...");
            
            // Opción A: Desasociar (si tu DB permite NULL en combo_id)
            // $stmt = $db->prepare("UPDATE combo_quotes SET combo_id = NULL WHERE combo_id = ? AND status = 'invoiced'");
            // $stmt->execute([$id]);
            
            // Opción B: Rechazar eliminación si hay cotizaciones facturadas
            $db->rollBack();
            jsonResponse([
                'success' => false,
                'error' => 'No se puede eliminar: el combo tiene cotizaciones facturadas (históricas). Estas cotizaciones deben permanecer en el sistema para auditoría.'
            ], 400);
        }
        
        // ✅ PASO 4: Eliminar productos del combo primero
        $stmt = $db->prepare("DELETE FROM combo_products WHERE combo_id = ?");
        $stmt->execute([$id]);
        
        // ✅ PASO 5: Eliminar el combo
        $stmt = $db->prepare("DELETE FROM combos WHERE id = ?");
        $stmt->execute([$id]);
        
        $db->commit();
        
        error_log("✅ Combo $id eliminado exitosamente");
        jsonResponse(['success' => true, 'message' => 'Combo eliminado exitosamente']);
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("❌ Error eliminando combo $id: " . $e->getMessage());
        
        // Detectar errores de Foreign Key
        if (strpos($e->getMessage(), 'foreign key constraint') !== false ||
            strpos($e->getMessage(), 'FOREIGN KEY') !== false ||
            strpos($e->getMessage(), 'Integrity constraint') !== false) {
            jsonResponse([
                'success' => false,
                'error' => 'No se puede eliminar el combo porque tiene cotizaciones asociadas. Por favor, elimine primero todas las cotizaciones pendientes.'
            ], 400);
        }
        
        throw $e;
    }
    break;
        
        default:
            jsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
    }
} catch (Exception $e) {
    error_log("Error en combos.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Error en el servidor: ' . $e->getMessage()], 500);
}
?>