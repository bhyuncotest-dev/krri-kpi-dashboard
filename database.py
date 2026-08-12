import sqlite3
import os
import shutil

# Vercel Serverless 환경 감지 및 /tmp 디렉토리 사용 설정
if os.environ.get('VERCEL') or os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
    DB_PATH = '/tmp/krri_kpi.db'
    local_db = os.path.join(os.path.dirname(__file__), 'krri_kpi.db')
    if not os.path.exists(DB_PATH) and os.path.exists(local_db):
        try:
            shutil.copyfile(local_db, DB_PATH)
        except Exception:
            pass
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), 'krri_kpi.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. 부서 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            head_name TEXT NOT NULL,
            target_score REAL DEFAULT 90.0
        )
    ''')
    
    # 2. 직원 테이블 (휴가일수 및 직속팀 여부 포함)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            emp_no TEXT UNIQUE NOT NULL,
            department_id INTEGER,
            position TEXT NOT NULL,
            title TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            avatar_color TEXT,
            total_vacation INTEGER DEFAULT 15,
            used_vacation REAL DEFAULT 0.0,
            is_my_team INTEGER DEFAULT 0,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')

    # 기존 DB 컬럼 마이그레이션 호환 처리
    cursor.execute("PRAGMA table_info(employees)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'total_vacation' not in columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN total_vacation INTEGER DEFAULT 15")
    if 'used_vacation' not in columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN used_vacation REAL DEFAULT 0.0")
    if 'is_my_team' not in columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN is_my_team INTEGER DEFAULT 0")
    
    # 3. KPI 카테고리 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kpi_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            unit TEXT NOT NULL,
            weight REAL NOT NULL
        )
    ''')

    # 4. 직원별 KPI 목표 및 실적 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kpi_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            year INTEGER DEFAULT 2026,
            quarter INTEGER DEFAULT 1,
            target_val REAL NOT NULL,
            actual_val REAL NOT NULL,
            self_score REAL DEFAULT 0.0,
            manager_score REAL DEFAULT 0.0,
            status TEXT DEFAULT '진행중',
            feedback TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees (id),
            FOREIGN KEY (category_id) REFERENCES kpi_categories (id)
        )
    ''')
    
    # 5. R&D 프로젝트 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            code TEXT NOT NULL,
            department_id INTEGER,
            lead_emp_id INTEGER,
            budget_million INTEGER NOT NULL,
            progress_pct INTEGER DEFAULT 0,
            target_year INTEGER DEFAULT 2026,
            status TEXT DEFAULT '진행중',
            FOREIGN KEY (department_id) REFERENCES departments (id),
            FOREIGN KEY (lead_emp_id) REFERENCES employees (id)
        )
    ''')
    
    # 시드 데이터 확인
    cursor.execute("SELECT COUNT(*) FROM departments")
    if cursor.fetchone()[0] == 0:
        seed_data(cursor)

    # 핵심 직속팀 직원(김일현 외 4인) 보장 인서트
    cursor.execute("SELECT COUNT(*) FROM employees WHERE is_my_team = 1")
    if cursor.fetchone()[0] == 0:
        seed_my_team(cursor)
        
    conn.commit()
    conn.close()

def seed_data(cursor):
    # 부서 데이터
    departments = [
        ('AI·디지털철도연구팀 (보직자 직속팀)', 'ADR', '김철수 본부장', 96.0),
        ('철도차량연구본부', 'RVD', '김철수 본부장', 95.0),
        ('철도구조물연구본부', 'RCD', '이영희 본부장', 92.0),
        ('철도전기신호연구본부', 'RED', '박진우 본부장', 88.0),
        ('스마트철도교통연구본부', 'SRD', '정민석 본부장', 94.0),
        ('미래가치연구실', 'FRL', '최윤정 실장', 90.0)
    ]
    cursor.executemany("INSERT INTO departments (name, code, head_name, target_score) VALUES (?, ?, ?, ?)", departments)

    # KPI 카테고리 생성 (철도연 특화)
    categories = [
        ('SCI/KCI 논문 게재', '건', 25.0),
        ('국내외 특허 출원 및 등록', '건', 20.0),
        ('기술이전 계약 실적', '백만원', 25.0),
        ('R&D 정부/민간 과제 수주', '백만원', 20.0),
        ('철도 현장 실증 및 시험', '건', 10.0)
    ]
    cursor.executemany("INSERT INTO kpi_categories (name, unit, weight) VALUES (?, ?, ?)", categories)

def seed_my_team(cursor):
    # 1. AI·디지털철도연구팀 부서 ID 가져오기
    cursor.execute("SELECT id FROM departments WHERE code = 'ADR'")
    dept_row = cursor.fetchone()
    dept_id = dept_row[0] if dept_row else 1

    # 2. 김일현, 김이현, 김삼현, 김사현, 김오현 직속팀 생성
    my_team_members = [
        ('김일현', 'KRRI-1001', dept_id, '수석연구원', 'AI철도연구팀장', 'ih.kim@krri.re.kr', '031-460-5001', '#0084FF', 18, 5.5, 1),
        ('김이현', 'KRRI-1002', dept_id, '책임연구원', '생성형AI연구원', 'eh.kim@krri.re.kr', '031-460-5002', '#00D26A', 15, 8.0, 1),
        ('김삼현', 'KRRI-1003', dept_id, '책임연구원', '스마트궤도선임', 'sh.kim@krri.re.kr', '031-460-5003', '#FF9F43', 15, 3.0, 1),
        ('김사현', 'KRRI-1004', dept_id, '선임연구원', '디지털트윈연구원', 'sah.kim@krri.re.kr', '031-460-5004', '#9E58FF', 15, 10.5, 1),
        ('김오현', 'KRRI-1005', dept_id, '연구원', '알고리즘연구원', 'oh.kim@krri.re.kr', '031-460-5005', '#FF4D4D', 15, 2.0, 1)
    ]

    for m in my_team_members:
        cursor.execute("""
            INSERT OR REPLACE INTO employees 
            (name, emp_no, department_id, position, title, email, phone, avatar_color, total_vacation, used_vacation, is_my_team)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, m)
        emp_id = cursor.lastrowid

        # KPI 항목 자동 추가
        default_kpis = [
            (emp_id, 1, 2026, 1, 4.0, 4.0, 95.0, 96.0, '우수', 'AI 기반 철도 저널 논문 게재'),
            (emp_id, 2, 2026, 1, 3.0, 3.0, 92.0, 95.0, '달성완료', '디지털 트윈 특허 출원'),
            (emp_id, 3, 2026, 1, 150.0, 160.0, 95.0, 98.0, '우수', '철도공단 기술이전 계약'),
            (emp_id, 4, 2026, 1, 400.0, 450.0, 90.0, 94.0, '달성완료', '정부 플래그십 과제 수주'),
            (emp_id, 5, 2026, 1, 2.0, 2.0, 90.0, 92.0, '달성완료', '오송 시험선 자율주행 실증')
        ]
        cursor.executemany("""
            INSERT INTO kpi_records 
            (employee_id, category_id, year, quarter, target_val, actual_val, self_score, manager_score, status, feedback)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, default_kpis)

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully with Team Members & Vacation Data at:", DB_PATH)
