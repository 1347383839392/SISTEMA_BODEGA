<div class="card">
    <div class="card-header bg-primary text-white">
        <h5 class="mb-0 text-white"><i class="bi bi-hourglass-split"></i> Cotizaciones Pendientes para Facturar</h5>
    </div>
    <div class="card-body">
        <div class="alert alert-info">
            <i class="bi bi-info-circle"></i>
            <strong>Información:</strong> Estas cotizaciones (normales y de combos) están listas para ser facturadas.
        </div>
        
        <div class="table-responsive">
            <table id="pendingQuotesFullTable" class="table table-hover table-striped">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Subtipo</th>
                        <th>Tipo Cotización</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<!-- ✅ INCLUIR LOS MODALES NECESARIOS AQUÍ -->
<!-- Modal Previsualización de Factura -->
<div class="modal fade" id="invoicePreviewModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title"><i class="bi bi-receipt"></i> Previsualización de Factura</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="invoicePreview"></div>
                
                <!-- Sección de Trabajo Realizado - SOLO PARA FACTURAS -->
                <div id="workMessagesSection" style="display: none;">
                    <hr class="my-4">
                    
                    <!-- ✅ NUEVO: Selector de título para la tabla -->
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">
                                <i class="bi bi-tag"></i> Título de la sección:
                            </label>
                            <select class="form-select" id="workMessagesTitleSelect" onchange="updateWorkMessagesTitle()">
                                <option value="Trabajo realizado">Trabajo Realizado</option>
                                <option value="Cotización">Cotización</option>
                                <option value="Cotización Combo">Cotización Combo</option>
                            </select>
                        </div>
                        <div class="col-md-6 d-flex align-items-end">
                            <div class="alert alert-sm alert-secondary mb-0 w-100">
                                <small>
                                    <i class="bi bi-info-circle"></i> 
                                    Este título aparecerá en el PDF de la factura
                                </small>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Título dinámico -->
                    <h5 class="mb-3" id="workMessagesSectionTitle">Trabajo realizado (Opcional)</h5>
                    
                    <div class="alert alert-secondary">
                        <i class="bi bi-info-circle"></i> 
                        Los mensajes agregados aparecerán en la factura PDF. Si no agrega mensajes, esta sección no aparecerá.
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-bordered" id="workMessagesTable">
                            <thead class="table-primary">
                                <tr>
                                    <th width="80" class="text-center">N°</th>
                                    <th>Descripción</th>
                                    <th width="120" class="text-center">
                                        <button type="button" class="btn btn-sm btn-success" onclick="addWorkMessage()">
                                            <i class="bi bi-plus-circle"></i> Agregar
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody id="workMessagesList">
                                <!-- Se llenarán dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="confirmInvoiceGeneration()">
                    <i class="bi bi-check-circle"></i> Generar Factura
                </button>
            </div>
        </div>
    </div>
</div>

<style>
.bg-purple {
    background-color: #6f42c1 !important;
    color: white !important;
}

#workMessagesTable tbody tr {
    background-color: #ffe6f0;
}

#workMessagesTable input[type="text"] {
    border: none;
    background: transparent;
    width: 100%;
    padding: 5px;
}

#workMessagesTable input[type="text"]:focus {
    outline: 2px solid #0d6efd;
    background: white;
}

.alert-sm {
    padding: 0.5rem;
    font-size: 0.875rem;
}
</style>

<script>
// Variable global para almacenar mensajes de trabajo
window.workMessages = [];

// ✅ NUEVO: Variable para el título seleccionado
window.workMessagesTitle = 'Trabajo realizado';

// ✅ NUEVO: Función para actualizar el título
window.updateWorkMessagesTitle = function() {
    const select = document.getElementById('workMessagesTitleSelect');
    const titleElement = document.getElementById('workMessagesSectionTitle');
    
    if (select && titleElement) {
        window.workMessagesTitle = select.value;
        titleElement.textContent = `${select.value} (Opcional)`;
        console.log('✅ Título actualizado:', window.workMessagesTitle);
    }
};

// Función para agregar un nuevo mensaje
window.addWorkMessage = function() {
    const messageObj = {
        id: Date.now(),
        text: ''
    };
    
    window.workMessages.push(messageObj);
    renderWorkMessages();
};

// Función para eliminar un mensaje
window.removeWorkMessage = function(id) {
    window.workMessages = window.workMessages.filter(msg => msg.id !== id);
    renderWorkMessages();
};

// Función para actualizar el texto de un mensaje
window.updateWorkMessage = function(id, text) {
    const message = window.workMessages.find(msg => msg.id === id);
    if (message) {
        message.text = text;
    }
};

// Función para renderizar la lista de mensajes
window.renderWorkMessages = function() {
    const tbody = document.getElementById('workMessagesList');
    if (!tbody) return;
    
    if (window.workMessages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay mensajes agregados</td></tr>';
        return;
    }
    
    tbody.innerHTML = window.workMessages.map((msg, index) => `
        <tr>
            <td class="text-center"><strong>●</strong></td>
            <td>
                <input type="text" 
                       class="form-control-plaintext" 
                       value="${msg.text || ''}" 
                       onchange="updateWorkMessage(${msg.id}, this.value)"
                       placeholder="Escriba el mensaje aquí...">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeWorkMessage(${msg.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};
</script>