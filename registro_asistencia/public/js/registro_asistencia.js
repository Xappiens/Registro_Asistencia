let appSettings = {};

// Llamada para cargar las pausas del día
function loadDailyBreaks() {
    const employeeId = document.getElementById('employee-id').value;

    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'get_daily_breaks', employee_id: employeeId },
        callback: function (response) {
            if (response.message) {
                //console.log("Breaks: ", response.message);
                updateBreakHistoryTable(response.message);
            }
        }
    });
}

// Actualización de la tabla con las pausas obtenidas
function updateBreakHistoryTable(breaks) {
    const tbody = document.querySelector('#breakSummary tbody');
    tbody.innerHTML = ''; // Clear the table before adding new rows

    // If time tracking is disabled, don't display time-related columns
    if (!appSettings.enable_time_tracking) return;

    // Add breaks to the table
    breaks.forEach((breakRecord) => {
        const row = document.createElement('tr');

        const motivoCell = document.createElement('td');
        motivoCell.textContent = breakRecord.reason || 'Sin motivo';
        row.appendChild(motivoCell);

        const startTimeCell = document.createElement('td');
        startTimeCell.textContent = breakRecord.start_time.split(' ')[1].slice(0, 5); // Mostrar solo HH:MM
        row.appendChild(startTimeCell);

        const endTimeCell = document.createElement('td');
        endTimeCell.textContent = breakRecord.end_time ? breakRecord.end_time.split(' ')[1].slice(0, 5) : '--:--';
        row.appendChild(endTimeCell);

        const durationCell = document.createElement('td');
        durationCell.textContent = breakRecord.duration || '--:--:--';
        row.appendChild(durationCell);

        tbody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    desactiveOptions();
    loadCurrentEmployee();
    loadDailyBreaks();
    showSection('attendance');
    loadEmployeeStatus();  // Cargar el estado actual del empleado para mantener los temporizadores activos
    showRecords('daily'); 
});

function showSection(sectionId) {
    const sections = document.querySelectorAll('.app-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

// Function to apply user settings
function desactiveOptions() {
    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.doctype.app_settings.app_settings.get_app_settings',
        callback: function(response) {
            appSettings = response.message || {};

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
    });
}

// Identificar empleado >> Llama API de Maxi
function loadCurrentEmployee() {
    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.check_employee.check_employee',
        callback: function (response) {
            const message = response.message;
            if (message.status === "Employee") {
                const employeeName = message.employee_name || "No name found";
                const employeeId = message.employee_id || "No ID found";
                document.getElementById('employee-id').innerHTML = `<option value="${employeeId}">${employeeName}</option>`;
                loadEmployeeStatus(employeeId); // Cargar estado del empleado para ajustar botones
                loadTasks(employeeId);
                loadTaskStatus(employeeId);
                loadWeeklyTasks(employeeId);
            } else {
                updateAttendanceMessage('Empleado no encontrado para el usuario actual.');
            }
        }
    });
}

function loadTasks(employeeId) {
    // Primero obtenemos las tareas asignadas al usuario actual desde ToDo
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'ToDo',
            fields: ['reference_name'],
            filters: {
                reference_type: 'Task',
                allocated_to: frappe.session.user
            },
            limit_page_length: 10000  // Ajusta este valor según el número máximo de registros que esperas
        },
        callback: function (response) {
            const taskNames = response.message.map(todo => todo.reference_name);
            if (taskNames.length > 0) {
                // Ahora obtenemos los detalles de las tareas basándonos en los nombres obtenidos
                frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Task',
                        fields: ['name', 'subject'],
                        filters: [
                            ['name', 'in', taskNames],
                            ['status', 'not in', ['Completed', 'Cancelled']]
                        ],
                        limit_page_length: 10000
                    },
                    callback: function (response) {
                        const taskSelect = document.getElementById('task-select');
                        if (response.message && response.message.length > 0) {
                            taskSelect.innerHTML = response.message.map(task => `<option value="${task.name}">${task.subject}</option>`).join('');
                        } else {
                            taskSelect.innerHTML = '<option>No se encontraron tareas</option>';
                        }
                    }
                });
            } else {
                // Si no se encuentran tareas asignadas
                const taskSelect = document.getElementById('task-select');
                taskSelect.innerHTML = '<option>No se encontraron tareas asignadas</option>';
            }
        }
    });
}

