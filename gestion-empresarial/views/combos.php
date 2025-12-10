<div class="card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0 text-white"><i class="bi bi-camera"></i> Combos de Cámaras</h5>
        <button class="btn btn-primary" onclick="openComboModal()">
            <i class="bi bi-plus-circle"></i> Nuevo Combo
        </button>
    </div>
    <div class="card-body">
        <div class="row" id="combosGrid"></div>
    </div>
</div>

<!-- Modal de Combo - CORREGIDO -->
<div class="modal fade" id="comboModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="mb-0 text-white" id="comboModalLabel">Nuevo Combo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <!-- ✅ CRÍTICO: Quitar onsubmit inline -->
            <form id="comboForm">
                <div class="modal-body">
                    <input type="hidden" id="comboId" name="id">
                    
                    <div class="row mb-3">
                        <div class="col-md-8">
                            <label for="comboName" class="form-label">Nombre del Combo *</label>
                            <input type="text" class="form-control" id="comboName" name="name" required placeholder="Ej: Combo Premium 8 Cámaras">
                        </div>
                        <div class="col-md-4">
                            <label for="cameraCount" class="form-label">N° de Cámaras *</label>
                            <select class="form-select" id="cameraCount" name="camera_count" required>
                                <option value="">Seleccionar...</option>
                                <option value="2">2 Cámaras</option>
                                <option value="4">4 Cámaras</option>
                                <option value="6">6 Cámaras</option>
                                <option value="8">8 Cámaras</option>
                                <option value="16">16 Cámaras</option>
                                <option value="32">32 Cámaras</option>
                            </select>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <div class="d-flex justify-content-end align-items-center mb-3">
                        <button type="button" class="btn btn-outline-primary" onclick="searchProductForCombo()">
                            <i class="bi bi-search"></i> Buscar producto...
                        </button>
                    </div>
                    
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
                                    <th width="60"></th>
                                </tr>
                            </thead>
                            <tbody id="comboProducts"></tbody>
                            <tfoot>
                                <tr class="table-light">
                                    <td colspan="5" class="text-end"><strong>Total del Combo:</strong></td>
                                    <td colspan="2"><strong id="comboTotalPrice" class="text-primary">Q 0.00</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <!-- ✅ CRÍTICO: Cambiar type="button" y agregar onclick -->
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="saveCombo()">
                        <i class="bi bi-save"></i> Guardar Combo
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal Ver Combo -->
<div class="modal fade" id="viewComboModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Detalle del Combo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="comboDetails"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal de búsqueda de productos -->
<div class="modal fade" id="searchComboProductModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Buscar Producto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="text" class="form-control mb-3" id="comboProductSearchInput" placeholder="Buscar por nombre o código...">
                <div id="comboProductSearchResults" style="max-height: 400px; overflow-y: auto;"></div>
            </div>
        </div>
    </div>
</div>

<style>
.hover-shadow {
    transition: all 0.3s ease;
}
.hover-shadow:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
}
</style>