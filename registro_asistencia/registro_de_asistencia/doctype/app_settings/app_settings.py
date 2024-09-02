import frappe
from frappe.model.document import Document

class AppSettings(Document):
    def validate(self):
        """Lógica de validación que se ejecuta cada vez que se guarda la configuración."""

        # Aquí puedes agregar más validaciones según sea necesario

@frappe.whitelist()
def get_app_settings():
    """Función para recuperar las configuraciones desde el frontend."""
    settings = frappe.get_single("Registro Asistencia Settings")
    return {
        "enable_task_tracking": settings.enable_task_tracking,
        "enable_records_section": settings.enable_records_section,
        "enable_time_tracking": settings.enable_time_tracking
    }

def on_doctype_update():
    """Función opcional que se ejecuta cada vez que se actualiza el Doctype."""
    frappe.db.updatedb("Registro Asistencia Settings")