function loadEmployeeStatus(employeeId) {
    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'get_employee_status', employee_id: employeeId },
        callback: function (response) {
            const status = response.message.status;
            updateCheckInOutButtons(status);

            const totalWorkedHours = response.message.total_worked_hours || '00:00:00';
            document.getElementById('totalWorkedHours').textContent = totalWorkedHours;

            if (status === "checked_in") {
                const lastCheckInTime = new Date(response.message.last_check_in_time);
                if (lastCheckInTime) {
                    workStartTime = lastCheckInTime; // Establecer la hora de inicio
                    startWorkTimer(); // Iniciar el temporizador
                }
            }
        }
    });
}

function updateCheckInOutButtons(status) {
    const checkInButton = document.querySelector("#check-in-button");
    const checkOutButton = document.querySelector("#check-out-button");
    
    if (status === "checked_in") {
        checkInButton.disabled = true;
        checkOutButton.disabled = false;
    } else {
        checkInButton.disabled = false;
        checkOutButton.disabled = true;
    }
}

function updatePauseButtons(status) {
    const startPauseButton = document.querySelector("#start-pause-button");
    const endPauseButton = document.querySelector("#end-pause-button");
    
    if (status === "pause_started") {
        startPauseButton.disabled = true;
        endPauseButton.disabled = false;
    } else {
        startPauseButton.disabled = false;
        endPauseButton.disabled = true;
    }
}

// Variables para temporizador Check in & Check out
let workStartTime = null;
let workTimerInterval = null;

// Variables para temporizador Iniciar Pausa & Terminar Pausa
let pauseStartTime = null;
let pauseTimerInterval = null;
let totalWorkedSeconds = 0; // Para calcular el total de horas trabajadas
let totalPauseSeconds = 0;  // Para calcular el total de tiempo en pausas

// CHECK-IN
function checkIn() {
    const employeeId = document.getElementById('employee-id').value;
    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'check_in', employee: employeeId },
        callback: function(response) {
            if (response.message.success) {
                workStartTime = new Date();  // Usar la fecha actual
                startWorkTimer();  // Iniciar el temporizador
                document.getElementById('check-in-button').disabled = true;
                document.getElementById('check-out-button').disabled = false;
                document.getElementById('lastCheckInTime').textContent = `Último Check-In: ${response.message.check_in_time}`;
            } else {
                showAttendanceMessage(response.message.message || 'Error durante el Check-In');
            }
        }
    });
}

// CHECK-OUT
function checkOut() {
    const employeeId = document.getElementById('employee-id').value;
    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'check_out', employee: employeeId },
        callback: function(response) {
            if (response.message.success) {
                document.getElementById('lastCheckOutTime').textContent = `Último Check-Out: ${response.message.check_out_time}`;
                document.getElementById('lastCheckOutTime').style.display = 'block'; // Mostrar Último Check-Out
                document.getElementById('check-out-button').disabled = true;
                showAttendanceMessage(''); // Limpiar mensaje
                
                // Detener el temporizador
                stopWorkTimer();
            } else {
                showAttendanceMessage(response.message.message || 'Error durante el Check-Out');
            }
        }
    });
}

// Iniciar el temporizador de trabajo
function startWorkTimer() {
    if (!workStartTime) return;

    updateWorkTimerDisplay(); 
    workTimerInterval = setInterval(updateWorkTimerDisplay, 1000);
    document.getElementById('workTimerDisplay').style.display = 'block';
}

// Detener el temporizador de trabajo
function stopWorkTimer() {
    clearInterval(workTimerInterval);
    document.getElementById('workTimerDisplay').style.display = 'none';
}

function updateWorkTimerDisplay() {
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - workStartTime) / 1000);

    if (elapsedSeconds >= 0) {
        document.getElementById('workTimerDisplay').textContent = formatTime(elapsedSeconds);
    }
}

// Iniciar el temporizador de pausa
function startPauseTimer() {
    if (!pauseStartTime) return;

    // Calcular el tiempo transcurrido y actualizar el temporizador
    updatePauseTimerDisplay();
    pauseTimerInterval = setInterval(updatePauseTimerDisplay, 1000);
    document.getElementById('timerDisplay').style.display = 'block';
}

