<?php
/**
 * API de Facturas - CON SOPORTE PARA TÍTULO DE MENSAJES
 * ✅ Guarda el título seleccionado para la sección de trabajo realizado
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
                
                // ✅ INCLUIR work_messages_title en la consulta
                $stmt = $db->prepare("
                    SELECT i.*, c.name as client_name, c.last_name as client_last_name,
                           c.nit as client_nit, c.phone as client_phone, 
                           c.email as client_email, c.address as client_address,
                           q.number as quote_number, q.type as quote_type
                    FROM invoices i
                    INNER JOIN clients c ON i.client_id = c.id
                    LEFT JOIN quotes q ON i.quote_id = q.id
                    WHERE i.id = ?
                ");
                $stmt->execute([$id]);
                $invoice = $stmt->fetch();
                
                if (!$invoice) {
                    jsonResponse(['success' => false, 'error' => 'Factura no encontrada'], 404);
                }
                
                // Si es combo, obtener el tipo desde combo_quotes
                if ($invoice['is_combo']) {
                    $stmt = $db->prepare("SELECT 'COMBO' as type FROM combo_quotes WHERE id = ?");
                    $stmt->execute([$invoice['quote_id']]);
                    $comboInfo = $stmt->fetch();
                    if ($comboInfo) {
                        $invoice['quote_type'] = $comboInfo['type'];
                    }
                }
                
                // Obtener items de la cotización original
                if ($invoice['is_combo']) {
                    $stmt = $db->prepare("
                        SELECT cqi.*, p.name as product_name, p.code as product_code
                        FROM combo_quote_items cqi
                        LEFT JOIN products p ON cqi.product_id = p.id
                        WHERE cqi.combo_quote_id = ?
                    ");
                } else {
                    $stmt = $db->prepare("
                        SELECT qi.*, p.name as product_name, p.code as product_code
                        FROM quote_items qi
                        LEFT JOIN products p ON qi.product_id = p.id
                        WHERE qi.quote_id = ?
                    ");
                }
                $stmt->execute([$invoice['quote_id']]);
                $invoice['items'] = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $invoice]);
                
            } else {
                $stmt = $db->query("
                    SELECT i.*, CONCAT(c.name, ' ', COALESCE(c.last_name, '')) as client_name,
                           q.number as quote_number
                    FROM invoices i
                    INNER JOIN clients c ON i.client_id = c.id
                    LEFT JOIN quotes q ON i.quote_id = q.id
                    ORDER BY i.created_at DESC
                ");
                $invoices = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $invoices]);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['quote_id'])) {
                jsonResponse(['success' => false, 'error' => 'quote_id requerido'], 400);
            }
            
            $quote_id = (int)$input['quote_id'];
            $is_combo = isset($input['is_combo']) && $input['is_combo'] === true;
            $work_messages = isset($input['work_messages']) ? $input['work_messages'] : null;
            // ✅ NUEVO: Recibir el título seleccionado
            $work_messages_title = isset($input['work_messages_title']) ? sanitize($input['work_messages_title']) : 'Trabajo realizado';
            
            $db->beginTransaction();
            
            try {
                if ($is_combo) {
                    $stmt = $db->prepare("
                        SELECT cq.*, c.name as client_name, c.last_name as client_last_name,
                               c.nit as client_nit, c.phone as client_phone, 
                               c.email as client_email, c.address as client_address
                        FROM combo_quotes cq
                        INNER JOIN clients c ON cq.client_id = c.id
                        WHERE cq.id = ? AND cq.status = 'pending'
                    ");
                } else {
                    $stmt = $db->prepare("
                        SELECT q.*, c.name as client_name, c.last_name as client_last_name,
                               c.nit as client_nit, c.phone as client_phone,
                               c.email as client_email, c.address as client_address
                        FROM quotes q
                        INNER JOIN clients c ON q.client_id = c.id
                        WHERE q.id = ? AND q.status = 'pending'
                    ");
                }
                
                $stmt->execute([$quote_id]);
                $quote = $stmt->fetch();
                
                if (!$quote) {
                    $db->rollBack();
                    jsonResponse(['success' => false, 'error' => 'Cotización no encontrada o ya facturada'], 404);
                }
                
                if ($is_combo) {
                    $stmt = $db->prepare("SELECT * FROM combo_quote_items WHERE combo_quote_id = ?");
                } else {
                    $stmt = $db->prepare("SELECT * FROM quote_items WHERE quote_id = ?");
                }
                $stmt->execute([$quote_id]);
                $items = $stmt->fetchAll();
                
                if (empty($items)) {
                    $db->rollBack();
                    jsonResponse(['success' => false, 'error' => 'La cotización no tiene productos'], 400);
                }
                
                // Validar y descontar stock
                foreach ($items as $item) {
                    if ($item['product_id']) {
                        $stmt = $db->prepare("SELECT stock, name FROM products WHERE id = ?");
                        $stmt->execute([$item['product_id']]);
                        $product = $stmt->fetch();
                        
                        if (!$product) {
                            $db->rollBack();
                            jsonResponse(['success' => false, 'error' => 'Producto no encontrado'], 404);
                        }
                        
                        if ($product['stock'] < $item['quantity']) {
                            $db->rollBack();
                            jsonResponse([
                                'success' => false, 
                                'error' => "Stock insuficiente para {$product['name']}"
                            ], 400);
                        }
                        
                        $stmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
                        $stmt->execute([$item['quantity'], $item['product_id']]);
                    }
                }
                
                // Generar número de factura
                $stmt = $db->prepare("SELECT counter_value FROM counters WHERE counter_name = 'invoices' FOR UPDATE");
                $stmt->execute();
                $counter = $stmt->fetch();
                
                if (!$counter) {
                    $stmt = $db->prepare("INSERT INTO counters (counter_name, counter_value) VALUES ('invoices', 0)");
                    $stmt->execute();
                    $new_counter = 1;
                } else {
                    $new_counter = $counter['counter_value'] + 1;
                }
                
                $stmt = $db->prepare("UPDATE counters SET counter_value = ? WHERE counter_name = 'invoices'");
                $stmt->execute([$new_counter]);
                
                $number = 'FAC-' . str_pad($new_counter, 4, '0', STR_PAD_LEFT);
                
                // ✅ CREAR FACTURA CON EL TÍTULO
                $stmt = $db->prepare("
                    INSERT INTO invoices (number, quote_id, client_id, subtotal, iva, total, work_messages, work_messages_title, notes, is_combo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $subtotal = isset($quote['subtotal']) ? $quote['subtotal'] : $quote['total'];
                $iva = isset($quote['iva']) ? $quote['iva'] : 0;
                $notes = isset($quote['notes']) ? $quote['notes'] : null;
                
                $stmt->execute([
                    $number, 
                    $quote_id, 
                    $quote['client_id'], 
                    $subtotal,
                    $iva,
                    $quote['total'],
                    $work_messages,
                    $work_messages_title, // ✅ NUEVO: Guardar el título
                    $notes,
                    $is_combo ? 1 : 0
                ]);
                $invoice_id = $db->lastInsertId();
                
                // Marcar cotización como facturada
                if ($is_combo) {
                    $stmt = $db->prepare("UPDATE combo_quotes SET status = 'invoiced' WHERE id = ?");
                } else {
                    $stmt = $db->prepare("UPDATE quotes SET status = 'invoiced' WHERE id = ?");
                }
                $stmt->execute([$quote_id]);
                
                $db->commit();
                
                $stmt = $db->prepare("SELECT * FROM invoices WHERE id = ?");
                $stmt->execute([$invoice_id]);
                $invoice = $stmt->fetch();
                
                jsonResponse([
                    'success' => true, 
                    'data' => $invoice, 
                    'message' => 'Factura generada exitosamente'
                ]);
                
            } catch (Exception $e) {
                $db->rollBack();
                error_log("Error creando factura: " . $e->getMessage());
                throw $e;
            }
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$_GET['id'];
            
            $db->beginTransaction();
            
            try {
                $stmt = $db->prepare("SELECT quote_id, is_combo FROM invoices WHERE id = ?");
                $stmt->execute([$id]);
                $invoice = $stmt->fetch();
                
                if (!$invoice) {
                    $db->rollBack();
                    jsonResponse(['success' => false, 'error' => 'Factura no encontrada'], 404);
                }
                
                $quote_id = $invoice['quote_id'];
                $is_combo = (bool)$invoice['is_combo'];
                
                $stmt = $db->prepare("DELETE FROM invoices WHERE id = ?");
                $stmt->execute([$id]);
                
                if ($is_combo) {
                    $stmt = $db->prepare("DELETE FROM combo_quote_items WHERE combo_quote_id = ?");
                    $stmt->execute([$quote_id]);
                    
                    $stmt = $db->prepare("DELETE FROM combo_quotes WHERE id = ?");
                    $stmt->execute([$quote_id]);
                } else {
                    $stmt = $db->prepare("DELETE FROM quote_items WHERE quote_id = ?");
                    $stmt->execute([$quote_id]);
                    
                    $stmt = $db->prepare("DELETE FROM quotes WHERE id = ?");
                    $stmt->execute([$quote_id]);
                }
                
                $db->commit();
                
                jsonResponse([
                    'success' => true, 
                    'message' => 'Factura y cotización eliminadas permanentemente',
                    'is_combo' => $is_combo
                ]);
                
            } catch (Exception $e) {
                $db->rollBack();
                error_log("Error eliminando factura: " . $e->getMessage());
                throw $e;
            }
            break;

        default:
            jsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
    }
} catch (Exception $e) {
    error_log("Error en invoices.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Error en el servidor: ' . $e->getMessage()], 500);
}
?>