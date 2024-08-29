// app_settings.js

let appSettings = {};

// Llamada para obtener la configuración de la aplicación
function fetchAppSettings() {
    return frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.doctype.app_settings.app_settings.get_app_settings',
        callback: function(response) {
            appSettings = response.message || {};

            // Aplicar la configuración de la aplicación
            applyAppSettings();
        }
    });
}

// Aplicar la configuración de la aplicación
function applyAppSettings() {
    // Si el seguimiento de tareas está desactivado, oculta la sección de tareas
    if (!appSettings.enable_task_tracking) {
        document.getElementById('tasks').style.display = 'none';
        document.getElementById('tasks-link').style.display = 'none';
    }

    // Si la sección de registros está desactivada, oculta esa sección
    if (!appSettings.enable_records_section) {
        document.getElementById('records').style.display = 'none';
        document.getElementById('records-link').style.display = 'none';
    }

    // Si el seguimiento del tiempo está desactivado, oculta todos los elementos relacionados con el tiempo
    if (!appSettings.enable_time_tracking) {
        document.querySelectorAll('.time-related').forEach(el => {
            el.style.display = 'none';
        });
    }
}