// INICIO PAUSA
function startPause() {
    const employeeId = document.getElementById('employee-id').value;
    const pauseReason = document.getElementById('pause-reason').value.trim();
    
    if (!pauseReason) {
        showPauseMessage('Por favor, ingrese el motivo de la pausa.', true);
        return;
    }

    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'break_start', employee: employeeId, reason: pauseReason },
        callback: function(response) {
            if (response.message.success) {
                const pauseStartTimeElement = document.getElementById('pauseStartTime');
                pauseStartTimeElement.textContent = `Inicio de Pausa: ${response.message.start_time}`;
                pauseStartTimeElement.style.display = 'block'; 

                pauseStartTime = new Date();
                pauseTimerInterval = setInterval(updatePauseTimerDisplay, 1000);

                document.getElementById('timerDisplay').style.display = 'block';
                document.getElementById('start-pause-button').disabled = true;
                document.getElementById('end-pause-button').disabled = false;
                showPauseMessage(''); 

                const tbody = document.querySelector('#breakSummary tbody');
                const row = document.createElement('tr');

                const motivoCell = document.createElement('td');
                motivoCell.textContent = pauseReason || 'Sin motivo';
                row.appendChild(motivoCell);

                const startTimeCell = document.createElement('td');
                startTimeCell.textContent = response.message.start_time;
                row.appendChild(startTimeCell);

                const endTimeCell = document.createElement('td');
                endTimeCell.textContent = '--:--';
                row.appendChild(endTimeCell);

                const durationCell = document.createElement('td');
                durationCell.textContent = '--:--';
                row.appendChild(durationCell);

                tbody.appendChild(row);
            } else {
                showPauseMessage(response.message.message || 'Error durante el inicio de la pausa', true);
            }
        }
    });
}

// FIN PAUSA
function endPause() {
    const employeeId = document.getElementById('employee-id').value;

    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'break_end', employee: employeeId },
        callback: function(response) {
            if (response.message.success) {
                const pauseEndTimeElement = document.getElementById('pauseEndTime');
                pauseEndTimeElement.textContent = `Fin de Pausa: ${response.message.end_time}`;
                pauseEndTimeElement.style.display = 'block'; 

                clearInterval(pauseTimerInterval);
                document.getElementById('timerDisplay').style.display = 'none'; 

                document.getElementById('end-pause-button').disabled = true;
                document.getElementById('start-pause-button').disabled = false;
                showPauseMessage(''); 

                const lastRow = document.querySelector('#breakSummary tbody tr:last-child');
                if (lastRow) { 
                    lastRow.cells[2].textContent = response.message.end_time; 
                    lastRow.cells[3].textContent = response.message.duration; 

                    // Actualizar el total de tiempo en pausas
                    const durationParts = response.message.duration.split(':');
                    totalPauseSeconds += parseInt(durationParts[0]) * 3600 + parseInt(durationParts[1]) * 60 + parseInt(durationParts[2]);
                    document.getElementById('totalPauseTime').textContent = formatTime(totalPauseSeconds);
                } else {
                    console.error('No se encontró la fila para actualizar.');
                }
            } else {
                showPauseMessage(response.message.message || 'Error durante el fin de la pausa', true);
            }
        }
    });
}

// Actualización del temporizador de pausa
function updatePauseTimerDisplay() {
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - pauseStartTime) / 1000);

    if (elapsedSeconds >= 0) {
        const formattedTime = formatTime(elapsedSeconds);
        document.getElementById('timerDisplay').textContent = formattedTime;
    }
}

// Actualización del temporizador de pausa
function updateTimerDisplay() {
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - pauseStartTime) / 1000);

    if (elapsedSeconds >= 0) {
        document.getElementById('timerDisplay').textContent = formatTime(elapsedSeconds);
    }
}

// Funciones para mostrar mensajes específicos en cada tarjeta
function showAttendanceMessage(message) {
    const attendanceMessageElement = document.getElementById('attendanceMessage');
    attendanceMessageElement.textContent = message;
    attendanceMessageElement.style.display = 'block';
}

function showPauseMessage(message, isError = false) {
    const pauseMessageElement = document.getElementById('pauseMessage');
    pauseMessageElement.textContent = message;
    pauseMessageElement.style.display = 'block';
    pauseMessageElement.className = 'status-message';
    if (isError) {
        pauseMessageElement.classList.add('error');
    }
}

