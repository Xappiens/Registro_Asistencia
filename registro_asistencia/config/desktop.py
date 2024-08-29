# registro_asistencia/config/desktop.py

from frappe import _

def get_data():
    return [
        {
            "module_name": "Registro Asistencia",
            "color": "#FF5733",
            "icon": "octicon octicon-checklist",
            "type": "page",
            "label": _("Registro de Asistencia"),
            "link": "/registro_asistencia",
            "standard": 1,
        },
        {
            "module_name": "Registro Asistencia",
            "color": "#FF5733",
            "icon": "octicon octicon-gear",
            "type": "doctype",
            "label": _("Configuraciond e Registro de Asistencia"),
            "link": "Form/App Settings/App Settings",
            "doctype": "App Settings",
            "standard": 1,
        }
    ]
