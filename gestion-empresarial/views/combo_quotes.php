<div class="card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0 text-white"><i class="bi bi-camera-video"></i> Cotizaciones de Combos</h5>
        <button class="btn btn-primary" onclick="openSelectComboModal()">
            <i class="bi bi-plus-circle"></i> Cotizar Combo
        </button>
    </div>
    <div class="card-body">
        <div class="alert alert-info">
            <i class="bi bi-info-circle"></i>
            <strong>Información:</strong> Aquí puedes generar cotizaciones para los combos de cámaras configurados en el sistema.
        </div>
        
        <div class="table-responsive">
            <table id="comboQuotesTable" class="table table-hover table-striped">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Combo</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal Seleccionar Combo -->
<div class="modal fade" id="selectComboModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class=" mb-0 text-white"><i class="bi bi-camera"></i> Seleccionar Combo para Cotizar</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row" id="selectComboGrid">
                    <!-- Se llena dinámicamente con los combos disponibles -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Cotizar Combo -->
<div class="modal fade" id="comboQuoteModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title"><i class="bi bi-file-earmark-text"></i> Nueva Cotización de Combo</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="comboQuoteForm" onsubmit="event.preventDefault(); saveComboQuote();">
                <div class="modal-body">
                    <input type="hidden" id="comboQuoteId">
                    <input type="hidden" id="comboQuoteComboId">
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <h6 class="card-title mb-2">Combo Seleccionado:</h6>
                                    <p class="mb-1"><strong id="comboQuoteComboName">-</strong></p>
                                    <p class="mb-0 text-muted">
                                        <i class="bi bi-camera"></i> 
                                        <span id="comboQuoteCameraCount">0</span> cámaras
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Cliente *</label>
                            <select class="form-select" id="comboQuoteClient" required>
                                <option value="">Seleccionar cliente...</option>
                            </select>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i>
                        <strong>Nota:</strong> Puede editar los precios de los productos antes de generar la cotización.
                    </div>
                    
                    <h6 class="mb-3">Productos del Combo:</h6>
                    
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th width="60">N°</th>
                                    <th width="120">Código</th>
                                    <th>Nombre</th>
                                    <th width="120">Precio</th>
                                    <th width="120">Cantidad</th>
                                    <th width="120">Total</th>
                                </tr>
                            </thead>
                            <tbody id="comboQuoteProducts"></tbody>
                            <tfoot>
                                <tr class="table-light">
                                    <td colspan="5" class="text-end"><strong>Total de la Cotización:</strong></td>
                                    <td><strong id="comboQuoteTotal" class="text-success">Q 0.00</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-success">
                        <i class="bi bi-save"></i> Generar Cotización
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal Ver Cotización de Combo -->
<div class="modal fade" id="viewComboQuoteModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-info text-white">
                <h5 class="modal-title"><i class="bi bi-eye"></i> Detalle de Cotización de Combo</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="viewComboQuoteDetails"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                <button type="button" class="btn btn-primary" onclick="downloadComboQuotePDF(currentComboQuoteId)">
                    <i class="bi bi-file-pdf"></i> Descargar PDF
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

.hover-shadow {
    transition: all 0.3s ease;
}

.hover-shadow:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
}
</style>