// Actualización del temporizador de tarea
function updateTaskTimerDisplay() {
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - taskStartTime) / 1000);
    document.getElementById('taskTimerDisplay').textContent = `Tiempo en Tarea: ${formatTime(elapsedSeconds)}`;
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

function pad(number) {
    return number < 10 ? '0' + number : number;
}

function showRecords(recordType) {
    const dailySummary = document.getElementById('dailySummary');
    const weeklySummary = document.getElementById('weeklySummary');
    const monthlySummary = document.getElementById('monthlySummary');

    dailySummary.style.display = 'none';
    weeklySummary.style.display = 'none';
    monthlySummary.style.display = 'none';

    if (recordType === 'daily') {
        dailySummary.style.display = 'block';
    } else if (recordType === 'weekly') {
        weeklySummary.style.display = 'block';
    } else if (recordType === 'monthly') {
        monthlySummary.style.display = 'block';
    }
}

// LÓGICA SECCIÓN DE TAREAS

let taskTimerInterval;

// Cargar el Time Sheet semanal o crear uno si no existe
function loadWeeklyTimeSheet() {
    const employeeId = document.getElementById('employee-id').value;
    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'get_or_create_weekly_timesheet', employee_id: employeeId },
        callback: function (response) {
            if (response.message.success) {
                //console.log('Time Sheet Semanal Cargado/Creado:', response.message.timesheet_id);
                loadTasks(employeeId); // Cargar las tareas asignadas después de cargar el Time Sheet
                checkTaskStatus(); // Verificar el estado de la tarea después de cargar el Time Sheet
            } else {
                console.error('Error al cargar/crear el Time Sheet Semanal:', response.message.error);
            }
        }
    });
}

// Iniciar una tarea
function startTask() {
    const employeeId = document.getElementById('employee-id').value;
    const taskName = document.getElementById('task-select').value;

    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: {
            method: 'start_task',
            employee: employeeId,
            task_name: taskName
        },
        callback: function(response) {
            if (response.message.success) {
                //console.log("Tarea iniciada correctamente.");
                disableStartTaskButton();
                enableEndTaskButton();
                document.getElementById('task-select').disabled = true;

                const fromTime = response.message.start_time || new Date(); 
                startTaskTimer(fromTime);
            } else {
                alert(`Ya hay una tarea en curso: ${response.message.message}`);
            }
        }
    });
}

// Finalizar una tarea
function endTask() {
    const employeeId = document.getElementById('employee-id').value;
    const taskName = document.getElementById('task-select').value;

    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'end_task', employee: employeeId, task_name: taskName },
        callback: function(response) {
            if (response.message.success) {
                //console.log("Tarea finalizada correctamente.");
                clearTaskTimer();
                document.getElementById('taskTimerDisplay').textContent = 'Tiempo en Tarea: 00:00:00';
                enableStartTaskButton();
                disableEndTaskButton();
                document.getElementById('task-select').disabled = false;
            } else {
                alert(response.message.message);
            }
        }
    });
}

// Verificación del estado de la tarea al cargar la página
function checkTaskStatus() {
    const employeeId = document.getElementById('employee-id').value;

    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'get_task_status', employee: employeeId },
        callback: function (response) {
            const taskSelect = document.getElementById('task-select');
            const taskInProgress = response.message.task_in_progress;
            const ongoingTaskName = response.message.ongoing_task_name;

            if (taskInProgress) {
                disableStartTaskButton();
                enableEndTaskButton();
                taskSelect.disabled = true;
            } else {
                enableStartTaskButton();
                disableEndTaskButton();
                taskSelect.disabled = false;
            }
        }
    });
}

function disableStartTaskButton() {
    document.getElementById('start-task-button').disabled = true;
}

function enableStartTaskButton() {
    document.getElementById('start-task-button').disabled = false;
}

function disableEndTaskButton() {
    document.getElementById('end-task-button').disabled = true;
}

function enableEndTaskButton() {
    document.getElementById('end-task-button').disabled = false;
}

