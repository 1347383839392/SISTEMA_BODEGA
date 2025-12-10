# Sistema de Gestión Empresarial

## Guía de Instalación en XAMPP

---

## 📋 Requisitos Previos

- XAMPP 8.0 o superior (incluye Apache, MySQL y PHP)
- Navegador web moderno (Chrome, Firefox, Edge)
- Editor de código (Visual Studio Code recomendado)

---

## 🚀 Instalación Paso a Paso

### 1. Instalar XAMPP

1. Descargar XAMPP desde: https://www.apachefriends.org/
2. Instalar XAMPP en `C:\xampp` (ruta por defecto)
3. Ejecutar XAMPP Control Panel
4. Iniciar los servicios **Apache** y **MySQL**

### 2. Crear la Estructura del Proyecto

1. Navegar a la carpeta `C:\xampp\htdocs`
2. Crear una carpeta llamada `gestion-empresarial`
3. Dentro de esta carpeta, crear la siguiente estructura:

```
gestion-empresarial/
├── api/
│   ├── clients.php
│   ├── combos.php
│   ├── export.php
│   ├── import.php
│   ├── inventory.php
│   ├── invoices.php
│   ├── products.php
│   ├── quotes.php
│   └── stats.php
├── assets/
│   └── js/
│       └── main.js
├── views/
│   ├── clients.php
│   ├── combos.php
│   ├── inventory.php
│   ├── invoices.php
│   ├── products.php
│   └── quotes.php
├── config.php
└── index.php
```

### 3. Copiar los Archivos

Copiar todos los archivos PHP que te he proporcionado en sus respectivas carpetas según la estructura anterior.

### 4. Crear la Base de Datos

1. Abrir el navegador y acceder a: `http://localhost/phpmyadmin`
2. Hacer clic en "Nueva" en el panel izquierdo
3. Crear una base de datos llamada `gestion_empresarial`
4. Seleccionar la base de datos creada
5. Ir a la pestaña "SQL"
6. **Copiar TODO el contenido del archivo SQL que te proporcioné** (el que contiene CREATE DATABASE, CREATE TABLE, INSERT, etc.)
7. Pegar en el área de texto y hacer clic en "Continuar"
8. La base de datos se creará con todas las tablas y datos de ejemplo automáticamente

> ⚠️ **IMPORTANTE**: Puedes ejecutar todo el script SQL de una sola vez, no necesitas separarlo.

### 5. Configurar la Conexión

El archivo `config.php` ya está configurado con los valores por defecto de XAMPP:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'gestion_empresarial');
```

Si tienes una configuración diferente, modifica estos valores.

### 6. Acceder al Sistema

1. Abrir el navegador
2. Ir a: `http://localhost/gestion-empresarial/`
3. El sistema debería cargar con el dashboard principal

---

## 🎯 Primer Uso

El sistema viene con datos de ejemplo precargados:

- **8 productos** de ejemplo (cámaras, DVRs, cables, etc.)
- **4 clientes** de ejemplo
- **3 combos** predefinidos (2, 4 y 8 cámaras)

Puedes eliminar estos datos o usarlos para familiarizarte con el sistema.

---

## 🔧 Uso Básico del Sistema

### Dashboard

- Muestra estadísticas generales
- Alertas de stock bajo
- Acceso rápido a todos los módulos

### Productos

- Agregar/Editar/Eliminar productos
- Control de stock
- Cálculo automático de ganancia
- Alertas de stock bajo

### Clientes

- Base de datos de clientes
- Búsqueda avanzada
- Historial de cotizaciones

### Cotizaciones

- Dos tipos: MO (Mano de Obra) y MA (Materiales)
- Numeración automática
- Generación de PDF (función disponible)

### Combos

- Paquetes prediseñados de cámaras
- Cálculo automático de precios
- Vista con iconos representativos

### Facturación

- Conversión de cotizaciones a facturas
- Cálculo automático de IVA (19%)
- Impresión y descarga

### Inventario

- Registro de entradas y salidas
- Actualización automática de stock
- Alertas de productos críticos

---

## 💾 Respaldo y Restauración

### Crear Respaldo

1. Ir al Dashboard
2. Clic en "Exportar Datos"
3. Se descargará un archivo `.sql` con fecha

### Restaurar Respaldo

1. Ir al Dashboard
2. Clic en "Importar Datos"
3. Seleccionar el archivo `.sql`
4. Confirmar la importación

---

## 🛠️ Edición del Código

### Con Visual Studio Code

1. Abrir VS Code
2. Archivo → Abrir Carpeta
3. Seleccionar `C:\xampp\htdocs\gestion-empresarial`
4. Editar los archivos necesarios
5. Guardar cambios
6. Recargar el navegador para ver los cambios

### Estructura de Archivos

- **config.php**: Configuración de base de datos
- **index.php**: Página principal con dashboard
- **api/**: Endpoints para operaciones CRUD
- **views/**: Vistas de cada módulo
- **assets/js/main.js**: Lógica JavaScript

---

## 🐛 Solución de Problemas

### Error: "No se puede conectar a la base de datos"

- Verificar que MySQL está activo en XAMPP
- Revisar credenciales en `config.php`
- Verificar que la base de datos `gestion_empresarial` existe

### Error: "Call to undefined function..."

- Verificar que la extensión PDO está habilitada en PHP
- Ir a `C:\xampp\php\php.ini`
- Buscar `;extension=pdo_mysql` y quitar el `;`
- Reiniciar Apache

### La página se ve sin estilos

- Verificar conexión a internet (Bootstrap se carga desde CDN)
- Limpiar caché del navegador

### Errores de JavaScript

- Abrir consola del navegador (F12)
- Verificar que jQuery, Bootstrap y SweetAlert2 se carguen correctamente

---

## 📊 Base de Datos

### Tablas Principales

1. **products**: Catálogo de productos
2. **clients**: Base de datos de clientes
3. **quotes**: Cotizaciones generadas
4. **quote_items**: Detalles de cotizaciones
5. **combos**: Paquetes prediseñados
6. **combo_products**: Productos en combos
7. **inventory**: Movimientos de inventario
8. **invoices**: Facturas emitidas
9. **counters**: Numeración automática

---

## 🔐 Seguridad

### Para Uso Local

El sistema está configurado para uso local. Si deseas desplegarlo en producción:

1. Cambiar credenciales de base de datos
2. Implementar autenticación de usuarios
3. Usar HTTPS
4. Validar todas las entradas
5. Implementar sistema de permisos

---

## 📝 Notas Importantes

- El sistema almacena todos los datos en MySQL
- Los respaldos se generan en formato SQL
- El IVA está configurado al 19% (editable en `api/invoices.php`)
- La numeración de cotizaciones es automática y secuencial
- Los movimientos de inventario actualizan el stock automáticamente

---

## 🆘 Soporte

Para problemas o dudas:

1. Verificar esta documentación
2. Revisar logs de PHP en `C:\xampp\php\logs\`
3. Consultar logs de Apache en `C:\xampp\apache\logs\`

---

## 📄 Licencia

Sistema de Gestión Empresarial - Uso libre para fines personales y comerciales.

---

**Versión**: 1.0.0  
**Última actualización**: Noviembre 2024
