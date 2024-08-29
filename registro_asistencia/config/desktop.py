from frappe import _

def get_data():
    return [
        {
            "module_name": "Registro de Asistencia",
            "category": "Modules",
            "label": _("Registro de Asistencia"),
            "icon": "octicon octicon-checklist",
            "type": "module",
            "description": "Configuración de la app Registro de Asistencia",
            "onboard_present": 1,
            "color": "#3498db",
            "doctype": "App Settings",
            "link": "Form/App Settings"
        },
        {
            "type": "doctype",
            "name": "App Settings",
            "label": _("Configuración de Registro de Asistencia"),
            "description": _("Configura la funcionalidad de la app de Registro de Asistencia."),
            "icon": "octicon octicon-gear",
            "module": "Registro de Asistencia",
            "color": "#FF5733",
            "link": "Form/App Settings/App Settings"
        },
        {
            "type": "page",
            "name": "registro-asistencia",
            "label": _("Registro de Asistencia"),
            "description": _("Página principal de Registro de Asistencia."),
            "icon": "fa fa-check-square",
            "module": "Registro de Asistencia",
            "color": "#FF5733",
            "link": "/registro_asistencia"
        }
    ]
