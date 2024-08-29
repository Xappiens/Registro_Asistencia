import frappe

@frappe.whitelist(allows_guest=True)
def registro_asistencia():
    # Check-in
    if frappe.form_dict.method == "check_in":
        employee = frappe.form_dict.employee
        now = frappe.utils.now()  # Usar now() para evitar posibles problemas

        # Verificar si ya existe asistencia para el día actual
        existing_attendance = frappe.get_list("Attendance", filters={
            "employee": employee,
            "attendance_date": frappe.utils.today()  # Usar today() para evitar problemas
        }, fields=["name"])

        if existing_attendance:
            frappe.response["message"] = {"success": False, "message": f"Asistencia ya registrada para {frappe.utils.today()}"}
        else:
            # Crear nueva asistencia
            attendance = frappe.get_doc({
                "doctype": "Attendance",
                "employee": employee,
                "attendance_date": frappe.utils.today(),
                "status": "Present",
                "custom_hora_de_entrada": now
            })
            attendance.insert(ignore_permissions=True)

            # Formatear la hora a solo HH:MM
            formatted_time = now.split(' ')[1][:5]
            frappe.response["message"] = {"success": True, "check_in_time": formatted_time}
        
    # Check-Out
    if frappe.form_dict.method == "check_out":
        employee = frappe.form_dict.employee
        now = frappe.utils.now()  # Get current time

        # Find today's attendance
        attendance = frappe.get_list("Attendance", filters={
            "employee": employee,
            "attendance_date": frappe.utils.today(),
            "status": "Present"  # Assuming "Present" is the status used when checked in
        }, fields=["name", "custom_hora_de_entrada"])

        if not attendance:
            frappe.response["message"] = {"success": False, "message": "No hay un check-in registrado."}
        else:
            # Update attendance with check-out time and calculate hours
            attendance_doc = frappe.get_doc("Attendance", attendance[0].name)
            attendance_doc.custom_hora_de_salida = frappe.utils.now_datetime()

            # Ensure both times are datetime objects
            if isinstance(attendance_doc.custom_hora_de_entrada, str):
                attendance_doc.custom_hora_de_entrada = frappe.utils.get_datetime(attendance_doc.custom_hora_de_entrada)
            
            attendance_doc.working_hours = (attendance_doc.custom_hora_de_salida - attendance_doc.custom_hora_de_entrada).total_seconds() / 3600.0
            attendance_doc.status = "Present"  # Ensure this is a valid status based on your settings
            attendance_doc.save(ignore_permissions=True)

            # Format the time to HH:MM for display
            formatted_time = frappe.utils.now().split(' ')[1][:5]
            frappe.response["message"] = {"success": True, "check_out_time": formatted_time}

    # Iniciar Pausa
    if frappe.form_dict.method == "break_start":
        employee = frappe.form_dict.employee
        reason = frappe.form_dict.reason
        now = frappe.utils.now()  # Obtener la hora actual

        # Verificar si el empleado ha hecho check-in hoy
        today = frappe.utils.today()
        attendance = frappe.get_list("Attendance", filters={
            "employee": employee,
            "attendance_date": today,
            "status": "Present"
        }, fields=["name"])

        if not attendance:
            frappe.response["message"] = {
                "success": False,
                "message": "No puede iniciar una pausa sin hacer check-in primero."
            }
        else:
            # Crear un nuevo registro para el inicio de la pausa
            start_pause = frappe.get_doc({
                "doctype": "Employee Checkin",
                "employee": employee,
                "time": now,
                "log_type": "OUT",
                "custom_motivos_de_la_parada": reason
            })
            start_pause.insert(ignore_permissions=True)
            frappe.response["message"] = {
                "success": True,
                "start_time": now.split(' ')[1][:5]  # Hora formateada a HH:MM
            }

    # Terminar Pausa
    elif frappe.form_dict.method == "break_end":
        employee = frappe.form_dict.employee
        now = frappe.utils.now()  # Obtener la hora actual

        # Buscar el último registro de inicio de pausa
        last_pause = frappe.get_list("Employee Checkin", filters={
            "employee": employee,
            "time": [">=", frappe.utils.today()],
            "log_type": "OUT"  # Busca solo la pausa iniciada (OUT)
        }, fields=["name"], order_by="time desc", limit=1)

        if not last_pause:
            frappe.response["message"] = {"success": False, "message": "No hay una pausa en progreso para finalizar."}
        else:
            # Crear un nuevo registro para el final de la pausa
            end_pause = frappe.get_doc({
                "doctype": "Employee Checkin",
                "employee": employee,
                "time": now,
                "log_type": "IN"  # Registrar como IN para indicar el fin de la pausa
            })

            # Calcular la duración en horas, minutos y segundos
            duration = frappe.utils.time_diff_in_seconds(now, frappe.get_doc("Employee Checkin", last_pause[0].name).time)  # Duración en segundos
            end_pause.duration = f"{int(duration // 3600):02}:{int((duration % 3600) // 60):02}:{int(duration % 60):02}"  # Formato HH:MM:SS

            end_pause.insert(ignore_permissions=True)
            frappe.response["message"] = {"success": True, "end_time": now.split(' ')[1][:5], "duration": end_pause.duration}

    # Obtener pausas diarias
    elif frappe.form_dict.method == "get_daily_breaks":
        # Obtener el employee_id basado en el user_id de la sesión actual
        user_id = frappe.session.user
        employee_id = frappe.db.get_value("Employee", {"user_id": user_id}, "name")
        
        # Log para verificar el employee_id obtenido
        frappe.log_error(f"Employee ID: {employee_id}, Usuario: {user_id}")
        
        # Obtener la última fecha de registro de asistencia del empleado
        last_attendance = frappe.db.get_value(
            "Attendance", 
            {"employee": employee_id}, 
            "attendance_date", 
            order_by="attendance_date desc"
        )
        
        # Log para verificar la última fecha de asistencia
        frappe.log_error(f"Last Attendance Date: {last_attendance}")
        
        # Inicializar lista de pausas
        breaks_list = []

        if last_attendance:
            # Filtrar desde las 00:00 del último día de asistencia
            start_of_day = f"{last_attendance} 00:00:00"
            
            # Obtener todas las entradas de pausas del día
            daily_breaks = frappe.db.sql("""
                SELECT 
                    t1.custom_motivos_de_la_parada as reason,
                    t1.time as start_time,
                    (SELECT time FROM `tabEmployee Checkin` t2
                     WHERE t2.employee = t1.employee 
                     AND t2.log_type = 'IN' 
                     AND t2.time > t1.time 
                     ORDER BY t2.time ASC LIMIT 1) as end_time
                FROM `tabEmployee Checkin` t1
                WHERE t1.employee = %s 
                AND t1.log_type = 'OUT' 
                AND t1.time >= %s
                AND t1.custom_motivos_de_la_parada IS NOT NULL
                ORDER BY t1.time asc
            """, (employee_id, start_of_day), as_dict=True)

            
            # Log para verificar el resultado de daily_breaks
            frappe.log_error(f"Debug daily_breaks: {len(daily_breaks)}")
            
            # Calcular la duración de cada pausa sin importar datetime
            for break_record in daily_breaks:
                if break_record['end_time']:
                    # Convertir start_time y end_time a segundos desde la medianoche
                    start_time = frappe.utils.time_diff_in_seconds(break_record['end_time'], break_record['start_time'])
                    duration_seconds = start_time
                    hours = duration_seconds // 3600
                    minutes = (duration_seconds % 3600) // 60
                    seconds = duration_seconds % 60
                    break_record['duration'] = f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}"
                else:
                    break_record['duration'] = '--:--'

                # Añadir registro de pausa a la lista
                breaks_list.append(break_record)

        # Devolver la respuesta como un objeto JSON
        frappe.response["message"] = breaks_list

    # Obtener el estado del empleado
    elif frappe.form_dict.method == "get_employee_status":
        employee_id = frappe.form_dict.employee_id
        today = frappe.utils.today()

        # Obtener la asistencia del día actual
        attendance = frappe.get_list("Attendance", filters={
            "employee": employee_id,
            "attendance_date": today
        }, fields=["custom_hora_de_entrada", "custom_hora_de_salida"])

        if attendance and attendance[0].get("custom_hora_de_entrada"):
            check_in_time = attendance[0].custom_hora_de_entrada
            check_out_time = attendance[0].get("custom_hora_de_salida")
            
            if check_out_time:
                frappe.response["message"] = {
                    "status": "checked_out",
                    "last_check_in_time": None,
                    "total_worked_hours": "00:00:00"
                }
            else:
                # Calcular el tiempo transcurrido desde el check-in
                now = frappe.utils.now_datetime()
                total_worked_seconds = (now - check_in_time).total_seconds()

                # Calcular horas, minutos y segundos
                hours = total_worked_seconds // 3600
                minutes = (total_worked_seconds % 3600) // 60
                seconds = total_worked_seconds % 60

                # Formatear el tiempo trabajado en una cadena
                total_worked_hours = f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}"

                frappe.response["message"] = {
                    "status": "checked_in",
                    "last_check_in_time": check_in_time,
                    "total_worked_hours": total_worked_hours
                }
        else:
            frappe.response["message"] = {
                "status": "checked_out",
                "last_check_in_time": None,
                "total_worked_hours": "00:00:00"
            }

    # TAREAS
    if frappe.form_dict.method == "start_task":
        try:
            employee = frappe.form_dict.employee
            task_name = frappe.form_dict.task_name

            # Obtener las fechas de inicio (lunes) y fin (domingo) de la semana actual
            start_of_week = frappe.utils.get_first_day_of_week(frappe.utils.today())
            end_of_week = frappe.utils.get_last_day_of_week(frappe.utils.today())

            # Buscar o crear un Time Sheet para esta semana
            timesheet_name = frappe.db.get_value("Timesheet", {
                "employee": employee,
                "start_date": start_of_week,
            }, "name")

            if not timesheet_name:
                # Crear un nuevo Time Sheet si no existe
                timesheet_doc = frappe.get_doc({
                    "doctype": "Timesheet",
                    "employee": employee,
                    "employee_name": frappe.db.get_value("Employee", employee, "employee_name"),
                    "company": "Xappiens BI SLU",
                    "status": "Draft",
                    "start_date": start_of_week,
                    "end_date": end_of_week,
                    "time_logs": [
                        {
                            "from_time": frappe.utils.get_datetime(str(start_of_week) + " 00:00:00"),  # Lunes de la semana
                            "hours": 0.0,
                            "description": "Registro inicial para configurar fechas"
                        }
                    ]
                })
                timesheet_doc.insert(ignore_permissions=True)
            else:
                # Obtener el Timesheet existente
                timesheet_doc = frappe.get_doc("Timesheet", timesheet_name)

            # Verificar si ya hay una tarea en curso para la misma tarea
            ongoing_task = [d for d in timesheet_doc.time_logs if d.task and not d.to_time]

            if ongoing_task:
                frappe.response["message"] = {"success": False, "message": "Ya hay una tarea en curso."}
                frappe.log_error(f"ongoing_task")
            else:
                # Añadir una nueva entrada en la tabla hija 'time_logs' del Timesheet
                task_doc = frappe.get_doc("Task", {"name": task_name})
                new_time_log = {
                    "activity_type": "Ejecución",
                    "from_time": frappe.utils.now_datetime(),
                    "task": task_name,
                    "project": task_doc.project,
                    "hours": 0.0,
                    "description": f"Iniciando tarea {task_name}"
                }

                timesheet_doc.append("time_logs", new_time_log)
                timesheet_doc.save(ignore_permissions=True)

                frappe.response["message"] = {"success": True, "start_time": frappe.utils.now_datetime()}
        except Exception as e:
            frappe.log_error(f"Error en el método start_task: {str(e)}", "Debug API Error")

    # Finalizar una tarea
    elif frappe.form_dict.method == "end_task":
        try:
            employee = frappe.form_dict.employee
            task_name = frappe.form_dict.task_name

            # Obtener el Timesheet para esta semana
            start_of_week = frappe.utils.get_first_day_of_week(frappe.utils.today())
            timesheet_name = frappe.db.get_value("Timesheet", {
                "employee": employee,
                "start_date": start_of_week,
            }, "name")

            if timesheet_name:
                timesheet_doc = frappe.get_doc("Timesheet", timesheet_name)

                # Buscar la entrada de tarea en curso en la tabla time_logs
                ongoing_task = [d for d in timesheet_doc.time_logs if d.task == task_name and not d.to_time]

                if not ongoing_task:
                    frappe.response["message"] = {"success": False, "message": "No hay una tarea en curso registrada."}
                else:
                    task_log = ongoing_task[0]
                    task_log.to_time = frappe.utils.now_datetime()
                    timesheet_doc.save(ignore_permissions=True)
                    frappe.response["message"] = {"success": True, "end_time": task_log.to_time}
            else:
                frappe.response["message"] = {"success": False, "message": "No se encontró un Timesheet para esta semana."}
        except Exception as e:
            frappe.log_error(f"Error al finalizar la tarea: {str(e)}", "Debug API Error")
            frappe.response["message"] = {"success": False, "message": f"Error al finalizar la tarea: {str(e)}"}
        
    # Código para bloquear los botones
    # Verificar si hay una tarea en curso
    if frappe.form_dict.method == "get_task_status":
        employee = frappe.form_dict.employee_id

        # Obtener el Timesheet de la semana actual
        start_of_week = frappe.utils.get_first_day_of_week(frappe.utils.today())
        timesheet_name = frappe.db.get_value("Timesheet", {
            "employee": employee,
            "start_date": start_of_week,
        }, "name")

        task_in_progress = False
        ongoing_task_name = None
        from_time_task = None

        if timesheet_name:
            timesheet_doc = frappe.get_doc("Timesheet", timesheet_name)
            ongoing_task = [d for d in timesheet_doc.time_logs if d.task and not d.to_time]

            if ongoing_task:
                task_in_progress = True
                ongoing_task_name = ongoing_task[0].task  # Obtener el nombre de la tarea en curso
                from_time_task = ongoing_task[0].from_time

        frappe.response["message"] = {
            "task_in_progress": task_in_progress,
            "ongoing_task_name": ongoing_task_name,
            "from_time_task": from_time_task
        }
    
    # Obtener tareas semanales
    if frappe.form_dict.method == "get_today_tasks":
        
        employee_id = frappe.form_dict.employee_id

        # Obtener el Timesheet para la semana actual
        start_of_week = frappe.utils.get_first_day_of_week(frappe.utils.today())
        timesheet_name = frappe.db.get_value("Timesheet", {
            "employee": employee_id,
            "start_date": start_of_week,
        }, "name")

        frappe.log_error(f"Timesheet Name: {timesheet_name}", "Debug Timesheet")

        if timesheet_name:
            timesheet_doc = frappe.get_doc("Timesheet", timesheet_name)

            # Extraer los registros de time_logs para el día de hoy
            tasks = []
            today = frappe.utils.today()

            for log in timesheet_doc.time_logs:
                if log.task:
                    # Comparar el día de log.from_time con el día de hoy
                    if frappe.utils.getdate(log.from_time) == frappe.utils.getdate(today):
                        task_name = ""
                        if log.task:
                            task_doc = frappe.get_doc("Task", log.task)
                            task_name = task_doc.subject
                        task_data = {
                            "task_name": task_name,
                            "from_time": log.from_time,
                            "to_time": log.to_time,
                            "duration": log.hours,
                            "task": log.task
                        }
                        tasks.append(task_data)

            frappe.response["message"] = tasks
        else:
            frappe.response["message"] = []
            frappe.log_error("No Timesheet found", "Debug Timesheet")
