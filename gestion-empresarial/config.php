<?php
/**
 * Configuración de Base de Datos
 * Sistema de Gestión Empresarial
 */

// Headers CORS para permitir peticiones desde localhost
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Si es una petición OPTIONS (preflight), responder inmediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de base de datos
define('DB_HOST', 'localhost:3307');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'gestion_empresarial');
define('DB_CHARSET', 'utf8mb4');

// Configuración de la aplicación
define('APP_NAME', 'Sistema de Gestión Empresarial');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'http://localhost/gestion-empresarial/');

// Configuración de zona horaria
date_default_timezone_set('America/Guatemala');

// Configuración de sesión
ini_set('session.gc_maxlifetime', 3600); // 1 hora
session_start();

/**
 * Clase singleton para la conexión PDO
 */
class Database {
    private static $instance = null;
    private $conn;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $this->conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Error de conexión DB: " . $e->getMessage());
            // En lugar de die(), lanzar excepción
            throw new Exception("Error de conexión a la base de datos");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->conn;
    }
    
    private function __clone() {}
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

/**
 * Obtener conexión a base de datos
 */
function getDB() {
    try {
        return Database::getInstance()->getConnection();
    } catch (Exception $e) {
        error_log("Error al obtener DB: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'error' => 'Error de conexión a la base de datos'
        ], 500);
    }
}

/**
 * Enviar respuesta JSON estandarizada
 */
function jsonResponse($data, $code = 200) {
    // Limpiar cualquier salida previa
    if (ob_get_length()) ob_clean();
    
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Sanitiza entradas (protege contra XSS y SQL Injection)
 */
function sanitize($data) {
    if (is_array($data)) {
        $clean = [];
        foreach ($data as $key => $value) {
            $clean[$key] = sanitize($value);
        }
        return $clean;
    }
    if (is_null($data)) return null;
    return htmlspecialchars(strip_tags(trim((string)$data)), ENT_QUOTES, 'UTF-8');
}

/**
 * Valida campos requeridos y tipos
 */
function validate($data, $required = [], $types = []) {
    $errors = [];

    // Validar campos requeridos
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            $errors[] = "El campo '$field' es requerido";
        } elseif (is_array($data[$field])) {
            // Si es array, solo verificar que no esté vacío
            if (empty($data[$field])) {
                $errors[] = "El campo '$field' no puede estar vacío";
            }
        } elseif (trim($data[$field]) === '') {
            $errors[] = "El campo '$field' es requerido";
        }
    }

    // Validar tipos de datos
    foreach ($types as $field => $type) {
        if (!isset($data[$field])) continue;
        
        $value = $data[$field];
        switch ($type) {
            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $errors[] = "El campo '$field' debe ser un email válido";
                }
                break;
            case 'numeric':
                if (!is_numeric($value)) {
                    $errors[] = "El campo '$field' debe ser numérico";
                }
                break;
            case 'int':
                if (!filter_var($value, FILTER_VALIDATE_INT)) {
                    $errors[] = "El campo '$field' debe ser un número entero";
                }
                break;
        }
    }

    return $errors;
}

/**
 * Manejador global de excepciones
 */
set_exception_handler(function($e) {
    error_log("Exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    
    // Si es una petición API (JSON)
    if ($_SERVER['REQUEST_METHOD'] === 'POST' || 
        $_SERVER['REQUEST_METHOD'] === 'PUT' || 
        $_SERVER['REQUEST_METHOD'] === 'DELETE' ||
        (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)) {
        jsonResponse([
            'success' => false,
            'error' => 'Error interno del servidor'
        ], 500);
    } else {
        echo "Error del sistema. Por favor, contacte al administrador.";
    }
});

/**
 * Manejador global de errores
 */
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("Error [$errno]: $errstr in $errfile:$errline");
    
    // Solo lanzar excepción para errores críticos
    if (in_array($errno, [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
        throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
    }
    
    return true; // No ejecutar el manejador de errores de PHP
});

// Configuración de reportes de errores (solo en desarrollo)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Cambiar a 0 en producción
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// Iniciar buffer de salida para capturar errores inesperados
ob_start();
?>