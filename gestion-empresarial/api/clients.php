<?php
/**
 * api/clients.php
 * API de Clientes
 * CRUD completo para gestión de clientes
 */

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

try {
    switch ($method) {
        case 'GET':
            // Obtener todos los clientes o uno específico
            if (isset($_GET['id'])) {
                $id = (int)$_GET['id'];
                $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
                $stmt->execute([$id]);
                $client = $stmt->fetch();
                
                if ($client) {
                    jsonResponse(['success' => true, 'data' => $client]);
                } else {
                    jsonResponse(['success' => false, 'error' => 'Cliente no encontrado'], 404);
                }
            } elseif (isset($_GET['search'])) {
                // Buscar clientes
                $search = '%' . sanitize($_GET['search']) . '%';
                $stmt = $db->prepare("
                    SELECT * FROM clients 
                    WHERE name LIKE ? OR last_name LIKE ? OR nit LIKE ? OR phone LIKE ? OR email LIKE ?
                    ORDER BY name, last_name
                ");
                $stmt->execute([$search, $search, $search, $search, $search]);
                $clients = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $clients]);
            } else {
                // Obtener todos los clientes
                $stmt = $db->query("SELECT * FROM clients ORDER BY name, last_name");
                $clients = $stmt->fetchAll();
                
                jsonResponse(['success' => true, 'data' => $clients]);
            }
            break;
            
        case 'POST':
            // Crear nuevo cliente
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validar campos requeridos
            $errors = validate($input, ['name', 'last_name']);
            if (!empty($errors)) {
                jsonResponse(['success' => false, 'errors' => $errors], 400);
            }
            
            $name = sanitize($input['name']);
            $last_name = sanitize($input['last_name']);
            $nit = isset($input['nit']) && $input['nit'] !== '' ? sanitize($input['nit']) : null;
            $phone = isset($input['phone']) ? sanitize($input['phone']) : null;
            $email = isset($input['email']) ? sanitize($input['email']) : null;
            $address = isset($input['address']) ? sanitize($input['address']) : null;
            
            // Validar email si se proporciona
            if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(['success' => false, 'error' => 'Email inválido'], 400);
            }
            
            // Validar que NIT sea numérico si se proporciona
            if ($nit && !is_numeric($nit)) {
                jsonResponse(['success' => false, 'error' => 'El NIT debe contener solo números'], 400);
            }
            
            // Insertar cliente
            $stmt = $db->prepare("
                INSERT INTO clients (name, last_name, nit, phone, email, address)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([$name, $last_name, $nit, $phone, $email, $address]);
            
            $client_id = $db->lastInsertId();
            
            // Obtener el cliente creado
            $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
            $stmt->execute([$client_id]);
            $client = $stmt->fetch();
            
            jsonResponse(['success' => true, 'data' => $client, 'message' => 'Cliente creado exitosamente']);
            break;
            
        case 'PUT':
            // Actualizar cliente
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$input['id'];
            
            // Verificar que el cliente existe
            $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
            $stmt->execute([$id]);
            $client = $stmt->fetch();
            
            if (!$client) {
                jsonResponse(['success' => false, 'error' => 'Cliente no encontrado'], 404);
            }
            
            // Preparar datos para actualizar
            $name = isset($input['name']) ? sanitize($input['name']) : $client['name'];
            $last_name = isset($input['last_name']) ? sanitize($input['last_name']) : $client['last_name'];
            $nit = isset($input['nit']) && $input['nit'] !== '' ? sanitize($input['nit']) : null;
            $phone = isset($input['phone']) ? sanitize($input['phone']) : $client['phone'];
            $email = isset($input['email']) ? sanitize($input['email']) : $client['email'];
            $address = isset($input['address']) ? sanitize($input['address']) : $client['address'];
            
            // Validar email si se proporciona
            if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(['success' => false, 'error' => 'Email inválido'], 400);
            }
            
            // Validar que NIT sea numérico si se proporciona
            if ($nit && !is_numeric($nit)) {
                jsonResponse(['success' => false, 'error' => 'El NIT debe contener solo números'], 400);
            }
            
            // Actualizar cliente
            $stmt = $db->prepare("
                UPDATE clients 
                SET name = ?, last_name = ?, nit = ?, phone = ?, email = ?, address = ?
                WHERE id = ?
            ");
            
            $stmt->execute([$name, $last_name, $nit, $phone, $email, $address, $id]);
            
            // Obtener cliente actualizado
            $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
            $stmt->execute([$id]);
            $updated_client = $stmt->fetch();
            
            jsonResponse(['success' => true, 'data' => $updated_client, 'message' => 'Cliente actualizado exitosamente']);
            break;
            
        case 'DELETE':
            // Eliminar cliente
            if (!isset($_GET['id'])) {
                jsonResponse(['success' => false, 'error' => 'ID requerido'], 400);
            }
            
            $id = (int)$_GET['id'];
            
            // Verificar que no tenga cotizaciones
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM quotes WHERE client_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetch()['count'] > 0) {
                jsonResponse(['success' => false, 'error' => 'No se puede eliminar: el cliente tiene cotizaciones asociadas'], 400);
            }
            
            // Eliminar cliente
            $stmt = $db->prepare("DELETE FROM clients WHERE id = ?");
            $stmt->execute([$id]);
            
            jsonResponse(['success' => true, 'message' => 'Cliente eliminado exitosamente']);
            break;
            
        default:
            jsonResponse(['success' => false, 'error' => 'Método no permitido'], 405);
    }
} catch (Exception $e) {
    error_log("Error en clients.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Error en el servidor: ' . $e->getMessage()], 500);
}
?>