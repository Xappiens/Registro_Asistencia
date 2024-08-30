import frappe
from frappe import _

def after_install():
    # Verificar si HRMS está instalado
    if 'hrms' not in frappe.get_installed_apps():
        frappe.throw(_("HRMS module is required to install this app"))
    
    # Añadir campos personalizados a Attendance
    add_custom_fields_to_attendance()
    add_custom_fields_to_checkin()

def add_custom_fields_to_attendance():
    if not frappe.db.exists('Custom Field', 'Attendance-custom_hora_de_entrada'):
        frappe.get_doc({
            'doctype': 'Custom Field',
            'dt': 'Attendance',
            'fieldname': 'custom_hora_de_entrada',
            'label': 'Hora de Entrada',
            'fieldtype': 'Time',
            'insert_after': 'check_out'
        }).insert()

    if not frappe.db.exists('Custom Field', 'Attendance-custom_hora_de_salida'):
        frappe.get_doc({
            'doctype': 'Custom Field',
            'dt': 'Attendance',
            'fieldname': 'custom_hora_de_salida',
            'label': 'Hora de Salida',
            'fieldtype': 'Time',
            'insert_after': 'custom_hora_de_entrada'
        }).insert()
    
    if not frappe.db.exists('Custom Field', 'Attendance-custom_tipo_de_registro'):
        frappe.get_doc({
            'doctype': 'Custom Field',
            'dt': 'Attendance',
            'fieldname': 'custom_tipo_de_registro',
            'label': 'Tipo de Registro',
            'fieldtype': 'Select',
            'options': 'In\nOut',
            'insert_after': 'custom_hora_de_entrada'
        }).insert()

def add_custom_fields_to_checkin():
    if not frappe.db.exists('Custom Field', 'Employee Checkin-custom_motivos_de_la_parada'):
        frappe.get_doc({
            'doctype': 'Custom Field',
            'dt': 'Employee Checkin',
            'fieldname': 'custom_motivos_de_la_parada',
            'label': 'Motivo',
            'fieldtype': 'Data',
            'insert_after': 'log_type'
        }).insert()
