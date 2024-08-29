from frappe import _

def get_data():
    return [
        {
            "module_name": "Registro Asistencia",
            "color": "#FF5733",
            "icon": "octicon octicon-checklist",
            "type": "module",
            "label": _("Registro de Asistencia"),
            "items": [
                {
                    "type": "doctype",
                    "name": "App Settings",
                    "label": _("Configuración de Registro de Asistencia"),
                    "description": _("Configuración general de la aplicación de Registro de Asistencia."),
                    "onboard": 1,
                    "dependencies": ["App Settings"]
                },
                {
                    "type": "page",
                    "name": "registro-asistencia",
                    "label": _("Registro de Asistencia"),
                    "description": _("Página principal de Registro de Asistencia."),
                    "icon": "fa fa-check-square"
                }
            ]
        }
    ]
