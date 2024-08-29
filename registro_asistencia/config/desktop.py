# registro_asistencia/config/desktop.py

from frappe import _

def get_data():
    return [
        {
            "module_name": "Registro Asistencia",
            "color": "#FF5733",
            "icon": "octicon octicon-checklist",
            "type": "module",
            "label": _("Registro Asistencia"),
            "items": [
                {
                    "type": "page",
                    "name": "registro_asistencia",
                    "label": _("Registro de Asistencia"),
                    "description": _("Página para registrar asistencia"),
                    "link": "/registro_asistencia",
                    "icon": "octicon octicon-file",
                },
                {
                    "type": "doctype",
                    "name": "App Settings",
                    "label": _("Configuración de Registro de Asistencia"),
                    "description": _("Configuración de parámetros para Registro de Asistencia"),
                    "onboard": 1,
                    "icon": "octicon octicon-gear",
                    "link": "Form/App Settings/App Settings",
                    "doctype": "App Settings"
                }
            ]
        },
        {
            "module_name": "Configuración de ERP",
            "color": "#FF5733",
            "icon": "octicon octicon-gear",
            "type": "module",
            "label": _("Configuración de ERP"),
            "items": [
                {
                    "type": "doctype",
                    "name": "App Settings",
                    "label": _("Configuración de Registro de Asistencia"),
                    "description": _("Configura los parámetros de la aplicación de Registro de Asistencia"),
                    "icon": "octicon octicon-gear",
                    "link": "Form/App Settings/App Settings",
                    "doctype": "App Settings"
                }
            ]
        }
    ]
