<?php
/**
 * API de Productos
 * CRUD completo para gestión de productos
 * ✅ CORREGIDO: Permite eliminar productos en cotizaciones facturadas
 */

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

try {
    switch ($method) {
        case 'GET':
            // Obtener todos los productos o uno específico
            if (isset($_GET['id'])) {
                $id = (int)$_GET['id'];
                $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
                $stmt->execute([$id]);
                $product = $stmt->fetch();
                
                if ($product) {
                    jsonResponse(['success' => true, 'data' => $product]);
                } else {
                    jsonResponse(['success' => false, 'error' => 'Producto no encontrado'], 404);
                }
            } elseif (isset($_GET['code'])) {
                // Buscar por código de barras
                $code = sanitize($_GET['code']);
                $stmt = $db->prepare("SELECT * FROM products WHERE code = ?");
                $stmt->execute([$code]);
                $product = $stmt->fetch();
                
                jsonResponse(['success' => true, 'data' => $product]);
            } elseif (isset($_GET['search'])) {
                // Buscar productos
                $search = '%' . sanitize($_GET['search']) . '%';
                $stmt = $db->prepare("SELECT * FROM products WHERE name LIKE ? OR code LIKE ? ORDER BY name");
                $stmt->execute([$search, $search]);
                $products = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $products]);
            } else {
                // Obtener todos los productos
                $stmt = $db->query("SELECT * FROM products ORDER BY name");
                $products = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $products]);
            }
            break;
            
        case 'POST':
            // Crear nuevo producto
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validar campos requeridos
            $errors = validate($input, ['code', 'name', 'purchase_price', 'sale_price']);
            if (!empty($errors)) {
                jsonResponse(['success' => false, 'errors' => $errors], 400);
            }
            
            $code = sanitize($input['code']);
            $name = sanitize($input['name']);
            $purchase_price = (float)$input['purchase_price'];
            $sale_price = (float)$input['sale_price'];
            $stock = isset($input['stock']) ? (int)$input['stock'] : 0;
            
            // Calcular porcentaje de ganancia
            $profit_percentage = 0;
            if ($purchase_price > 0) {
                $profit_percentage = (($sale_price - $purchase_price) / $purchase_price) * 100;
            }
            
            // Verificar que el código no exista
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM products WHERE code = ?");
            $stmt->execute([$code]);
            if ($stmt->fetch()['count'] > 0) {
                jsonResponse(['success' => false, 'error' => 'El código ya existe'], 400);
            }
            
            // Insertar producto
            $stmt = $db->prepare("
                INSERT INTO products (code, name, purchase_price, sale_price, profit_percentage, stock, min_stock)
                VALUES (?, ?, ?, ?, ?, ?, 0)
            ");
            
            $stmt->execute([
                $code,
                $name,
                $purchase_price,
                $sale_price,
                $profit_percentage,
                $stock
            ]);
            
            $product_id = $db->lastInsertId();
            
            // Obtener el producto creado
            $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([$product_id]);
            $product = $stmt->fetch();
            
            jsonResponse(['success' => true, 'data' => $product, 'message' => 'Producto creado exitosamente']);
            break;

        case 'PUT':
            // Actualizar producto
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$input['id'];
            
            // Verificar que el producto existe
            $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch();
            
            if (!$product) {
                jsonResponse(['success' => false, 'error' => 'Producto no encontrado'], 404);
            }
            
            // Preparar datos para actualizar
            $code = isset($input['code']) ? sanitize($input['code']) : $product['code'];
            $name = isset($input['name']) ? sanitize($input['name']) : $product['name'];
            $purchase_price = isset($input['purchase_price']) ? (float)$input['purchase_price'] : $product['purchase_price'];
            $sale_price = isset($input['sale_price']) ? (float)$input['sale_price'] : $product['sale_price'];
            $stock = isset($input['stock']) ? (int)$input['stock'] : $product['stock'];
            
            // Calcular porcentaje de ganancia
            $profit_percentage = 0;
            if ($purchase_price > 0) {
                $profit_percentage = (($sale_price - $purchase_price) / $purchase_price) * 100;
            }
            
            // Verificar código único (si cambió)
            if ($code !== $product['code']) {
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM products WHERE code = ? AND id != ?");
                $stmt->execute([$code, $id]);
                if ($stmt->fetch()['count'] > 0) {
                    jsonResponse(['success' => false, 'error' => 'El código ya existe'], 400);
                }
            }
            
            // Actualizar producto
            $stmt = $db->prepare("
                UPDATE products 
                SET code = ?, name = ?, purchase_price = ?, sale_price = ?, 
                    profit_percentage = ?, stock = ?
                WHERE id = ?
            ");
            
            $stmt->execute([
                $code,
                $name,
                $purchase_price,
                $sale_price,
                $profit_percentage,
                $stock,
                $id
            ]);
            
            // Obtener producto actualizado
            $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([$id]);
            $updated_product = $stmt->fetch();
            
            jsonResponse(['success' => true, 'data' => $updated_product, 'message' => 'Producto actualizado exitosamente']);
            break;
  
        case 'DELETE':
            // ✅ CORREGIDO: Permitir eliminar productos solo en cotizaciones PENDIENTES
            if (!isset($_GET['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$_GET['id'];
            
            // ✅ Verificar solo en cotizaciones NORMALES PENDIENTES
            $stmt = $db->prepare("
                SELECT COUNT(*) as count 
                FROM quote_items qi
                INNER JOIN quotes q ON qi.quote_id = q.id
                WHERE qi.product_id = ? AND q.status = 'pending'
            ");
            $stmt->execute([$id]);
            $pending_quotes_count = $stmt->fetch()['count'];
            
            if ($pending_quotes_count > 0) {
                jsonResponse([
                    'success' => false, 
                    'error' => 'No se puede eliminar: el producto está en uso en cotizaciones pendientes'
                ], 400);
            }
            
            // ✅ Verificar solo en cotizaciones de COMBOS PENDIENTES
            $stmt = $db->prepare("
                SELECT COUNT(*) as count 
                FROM combo_quote_items cqi
                INNER JOIN combo_quotes cq ON cqi.combo_quote_id = cq.id
                WHERE cqi.product_id = ? AND cq.status = 'pending'
            ");
            $stmt->execute([$id]);
            $pending_combo_quotes_count = $stmt->fetch()['count'];
            
            if ($pending_combo_quotes_count > 0) {
                jsonResponse([
                    'success' => false, 
                    'error' => 'No se puede eliminar: el producto está en uso en cotizaciones de combos pendientes'
                ], 400);
            }
            
            // ✅ Verificar en combos activos
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM combo_products WHERE product_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetch()['count'] > 0) {
                jsonResponse([
                    'success' => false, 
                    'error' => 'No se puede eliminar: el producto está en uso en combos'
                ], 400);
            }
            
            // ✅ Si llegamos aquí, el producto solo está en cotizaciones FACTURADAS o no está en uso
            // Por lo tanto, PODEMOS ELIMINARLO
            
            $stmt = $db->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            
            jsonResponse(['success' => true, 'message' => 'Producto eliminado exitosamente']);
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
    }
} catch (Exception $e) {
    error_log("Error en products.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Error en el servidor: ' . $e->getMessage()], 500);
}
?>