<?php
/**
 * API de Cotizaciones
 * CRUD completo - SIN descuento de stock (solo al facturar)
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
                    SELECT q.*, c.name as client_name, c.last_name as client_last_name,
                           c.nit as client_nit, c.phone as client_phone, c.email as client_email, 
                           c.address as client_address
                    FROM quotes q
                    INNER JOIN clients c ON q.client_id = c.id
                    WHERE q.id = ?
                ");
                $stmt->execute([$id]);
                $quote = $stmt->fetch();
                
                if (!$quote) {
                    jsonResponse(['success' => false, 'error' => 'Cotización no encontrada'], 404);
                }
                
                $stmt = $db->prepare("
                    SELECT qi.*, p.name as product_name, p.code as product_code
                    FROM quote_items qi
                    LEFT JOIN products p ON qi.product_id = p.id
                    WHERE qi.quote_id = ?
                    ORDER BY qi.id
                ");
                $stmt->execute([$id]);
                $quote['items'] = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $quote]);
            } elseif (isset($_GET['status'])) {
                $status = sanitize($_GET['status']);
                $stmt = $db->prepare("
                    SELECT q.*, CONCAT(c.name, ' ', c.last_name) as client_name, c.nit as client_nit
                    FROM quotes q
                    INNER JOIN clients c ON q.client_id = c.id
                    WHERE q.status = ?
                    ORDER BY q.created_at DESC
                ");
                $stmt->execute([$status]);
                $quotes = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $quotes]);
            } else {
                $stmt = $db->query("
                    SELECT q.*, CONCAT(c.name, ' ', c.last_name) as client_name, c.nit as client_nit
                    FROM quotes q
                    INNER JOIN clients c ON q.client_id = c.id
                    ORDER BY q.created_at DESC
                ");
                $quotes = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $quotes]);
            }
            break;
 case 'POST':
    // Crear nueva cotización SIN descontar stock
    $input = json_decode(file_get_contents('php://input'), true);
    
    $errors = validate($input, ['type', 'client_id', 'items']);
    if (!empty($errors)) {
        jsonResponse(['success' => false, 'errors' => $errors], 400);
    }
    
    if (!in_array($input['type'], ['MO', 'MA'])) {
        jsonResponse(['success' => false, 'error' => 'Tipo inválido (debe ser MO o MA)'], 400);
    }
    
    if (!is_array($input['items']) || empty($input['items'])) {
        jsonResponse(['success' => false, 'error' => 'Debe incluir al menos un item'], 400);
    }
    
    $type = $input['type'];
    $client_id = (int)$input['client_id'];
    
    $stmt = $db->prepare("SELECT id FROM clients WHERE id = ?");
    $stmt->execute([$client_id]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'error' => 'Cliente no encontrado'], 404);
    }
    
    $db->beginTransaction();
    
    try {
        // ✅ SOLO VALIDAR que el stock existe, NO descontar
        foreach ($input['items'] as $item) {
            if (isset($item['product_id'])) {
                $product_id = (int)$item['product_id'];
                $quantity = (int)$item['quantity'];
                
                $stmt = $db->prepare("SELECT stock FROM products WHERE id = ?");
                $stmt->execute([$product_id]);
                $product = $stmt->fetch();
                
                if ($product && $product['stock'] < $quantity) {
                    $db->rollBack();
                    jsonResponse(['success' => false, 'error' => 'Stock insuficiente para uno o más productos'], 400);
                }
            }
        }
        
        $stmt = $db->prepare("SELECT counter_value FROM counters WHERE counter_name = ? FOR UPDATE");
        $stmt->execute([$type]);
        $counter = $stmt->fetch();
        $new_counter = $counter['counter_value'] + 1;
        
        $stmt = $db->prepare("UPDATE counters SET counter_value = ? WHERE counter_name = ?");
        $stmt->execute([$new_counter, $type]);
        
        $number = $type . '-' . str_pad($new_counter, 4, '0', STR_PAD_LEFT);
        
        $total = 0;
        foreach ($input['items'] as $item) {
            $quantity = (int)$item['quantity'];
            $unit_price = (float)$item['unit_price'];
            $total += $quantity * $unit_price;
        }
        
        $stmt = $db->prepare("
            INSERT INTO quotes (number, type, client_id, total, status)
            VALUES (?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$number, $type, $client_id, $total]);
        $quote_id = $db->lastInsertId();
        
        // ✅ Insertar items SIN descontar stock
        $stmt = $db->prepare("
            INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total)
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
            SELECT q.*, c.name as client_name, c.last_name as client_last_name, c.nit as client_nit
            FROM quotes q
            INNER JOIN clients c ON q.client_id = c.id
            WHERE q.id = ?
        ");
        $stmt->execute([$quote_id]);
        $quote = $stmt->fetch();
        
        jsonResponse(['success' => true, 'data' => $quote, 'message' => 'Cotización creada exitosamente']);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    break;
        case 'PUT':
            // Actualizar cotización SIN modificar stock (solo facturar lo hace)
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$input['id'];
            
            $stmt = $db->prepare("SELECT * FROM quotes WHERE id = ?");
            $stmt->execute([$id]);
            $quote = $stmt->fetch();
            
            if (!$quote) {
                jsonResponse(['success' => false, 'error' => 'Cotización no encontrada'], 404);
            }
            
            if (isset($input['items']) && is_array($input['items'])) {
                $db->beginTransaction();
                
                try {
                    // ✅ SOLO validar stock disponible, NO descontar ni devolver
                    foreach ($input['items'] as $item) {
                        if (isset($item['product_id'])) {
                            $product_id = (int)$item['product_id'];
                            $quantity = (int)$item['quantity'];
                            
                            $stmt = $db->prepare("SELECT stock FROM products WHERE id = ?");
                            $stmt->execute([$product_id]);
                            $product = $stmt->fetch();
                            
                            if ($product && $product['stock'] < $quantity) {
                                $db->rollBack();
                                jsonResponse(['success' => false, 'error' => 'Stock insuficiente para uno o más productos'], 400);
                            }
                        }
                    }
                    
                    $total = 0;
                    foreach ($input['items'] as $item) {
                        $quantity = (int)$item['quantity'];
                        $unit_price = (float)$item['unit_price'];
                        $total += $quantity * $unit_price;
                    }
                    
                    $stmt = $db->prepare("UPDATE quotes SET total = ? WHERE id = ?");
                    $stmt->execute([$total, $id]);
                    
                    $stmt = $db->prepare("DELETE FROM quote_items WHERE quote_id = ?");
                    $stmt->execute([$id]);
                    
                    $stmt = $db->prepare("
                        INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    
                    foreach ($input['items'] as $item) {
                        $product_id = isset($item['product_id']) ? (int)$item['product_id'] : null;
                        $description = sanitize($item['description']);
                        $quantity = (int)$item['quantity'];
                        $unit_price = (float)$item['unit_price'];
                        $item_total = $quantity * $unit_price;
                        
                        $stmt->execute([$id, $product_id, $description, $quantity, $unit_price, $item_total]);
                    }
                    
                    $db->commit();
                    
                    $stmt = $db->prepare("
                        SELECT q.*, c.name as client_name, c.last_name as client_last_name, c.nit as client_nit
                        FROM quotes q
                        INNER JOIN clients c ON q.client_id = c.id
                        WHERE q.id = ?
                    ");
                    $stmt->execute([$id]);
                    $updated_quote = $stmt->fetch();
                    
                    jsonResponse(['success' => true, 'data' => $updated_quote, 'message' => 'Cotización actualizada exitosamente']);
                    
                } catch (Exception $e) {
                    $db->rollBack();
                    throw $e;
                }
            }
            elseif (isset($input['status'])) {
                $status = sanitize($input['status']);
                if (!in_array($status, ['pending', 'invoiced'])) {
                    jsonResponse(['success' => false, 'error' => 'Status inválido'], 400);
                }
                
                $stmt = $db->prepare("UPDATE quotes SET status = ? WHERE id = ?");
                $stmt->execute([$status, $id]);
                
                $stmt = $db->prepare("
                    SELECT q.*, c.name as client_name, c.last_name as client_last_name, c.nit as client_nit
                    FROM quotes q
                    INNER JOIN clients c ON q.client_id = c.id
                    WHERE q.id = ?
                ");
                $stmt->execute([$id]);
                $updated_quote = $stmt->fetch();
                
                jsonResponse(['success' => true, 'data' => $updated_quote, 'message' => 'Cotización actualizada exitosamente']);
            } else {
                jsonResponse(['success' => false, 'error' => 'No hay datos para actualizar'], 400);
            }
            break;
            
        case 'DELETE':
            // Eliminar cotización SIN devolver stock (nunca se descontó)
            if (!isset($_GET['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$_GET['id'];
            
            $stmt = $db->prepare("SELECT status FROM quotes WHERE id = ?");
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
                // ✅ Simplemente eliminar (no hay stock que devolver)
                $stmt = $db->prepare("DELETE FROM quotes WHERE id = ?");
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
    error_log("Error en quotes.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Error en el servidor: ' . $e->getMessage()], 500);
}
?>