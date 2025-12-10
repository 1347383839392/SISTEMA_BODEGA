<div class="card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0 text-white"><i class="bi bi-people"></i> Gestión de Clientes</h5>
        <button class="btn btn-primary" onclick="$('#clientForm')[0].reset(); $('#clientId').val(''); $('#clientModalLabel').text('Nuevo Cliente'); $('#clientModal').modal('show');">
            <i class="bi bi-plus-circle"></i> Nuevo Cliente
        </button>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table id="clientsTable" class="table table-hover table-striped">
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>NIT</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th>Dirección</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal de Cliente -->
<div class="modal fade" id="clientModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="mb-0 text-white" id="clientModalLabel">Nuevo Cliente</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form id="clientForm" onsubmit="event.preventDefault(); saveClient(Object.fromEntries(new FormData(this)));">
                <div class="modal-body">
                    <input type="hidden" id="clientId" name="id">
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="clientName" class="form-label">Nombre *</label>
                                <input type="text" class="form-control" id="clientName" name="name" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="clientLastName" class="form-label">Apellido *</label>
                                <input type="text" class="form-control" id="clientLastName" name="last_name" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="clientNit" class="form-label">NIT</label>
                                <input type="text" class="form-control" id="clientNit" name="nit" placeholder="123456789" maxlength="15">
                                <small class="text-muted">Solo números, sin guiones</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="clientPhone" class="form-label">Teléfono</label>
                                <input type="text" class="form-control" id="clientPhone" name="phone" placeholder="55501234" 
                                       pattern="[0-9]*" inputmode="numeric" maxlength="15">
                                <small class="text-muted">Solo números, sin guiones ni espacios</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-12">
                            <div class="mb-3">
                                <label for="clientEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="clientEmail" name="email" placeholder="cliente@ejemplo.com">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="clientAddress" class="form-label">Dirección</label>
                        <textarea class="form-control" id="clientAddress" name="address" rows="3" placeholder="Calle, zona, ciudad"></textarea>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        La información del cliente se utilizará en las cotizaciones y facturas.
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

<script>
// Validación adicional en tiempo real para el campo de teléfono
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('clientPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Eliminar cualquier carácter que no sea número
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
});
</script>