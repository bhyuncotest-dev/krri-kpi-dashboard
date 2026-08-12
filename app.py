from flask import Flask, render_template, request, jsonify
import database
import sqlite3

app = Flask(__name__)

# 데이터베이스 초기화
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/employees')
def employees():
    return render_template('employees.html')

@app.route('/projects')
def projects():
    return render_template('projects.html')

@app.route('/reports')
def reports():
    return render_template('reports.html')

# ==================== API ENDPOINTS ====================

@app.route('/api/dashboard_summary')
def get_dashboard_summary():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    # 1. 총 직원 수
    cursor.execute("SELECT COUNT(*) FROM employees")
    total_employees = cursor.fetchone()[0]
    
    # 2. 총 부서 수
    cursor.execute("SELECT COUNT(*) FROM departments")
    total_departments = cursor.fetchone()[0]

    # 3. 누적 실적 집계 (논문건수, 특허건수, 기술이전금액, R&D수주액)
    # category 1: 논문, 2: 특허, 3: 기술이전(백만원), 4: R&D수주(백만원), 5: 현장실증
    cursor.execute("""
        SELECT category_id, SUM(target_val) as total_target, SUM(actual_val) as total_actual
        FROM kpi_records
        GROUP BY category_id
    """)
    cat_summary = {row['category_id']: dict(row) for row in cursor.fetchall()}
    
    # 4. 전체 평균 보직자 평가 점수
    cursor.execute("SELECT AVG(manager_score) FROM kpi_records")
    avg_manager_score = round(cursor.fetchone()[0] or 0.0, 1)

    # 5. 본부별 평균 달성률 및 점수
    cursor.execute("""
        SELECT d.id, d.name, d.code, d.head_name, d.target_score,
               COUNT(DISTINCT e.id) as emp_count,
               AVG(r.manager_score) as avg_score,
               AVG(CASE WHEN r.target_val > 0 THEN (r.actual_val / r.target_val) * 100 ELSE 100 END) as avg_achieve_pct
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id
        LEFT JOIN kpi_records r ON e.id = r.employee_id
        GROUP BY d.id
    """)
    dept_performance = []
    for row in cursor.fetchall():
        dept_performance.append({
            'id': row['id'],
            'name': row['name'],
            'code': row['code'],
            'head_name': row['head_name'],
            'target_score': row['target_score'],
            'emp_count': row['emp_count'],
            'avg_score': round(row['avg_score'] or 0.0, 1),
            'avg_achieve_pct': round(row['avg_achieve_pct'] or 0.0, 1)
        })

    # 6. 우수 성과 연구원 Top 5
    cursor.execute("""
        SELECT e.id, e.name, e.position, d.name as dept_name, e.avatar_color,
               AVG(r.manager_score) as overall_score
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        JOIN kpi_records r ON e.id = r.employee_id
        GROUP BY e.id
        ORDER BY overall_score DESC
        LIMIT 5
    """)
    top_performers = []
    for row in cursor.fetchall():
        top_performers.append({
            'id': row['id'],
            'name': row['name'],
            'position': row['position'],
            'dept_name': row['dept_name'],
            'avatar_color': row['avatar_color'],
            'overall_score': round(row['overall_score'], 1)
        })

    # 7. 관심 필요 직원 (지연/미달성 경고 등)
    cursor.execute("""
        SELECT DISTINCT e.id, e.name, e.position, d.name as dept_name, r.status, r.feedback,
               AVG(r.manager_score) as overall_score
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        JOIN kpi_records r ON e.id = r.employee_id
        WHERE r.status = '지연경고' OR r.manager_score < 75
        GROUP BY e.id
        ORDER BY overall_score ASC
    """)
    warning_employees = []
    for row in cursor.fetchall():
        warning_employees.append({
            'id': row['id'],
            'name': row['name'],
            'position': row['position'],
            'dept_name': row['dept_name'],
            'status': row['status'],
            'feedback': row['feedback'],
            'overall_score': round(row['overall_score'], 1)
        })

    conn.close()

    return jsonify({
        'total_employees': total_employees,
        'total_departments': total_departments,
        'avg_manager_score': avg_manager_score,
        'cat_summary': cat_summary,
        'dept_performance': dept_performance,
        'top_performers': top_performers,
        'warning_employees': warning_employees
    })

