import os
import sys
import webbrowser

from app import app, database

if __name__ == '__main__':
    print("=" * 60)
    print(" [KRRI] 한국철도기술연구원 보직자용 직원 KPI 관리 대시보드")
    print("=" * 60)
    print(" DataBase Initializing...")
    database.init_db()
    print(" DB Ready!")
    print(" Server Starting: http://localhost:5000")
    print(" Press Ctrl+C to stop.")
    print("=" * 60)
    
    # 웹 브라우저 자동 오픈
    try:
        webbrowser.open('http://localhost:5000')
    except Exception:
        pass

    app.run(host='0.0.0.0', port=5000, debug=True)