function loadTaskStatus(employeeId) {
    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'get_task_status', employee_id: employeeId },
        callback: function (response) {
            console.log("Respuesta:", response);
            const status = response.message.task_in_progress;
            const task = response.message.ongoing_task_name;
            const from_time = response.message.from_time_task;
            updateTaskButtons(status);
            currentTaskinProgress(task);
            if (status && from_time) {
                startTaskTimer(from_time);
            }
        }
    });
}

function updateTaskButtons(status) {
    const startTaskButton = document.querySelector("#start-task-button");
    const endTaskButton = document.querySelector("#end-task-button");

    if (status) {
        startTaskButton.disabled = true;
        endTaskButton.disabled = false;
    } else {
        startTaskButton.disabled = false;
        endTaskButton.disabled = true;
    }
}

function currentTaskinProgress(task) {
    const taskSelect = document.getElementById('task-select');
    

    if (taskSelect) {
        taskSelect.value = task;
        console.log(taskSelect.value)
    } else {
        console.error('El elemento task-select no existe en el DOM.');
    }
}

// Función para iniciar el temporizador de tareas
function startTaskTimer(fromTime) {
    clearTaskTimer();

    const fromTimeDate = new Date(fromTime); 

    function updateTimer() {
        const currentTime = new Date();
        const elapsedTime = currentTime - fromTimeDate; 

        const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
        const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

        const formattedTime = 
            (hours < 10 ? "0" : "") + hours + ":" + 
            (minutes < 10 ? "0" : "") + minutes + ":" + 
            (seconds < 10 ? "0" : "") + seconds;

        const timerDisplay = document.getElementById("taskTimerDisplay");
        if (timerDisplay) {
            timerDisplay.textContent = "Tiempo en Tarea: " + formattedTime;
        }
    }

    taskTimerInterval = setInterval(updateTimer, 1000);
}

// Función para detener el temporizador de tareas
function clearTaskTimer() {
    if (taskTimerInterval) {
        clearInterval(taskTimerInterval);
        taskTimerInterval = null;
    }
}

// Llamada para cargar las tareas de la semana
function loadWeeklyTasks(employeeId) {
    frappe.call({
        method: 'registro_asistencia.registro_de_asistencia.registro_asistencia.registro_asistencia',
        args: { method: 'get_today_tasks', employee_id: employeeId },
        callback: function (response) {
            //console.log("Respuesta recibida:", response);

            if (response.message && response.message.length > 0) {
                //console.log("Weekly Tasks: ", response.message);
                updateTaskHistoryTable(response.message);
            } else {
                console.error("No se recibieron tareas o la lista está vacía.");
            }
        }
    });
}

function updateTaskHistoryTable(tasks) {
    const tbody = document.querySelector('#taskSummary tbody');
    tbody.innerHTML = ''; // Clear the table before adding new rows
    let totalHours = 0;

    if (!appSettings.enable_task_tracking || !appSettings.enable_time_tracking) {
        // If task tracking or time tracking is disabled, return early without updating the table
        return;
    }

    tasks.forEach((taskRecord) => {
        const row = document.createElement('tr');

        const taskCell = document.createElement('td');
        const taskName = taskRecord.task_name || 'Sin tarea';
        const truncatedName = taskName.length > 50 ? taskName.slice(0, 50) + '...' : taskName;

        taskCell.innerHTML = `<span data-toggle="tooltip" title="${taskName}">${truncatedName}</span>`;
        row.appendChild(taskCell);

        const startTimeCell = document.createElement('td');
        startTimeCell.textContent = taskRecord.from_time ? taskRecord.from_time.split(' ')[1].slice(0, 5) : '--:--';
        row.appendChild(startTimeCell);

        const endTimeCell = document.createElement('td');
        endTimeCell.textContent = taskRecord.to_time ? taskRecord.to_time.split(' ')[1].slice(0, 5) : '--:--';
        row.appendChild(endTimeCell);

        const durationCell = document.createElement('td');
        durationCell.textContent = taskRecord.duration ? taskRecord.duration.toFixed(2) + ' hrs' : '--:--';
        row.appendChild(durationCell);

        totalHours += taskRecord.duration ? parseFloat(taskRecord.duration) : 0;

        tbody.appendChild(row);
    });

    // Update total hours only if time tracking is enabled
    if (appSettings.enable_time_tracking) {
        document.getElementById('totalHours').textContent = totalHours.toFixed(2) + ' hrs';
    }
}
