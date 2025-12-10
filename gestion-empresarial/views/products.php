<div class="card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0 text-white"><i class="bi bi-box-seam"></i> Gestión de Productos</h5>
        <button class="btn btn-primary" onclick="$('#productForm')[0].reset(); $('#productId').val(''); $('#productModalLabel').text('Nuevo Producto'); $('#productModal').modal('show');">
            <i class="bi bi-plus-circle"></i> Nuevo Producto
        </button>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table id="productsTable" class="table table-hover table-striped">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Precio Compra</th>
                        <th>Precio Venta</th>
                        <th>% Ganancia</th>
                        <th>Stock</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal de Producto -->
<div class="modal fade" id="productModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class=" mb-0 text-white" id="productModalLabel">Nuevo Producto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="productForm" onsubmit="event.preventDefault(); saveProduct(Object.fromEntries(new FormData(this)));">
                <div class="modal-body">
                    <input type="hidden" id="productId" name="id">
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="productCode" class="form-label">Código *</label>
                                <input type="text" class="form-control" id="productCode" name="code" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="productName" class="form-label">Nombre *</label>
                                <input type="text" class="form-control" id="productName" name="name" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label for="purchasePrice" class="form-label">Precio Compra *</label>
                                <div class="input-group">
                                    <span class="input-group-text">Q</span>
                                    <input type="number" step="0.01" class="form-control" id="purchasePrice" name="purchase_price" required>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label for="salePrice" class="form-label">Precio Venta *</label>
                                <div class="input-group">
                                    <span class="input-group-text">Q</span>
                                    <input type="number" step="0.01" class="form-control" id="salePrice" name="sale_price" required>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label for="stock" class="form-label">Stock *</label>
                                <input type="number" class="form-control" id="stock" name="stock" value="0" required min="0">
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        <strong>Nota:</strong> El porcentaje de ganancia se calcula automáticamente y el stock se actualizará al realizar cotizaciones.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-save"></i> Guardar
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

</script>