<div class="card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0 text-white"><i class="bi bi-file-earmark-text"></i> Gestión de Cotizaciones</h5>
        <button class="btn btn-primary" onclick="openQuoteModal()">
            <i class="bi bi-plus-circle"></i> Nueva Cotización
        </button>
    </div>
    <div class="card-body">
        <ul class="nav nav-pills mb-3" id="quoteTypeTabs">
            <li class="nav-item">
                <button class="nav-link active" data-type="all" onclick="filterQuotes('all')">Todas</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-type="MO" onclick="filterQuotes('MO')">Mano de Obra (MO)</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-type="MA" onclick="filterQuotes('MA')">Materiales (MA)</button>
            </li>
            <li class="nav-item">
                <button class="nav-link" data-type="pending" onclick="filterQuotes('pending')">Pendientes</button>
            </li>
        </ul>
        
        <div class="table-responsive">
            <table id="quotesTable" class="table table-hover table-striped">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Tipo</th>
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

<!-- Modal de Nueva Cotización -->
<div class="modal fade" id="quoteModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class=" mb-0 text-white">Nueva Cotización</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="quoteForm" onsubmit="event.preventDefault(); saveQuote();">
                <div class="modal-body">
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <label class="form-label">Tipo de Cotización *</label>
                            <select class="form-select" id="quoteType" name="type" required>
                                <option value="">Seleccionar...</option>
                                <option value="MO">MO - Mano de Obra</option>
                                <option value="MA">MA - Materiales</option>
                            </select>
                        </div>
                        <div class="col-md-8">
                            <label class="form-label">Cliente *</label>
                            <select class="form-select" id="quoteClient" name="client_id" required>
                                <option value="">Seleccionar cliente...</option>
                            </select>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <div class="d-flex justify-content-end align-items-center mb-3">
                        <button type="button" class="btn btn-outline-primary" onclick="searchProductForQuote()">
                            <i class="bi bi-search"></i> Buscar producto...
                        </button>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-bordered" id="quoteItemsTable">
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
                            <tbody id="quoteItems"></tbody>
                        </table>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-8"></div>
                        <div class="col-md-4">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <strong>Total:</strong>
                                        <strong id="quoteTotal" class="text-success">Q 0.00</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-save"></i> Guardar Cotización
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal Ver Cotización -->
<div class="modal fade" id="viewQuoteModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Detalle de Cotización</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="quoteDetails"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                <button type="button" class="btn btn-primary" onclick="downloadQuotePDF()">
                    <i class="bi bi-file-pdf"></i> Descargar PDF
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Editar Cotización -->
<div class="modal fade" id="editQuoteModalMain" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header bg-warning">
                <h5 class="modal-title"><i class="bi bi-pencil"></i> Editar Cotización</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="editQuoteFormMain" onsubmit="event.preventDefault(); saveEditedQuoteMain();">
                <div class="modal-body">
                    <input type="hidden" id="editQuoteIdMain">
                    
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        <strong>Nota:</strong> Edite los productos antes de facturar. Una vez facturada, la cotización no podrá modificarse.
                    </div>
                    
                    <div class="d-flex justify-content-end align-items-center mb-3">
                        <button type="button" class="btn btn-outline-primary" onclick="searchProductForEditQuote()">
                            <i class="bi bi-search"></i> Buscar producto...
                        </button>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-bordered" id="editQuoteItemsTableMain">
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
                            <tbody id="editQuoteItemsMain"></tbody>
                        </table>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-8"></div>
                        <div class="col-md-4">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <strong>Total:</strong>
                                        <strong id="editQuoteTotalMain" class="text-success">Q 0.00</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-warning">
                        <i class="bi bi-save"></i> Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal de búsqueda de productos -->
<div class="modal fade" id="searchProductModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Buscar Producto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="text" class="form-control mb-3" id="productSearchInput" placeholder="Buscar por nombre o código...">
                <div id="productSearchResults" style="max-height: 400px; overflow-y: auto;"></div>
            </div>
        </div>
    </div>
</div>