<div class="card">
    <div class="card-header bg-success text-white">
        <h5 class="mb-0 text-white"><i class="bi bi-receipt"></i> Facturas Generadas</h5>
    </div>
    <div class="card-body">
        <!-- ✅ Filtros de búsqueda y fecha (UN SOLO CAMPO DE BÚSQUEDA) -->
        <div class="row mb-3">
            <div class="col-md-3">
                <label class="form-label">Buscar por N°:</label>
                <input type="text" id="invoiceSearch" class="form-control form-control-sm" placeholder="Buscar factura...">
            </div>
            <div class="col-md-3">
                <label class="form-label">Desde:</label>
                <input type="date" id="invoiceDateFrom" class="form-control form-control-sm">
            </div>
            <div class="col-md-3">
                <label class="form-label">Hasta:</label>
                <input type="date" id="invoiceDateTo" class="form-control form-control-sm">
            </div>
            <div class="col-md-3 d-flex align-items-end gap-2">
                <button type="button" class="btn btn-primary btn-sm" onclick="filterInvoicesByDate()">
                    <i class="bi bi-funnel"></i> Filtrar
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="clearInvoiceFilters()">
                    <i class="bi bi-x-circle"></i> Limpiar
                </button>
            </div>
        </div>
        
        <!-- ✅ Tabla SIN campo de búsqueda adicional -->
        <div class="table-responsive">
            <table id="invoicesTable" class="table table-hover">
                <thead>
                    <tr>
                        <th>Número</th>
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

<!-- Modal Previsualización de Factura -->
<div class="modal fade" id="invoicePreviewModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title"><i class="bi bi-receipt"></i> Previsualización de Factura</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="invoicePreview"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="confirmInvoiceGeneration()">
                    <i class="bi bi-check-circle"></i> Generar Factura
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Ver Factura -->
<div class="modal fade" id="viewInvoiceModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title"><i class="bi bi-receipt-cutoff"></i> Factura</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="invoiceDetails"></div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger" onclick="deleteInvoice(currentInvoiceId)">
                    <i class="bi bi-trash"></i> Eliminar
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                <button type="button" class="btn btn-outline-danger" onclick="downloadInvoicePDF(currentInvoiceId)">
                    <i class="bi bi-file-earmark-pdf"></i> Descargar PDF
                </button>
                <button type="button" class="btn btn-info" onclick="printInvoice(currentInvoiceId)">
                  <i class="bi bi-printer"></i> Imprimir
                </button>
            </div>
        </div>
    </div>
</div>

<style>
@media print {
    .modal-header, .modal-footer {
        display: none !important;
    }
    
    .no-print {
        display: none !important;
    }
    
    .print-only {
        display: block !important;
    }
    
    @page {
        margin: 0;
    }
    
    body {
        margin: 1cm;
    }
    
    a[href]:after {
        content: none !important;
    }
    
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}

.no-print {
    /* Visible en pantalla */
}

.print-only {
    display: none;
}
</style>