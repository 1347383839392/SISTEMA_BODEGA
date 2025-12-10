<?php
/**
 * API de Cotizaciones de Combos - CORREGIDA
 * Maneja cotizaciones de combos con precios personalizados
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
                
                $stmt = $db->prepare("
                    SELECT cq.*, c.name as client_name, c.last_name as client_last_name,
                           c.nit as client_nit, c.phone as client_phone, c.email as client_email,
                           c.address as client_address, cb.name as combo_name, cb.camera_count
                    FROM combo_quotes cq
                    INNER JOIN clients c ON cq.client_id = c.id
                    INNER JOIN combos cb ON cq.combo_id = cb.id
                    WHERE cq.id = ?
                ");
                $stmt->execute([$id]);
                $quote = $stmt->fetch();
                
                if (!$quote) {
                    jsonResponse(['success' => false, 'error' => 'Cotización no encontrada'], 404);
                }
                
                // Obtener items del combo con precios personalizados
                $stmt = $db->prepare("
                    SELECT cqi.*, p.name as product_name, p.code as product_code
                    FROM combo_quote_items cqi
                    INNER JOIN products p ON cqi.product_id = p.id
                    WHERE cqi.combo_quote_id = ?
                    ORDER BY cqi.id ASC
                ");
                $stmt->execute([$id]);
                $quote['items'] = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $quote]);
                
            } elseif (isset($_GET['status'])) {
                // ✅ CORREGIDO: Incluir created_at y todos los campos necesarios
                $status = sanitize($_GET['status']);
                $stmt = $db->prepare("
                    SELECT cq.*, CONCAT(c.name, ' ', c.last_name) as client_name,
                           c.nit as client_nit, cb.name as combo_name
                    FROM combo_quotes cq
                    INNER JOIN clients c ON cq.client_id = c.id
                    INNER JOIN combos cb ON cq.combo_id = cb.id
                    WHERE cq.status = ?
                    ORDER BY cq.created_at DESC
                ");
                $stmt->execute([$status]);
                $quotes = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $quotes]);
                
            } else {
                // ✅ CORREGIDO: Incluir created_at en la consulta general también
                $stmt = $db->query("
                    SELECT cq.*, CONCAT(c.name, ' ', c.last_name) as client_name,
                           c.nit as client_nit, cb.name as combo_name
                    FROM combo_quotes cq
                    INNER JOIN clients c ON cq.client_id = c.id
                    INNER JOIN combos cb ON cq.combo_id = cb.id
                    ORDER BY cq.created_at DESC
                ");
                $quotes = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $quotes]);
            }
            break;

        case 'POST':
            // Crear cotización de combo
            $input = json_decode(file_get_contents('php://input'), true);
            
            $errors = validate($input, ['combo_id', 'client_id', 'items']);
            if (!empty($errors)) {
                jsonResponse(['success' => false, 'errors' => $errors], 400);
            }
            
            if (!is_array($input['items']) || empty($input['items'])) {
                jsonResponse(['success' => false, 'error' => 'Debe incluir al menos un item'], 400);
            }
            
            $combo_id = (int)$input['combo_id'];
            $client_id = (int)$input['client_id'];
            
            // Verificar que el combo existe
            $stmt = $db->prepare("SELECT * FROM combos WHERE id = ?");
            $stmt->execute([$combo_id]);
            $combo = $stmt->fetch();
            
            if (!$combo) {
                jsonResponse(['success' => false, 'error' => 'Combo no encontrado'], 404);
            }
            
            // Verificar que el cliente existe
            $stmt = $db->prepare("SELECT id FROM clients WHERE id = ?");
            $stmt->execute([$client_id]);
            if (!$stmt->fetch()) {
                jsonResponse(['success' => false, 'error' => 'Cliente no encontrado'], 404);
            }
            
            $db->beginTransaction();
            
            try {
                // Validar stock disponible
                foreach ($input['items'] as $item) {
                    if (isset($item['product_id'])) {
                        $product_id = (int)$item['product_id'];
                        $quantity = (int)$item['quantity'];
                        
                        $stmt = $db->prepare("SELECT stock, name FROM products WHERE id = ?");
                        $stmt->execute([$product_id]);
                        $product = $stmt->fetch();
                        
                        if ($product && $product['stock'] < $quantity) {
                            $db->rollBack();
                            jsonResponse(['success' => false, 'error' => "Stock insuficiente para {$product['name']}"], 400);
                        }
                    }
                }
                
                // Obtener contador de cotizaciones de combos
                $stmt = $db->prepare("SELECT counter_value FROM counters WHERE counter_name = 'combo_quotes' FOR UPDATE");
                $stmt->execute();
                $counter = $stmt->fetch();
                
                if (!$counter) {
                    // Crear contador si no existe
                    $stmt = $db->prepare("INSERT INTO counters (counter_name, counter_value) VALUES ('combo_quotes', 0)");
                    $stmt->execute();
                    $new_counter = 1;
                } else {
                    $new_counter = $counter['counter_value'] + 1;
                }
                
                $stmt = $db->prepare("UPDATE counters SET counter_value = ? WHERE counter_name = 'combo_quotes'");
                $stmt->execute([$new_counter]);
                
                $number = 'COMBO-' . str_pad($new_counter, 4, '0', STR_PAD_LEFT);
                
                // Calcular total
                $total = 0;
                foreach ($input['items'] as $item) {
                    $quantity = (int)$item['quantity'];
                    $unit_price = (float)$item['unit_price'];
                    $total += $quantity * $unit_price;
                }
                
                // Crear cotización de combo
                $stmt = $db->prepare("
                    INSERT INTO combo_quotes (number, combo_id, client_id, total, status)
                    VALUES (?, ?, ?, ?, 'pending')
                ");
                $stmt->execute([$number, $combo_id, $client_id, $total]);
                $quote_id = $db->lastInsertId();
                
                // Insertar items con precios personalizados
                $stmt = $db->prepare("
                    INSERT INTO combo_quote_items (combo_quote_id, product_id, description, quantity, unit_price, total)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                
                foreach ($input['items'] as $item) {
                    $product_id = isset($item['product_id']) ? (int)$item['product_id'] : null;
                    $description = sanitize($item['description']);
                    $quantity = (int)$item['quantity'];
                    $unit_price = (float)$item['unit_price'];
                    $item_total = $quantity * $unit_price;
                    
                    $stmt->execute([$quote_id, $product_id, $description, $quantity, $unit_price, $item_total]);
                }
                
                $db->commit();
                
                $stmt = $db->prepare("
                    SELECT cq.*, c.name as client_name, c.last_name as client_last_name,
                           c.nit as client_nit, cb.name as combo_name
                    FROM combo_quotes cq
                    INNER JOIN clients c ON cq.client_id = c.id
                    INNER JOIN combos cb ON cq.combo_id = cb.id
                    WHERE cq.id = ?
                ");
                $stmt->execute([$quote_id]);
                $quote = $stmt->fetch();
                
                jsonResponse(['success' => true, 'data' => $quote, 'message' => 'Cotización de combo creada exitosamente']);
                
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$_GET['id'];
            
            $stmt = $db->prepare("SELECT status FROM combo_quotes WHERE id = ?");
            $stmt->execute([$id]);
            $quote = $stmt->fetch();
            
            if (!$quote) {
                jsonResponse(['success' => false, 'error' => 'Cotización no encontrada'], 404);
            }
            
            if ($quote['status'] === 'invoiced') {
                jsonResponse(['success' => false, 'error' => 'No se puede eliminar una cotización facturada'], 400);
            }
            
            $db->beginTransaction();
            
            try {
                $stmt = $db->prepare("DELETE FROM combo_quotes WHERE id = ?");
                $stmt->execute([$id]);
                
                $db->commit();
                
                jsonResponse(['success' => true, 'message' => 'Cotización eliminada exitosamente']);
                
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;

        default:
            jsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
    }
} catch (Exception $e) {
    error_log("Error en combo_quotes.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Error en el servidor: ' . $e->getMessage()], 500);
}
?>