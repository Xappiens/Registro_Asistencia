import frappe

@frappe.whitelist()
def check_employee():
    user = frappe.session.user
    response = {"status": "", "employee_name": "", "employee_id": ""}

    if user == "Guest":
        response["status"] = "Guest"
    else:
        # Obtener tanto el ID del empleado como el nombre del empleado
        employee = frappe.db.get_value("Employee", {"user_id": user}, ["name", "employee_name"], as_dict=True)
        
        if employee:
            response["status"] = "Employee"
            response["employee_name"] = employee.get("employee_name", "No Name")
            response["employee_id"] = employee["name"]
        else:
            response["status"] = "Not Employee"

    frappe.response["message"] = response