@app.route('/api/employees')
def get_employees():
    dept_id = request.args.get('dept_id', type=int)
    search_q = request.args.get('q', type=str, default='').strip()
    
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT e.id, e.name, e.emp_no, e.position, e.title, e.email, e.phone, e.avatar_color,
               d.id as dept_id, d.name as dept_name,
               AVG(r.manager_score) as avg_score,
               AVG(r.self_score) as avg_self_score,
               COUNT(r.id) as kpi_count
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN kpi_records r ON e.id = r.employee_id
        WHERE 1=1
    """
    params = []

    if dept_id:
        query += " AND e.department_id = ?"
        params.append(dept_id)
        
    if search_q:
        query += " AND (e.name LIKE ? OR e.emp_no LIKE ? OR e.position LIKE ? OR d.name LIKE ?)"
        pattern = f"%{search_q}%"
        params.extend([pattern, pattern, pattern, pattern])

    query += " GROUP BY e.id ORDER BY avg_score DESC"

    cursor.execute(query, params)
    employees_list = []
    for row in cursor.fetchall():
        employees_list.append({
            'id': row['id'],
            'name': row['name'],
            'emp_no': row['emp_no'],
            'position': row['position'],
            'title': row['title'],
            'email': row['email'],
            'phone': row['phone'],
            'avatar_color': row['avatar_color'],
            'dept_id': row['dept_id'],
            'dept_name': row['dept_name'],
            'avg_score': round(row['avg_score'] or 0.0, 1),
            'avg_self_score': round(row['avg_self_score'] or 0.0, 1),
            'kpi_count': row['kpi_count']
        })

    cursor.execute("SELECT id, name FROM departments")
    departments = [{'id': r['id'], 'name': r['name']} for r in cursor.fetchall()]

    conn.close()
    return jsonify({
        'employees': employees_list,
        'departments': departments
    })

@app.route('/api/employee/<int:emp_id>')
def get_employee_detail(emp_id):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT e.*, d.name as dept_name, d.code as dept_code
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.id = ?
    """, (emp_id,))
    emp_row = cursor.fetchone()
    if not emp_row:
        conn.close()
        return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404

    employee = dict(emp_row)

    cursor.execute("""
        SELECT r.*, c.name as category_name, c.unit, c.weight
        FROM kpi_records r
        JOIN kpi_categories c ON r.category_id = c.id
        WHERE r.employee_id = ?
        ORDER BY c.id ASC
    """, (emp_id,))
    
    kpis = []
    for r in cursor.fetchall():
        item = dict(r)
        achieve_pct = round((item['actual_val'] / item['target_val'] * 100), 1) if item['target_val'] > 0 else 100.0
        item['achieve_pct'] = achieve_pct
        kpis.append(item)

    conn.close()
    return jsonify({
        'employee': employee,
        'kpis': kpis
    })

@app.route('/api/kpi/update', methods=['POST'])
def update_kpi_record():
    data = request.get_json()
    record_id = data.get('record_id')
    actual_val = data.get('actual_val')
    manager_score = data.get('manager_score')
    status = data.get('status')
    feedback = data.get('feedback')

    if not record_id:
        return jsonify({'error': 'record_id가 필요합니다.'}), 400

    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE kpi_records
        SET actual_val = ?, manager_score = ?, status = ?, feedback = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (actual_val, manager_score, status, feedback, record_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'KPI 실적 및 보직자 평가가 성공적으로 업데이트되었습니다.'})

@app.route('/api/projects')
def get_projects():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.*, d.name as dept_name, e.name as lead_name, e.position as lead_position
        FROM projects p
        LEFT JOIN departments d ON p.department_id = d.id
        LEFT JOIN employees e ON p.lead_emp_id = e.id
        ORDER BY p.budget_million DESC
    """)
    projects_list = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    return jsonify({'projects': projects_list})

@app.route('/api/employee/add', methods=['POST'])
def add_employee():
    data = request.get_json()
    name = data.get('name')
    emp_no = data.get('emp_no')
    dept_id = data.get('dept_id')
    position = data.get('position', '선임연구원')
    title = data.get('title', '연구원')
    email = data.get('email', f"{emp_no.lower()}@krri.re.kr")
    phone = data.get('phone', '031-460-5000')

    if not name or not emp_no or not dept_id:
        return jsonify({'error': '이름, 사번, 부서는 필수 입력 항목입니다.'}), 400

    conn = database.get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO employees (name, emp_no, department_id, position, title, email, phone, avatar_color)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, emp_no, dept_id, position, title, email, phone, '#0084FF'))
        emp_id = cursor.lastrowid

        # 기본 KPI 항목 5개 자동 추가
        default_kpis = [
            (emp_id, 1, 2026, 1, 3.0, 0.0, 70.0, 70.0, '진행중', '신규 등록'),
            (emp_id, 2, 2026, 1, 2.0, 0.0, 70.0, 70.0, '진행중', '신규 등록'),
            (emp_id, 3, 2026, 1, 50.0, 0.0, 70.0, 70.0, '진행중', '신규 등록'),
            (emp_id, 4, 2026, 1, 200.0, 0.0, 70.0, 70.0, '진행중', '신규 등록'),
            (emp_id, 5, 2026, 1, 1.0, 0.0, 70.0, 70.0, '진행중', '신규 등록')
        ]
        cursor.executemany("""
            INSERT INTO kpi_records 
            (employee_id, category_id, year, quarter, target_val, actual_val, self_score, manager_score, status, feedback)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, default_kpis)

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '신규 직원이 등록되었습니다.'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': '이미 존재하거나 중복된 사번입니다.'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
