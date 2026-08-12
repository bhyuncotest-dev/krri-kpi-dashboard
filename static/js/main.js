// KRRI Executive KPI Dashboard JavaScript Logic

let currentEmployees = [];
let currentDepartments = [];
let activeDeptFilter = null;
let deptChartInstance = null;
let categoryChartInstance = null;

// ==================== DASHBOARD FUNCTIONS ====================

function loadDashboardData() {
    fetch('/api/dashboard_summary')
        .then(res => res.json())
        .then(data => {
            // Metrics cards update
            document.getElementById('metricAvgScore').innerHTML = `${data.avg_manager_score} <span style="font-size:16px; font-weight:normal;">점</span>`;
            
            if (data.cat_summary) {
                // Papers
                if (data.cat_summary[1]) {
                    document.getElementById('metricPapers').innerHTML = `${data.cat_summary[1].total_actual} / ${data.cat_summary[1].total_target} <span style="font-size:14px; font-weight:normal;">건</span>`;
                }
                // Patents
                if (data.cat_summary[2]) {
                    document.getElementById('metricPatents').innerHTML = `${data.cat_summary[2].total_actual} / ${data.cat_summary[2].total_target} <span style="font-size:14px; font-weight:normal;">건</span>`;
                }
                // Tech Transfer
                if (data.cat_summary[3]) {
                    document.getElementById('metricTechTransfer').innerHTML = `${data.cat_summary[3].total_actual.toLocaleString()} <span style="font-size:14px; font-weight:normal;">백만원</span>`;
                }
            }

            // Top Performers Table
            const topBody = document.getElementById('topPerformersBody');
            if (topBody) {
                topBody.innerHTML = data.top_performers.map((emp, index) => `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div class="user-avatar" style="background:${emp.avatar_color}; width:32px; height:32px; font-size:12px;">${emp.name[0]}</div>
                                <strong>${emp.name}</strong>
                            </div>
                        </td>
                        <td>${emp.dept_name}</td>
                        <td>${emp.position}</td>
                        <td><strong style="color:var(--accent-teal); font-size:15px;">${emp.overall_score}점</strong></td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick="openKpiModal(${emp.id})">
                                <i class="fa-solid fa-eye"></i> 보기
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // Warning Employees Table
            const warnBody = document.getElementById('warningBody');
            if (warnBody) {
                if (data.warning_employees.length === 0) {
                    warnBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">지연 및 유의 대상 연구원이 없습니다.</td></tr>`;
                } else {
                    warnBody.innerHTML = data.warning_employees.map(emp => `
                        <tr>
                            <td><strong>${emp.name}</strong> (${emp.position})</td>
                            <td>${emp.dept_name}</td>
                            <td><span class="badge badge-danger">${emp.status} (${emp.overall_score}점)</span></td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="openKpiModal(${emp.id})">
                                    <i class="fa-solid fa-pen"></i> 코칭
                                </button>
                            </td>
                        </tr>
                    `).join('');
                }
            }

            // Init Charts
            initCharts(data.dept_performance);
        })
        .catch(err => console.error('Dashboard load error:', err));
}

function initCharts(deptData) {
    const deptCtx = document.getElementById('deptChart');
    if (deptCtx) {
        if (deptChartInstance) deptChartInstance.destroy();
        
        const labels = deptData.map(d => d.code);
        const scores = deptData.map(d => d.avg_score);
        const targets = deptData.map(d => d.target_score);

        deptChartInstance = new Chart(deptCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '평균 달성점수',
                        data: scores,
                        backgroundColor: 'rgba(0, 132, 255, 0.85)',
                        borderColor: '#0084FF',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: '부서 목표점수',
                        data: targets,
                        backgroundColor: 'rgba(0, 210, 106, 0.3)',
                        borderColor: '#00D26A',
                        borderWidth: 2,
                        type: 'line'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 60,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#8A99AD' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8A99AD' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#F0F4F8' } }
                }
            }
        });
    }

    const catCtx = document.getElementById('categoryChart');
    if (catCtx) {
        if (categoryChartInstance) categoryChartInstance.destroy();

        categoryChartInstance = new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: ['논문 (25%)', '특허 (20%)', '기술이전 (25%)', 'R&D수주 (20%)', '현장실증 (10%)'],
                datasets: [{
                    data: [25, 20, 25, 20, 10],
                    backgroundColor: [
                        '#0084FF',
                        '#00D26A',
                        '#FF9F43',
                        '#9E58FF',
                        '#FF4D4D'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#F0F4F8', padding: 12, font: { size: 11 } }
                    }
                }
            }
        });
    }
}

// ==================== EMPLOYEE MANAGEMENT FUNCTIONS ====================

function loadEmployeesData() {
    fetch('/api/employees')
        .then(res => res.json())
        .then(data => {
            currentEmployees = data.employees;
            currentDepartments = data.departments;

            renderDeptFilters(data.departments);
            renderEmployeeGrid(currentEmployees);
        })
        .catch(err => console.error('Employees load error:', err));
}

function renderDeptFilters(departments) {
    const filterGroup = document.getElementById('deptFilterGroup');
    if (!filterGroup) return;

    let html = `<button class="btn ${activeDeptFilter === null ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterByDept(null, this)">전체 본부/실</button>`;
    departments.forEach(dept => {
        const isSelected = activeDeptFilter === dept.id;
        html += `<button class="btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="filterByDept(${dept.id}, this)">${dept.name}</button>`;
    });
    filterGroup.innerHTML = html;
}

function filterByDept(deptId, btnElem) {
    activeDeptFilter = deptId;
    renderDeptFilters(currentDepartments);

    let filtered = currentEmployees;
    if (deptId !== null) {
        filtered = currentEmployees.filter(e => e.dept_id === deptId);
    }
    renderEmployeeGrid(filtered);
}

function handleEmployeeSearch() {
    const query = document.getElementById('employeeSearchInput').value.toLowerCase().trim();
    let filtered = currentEmployees;

    if (activeDeptFilter !== null) {
        filtered = filtered.filter(e => e.dept_id === activeDeptFilter);
    }

    if (query) {
        filtered = filtered.filter(e => 
            e.name.toLowerCase().includes(query) ||
            e.emp_no.toLowerCase().includes(query) ||
            e.position.toLowerCase().includes(query) ||
            e.dept_name.toLowerCase().includes(query)
        );
    }

    renderEmployeeGrid(filtered);
}

function renderEmployeeGrid(employees) {
    const container = document.getElementById('employeeGridContainer');
    if (!container) return;

    if (employees.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">검색 조건에 해당되는 연구원이 없습니다.</div>`;
        return;
    }

    container.innerHTML = employees.map(emp => {
        let badgeClass = 'badge-info';
        if (emp.avg_score >= 90) badgeClass = 'badge-success';
        else if (emp.avg_score < 75) badgeClass = 'badge-danger';
        else if (emp.avg_score < 85) badgeClass = 'badge-warning';

        return `
            <div class="emp-card">
                <div>
                    <div class="emp-header">
                        <div class="emp-avatar" style="background:${emp.avatar_color || '#0084FF'}">${emp.name[0]}</div>
                        <div class="emp-meta">
                            <h3>${emp.name} <span style="font-size:12px; color:var(--accent-teal); font-weight:normal;">(${emp.emp_no})</span></h3>
                            <p>${emp.dept_name} | ${emp.position}</p>
                        </div>
                    </div>

                    <div class="emp-stats">
                        <div class="emp-stat-item">
                            <div class="lbl">자기평가</div>
                            <div class="val" style="color:var(--text-muted);">${emp.avg_self_score}점</div>
                        </div>
                        <div class="emp-stat-item">
                            <div class="lbl">보직자평가</div>
                            <div class="val">${emp.avg_score}점</div>
                        </div>
                        <div class="emp-stat-item">
                            <div class="lbl">등록 KPI</div>
                            <div class="val" style="color:white;">${emp.kpi_count}개</div>
                        </div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
                            <span style="color:var(--text-muted);">달성 종합 등급</span>
                            <span class="badge ${badgeClass}">${emp.avg_score >= 90 ? '우수 달성' : (emp.avg_score >= 80 ? '보통 달성' : '지연/개선필요')}</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${Math.min(emp.avg_score, 100)}%;"></div>
                        </div>
                    </div>
                </div>

                <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center;" onclick="openKpiModal(${emp.id})">
                    <i class="fa-solid fa-pen-to-square"></i> KPI 상세 및 평가 작성
                </button>
            </div>
        `;
    }).join('');
}

// ==================== MODAL & EVALUATION FUNCTIONS ====================

function openKpiModal(empId) {
    const modal = document.getElementById('kpiModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalBody.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>데이터를 불러오는 중입니다...</div>`;
    modal.classList.add('active');

    fetch(`/api/employee/${empId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                modalBody.innerHTML = `<div style="color:red; text-align:center;">${data.error}</div>`;
                return;
            }

            const emp = data.employee;
            modalTitle.innerText = `${emp.name} ${emp.position} - KPI 상세 및 보직자 평가`;

            let kpiRowsHtml = data.kpis.map(kpi => `
                <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); border-radius:12px; padding:16px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div>
                            <strong style="font-size:15px; color:white;">${kpi.category_name}</strong>
                            <span style="font-size:12px; color:var(--text-muted); margin-left:8px;">(가중치: ${kpi.weight}%)</span>
                        </div>
                        <span class="badge ${kpi.status === '우수' || kpi.status === '달성완료' ? 'badge-success' : (kpi.status === '지연경고' ? 'badge-danger' : 'badge-warning')}">${kpi.status}</span>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:12px; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px;">
                        <div>
                            <div style="font-size:11px; color:var(--text-muted);">목표치</div>
                            <div style="font-weight:700; color:white;">${kpi.target_val} ${kpi.unit}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-muted);">실제 실적</div>
                            <input type="number" id="actual_${kpi.id}" class="form-control" value="${kpi.actual_val}" style="padding:4px 8px; font-size:12px;">
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--text-muted);">자기 평가점수</div>
                            <div style="font-weight:700; color:var(--text-muted); padding-top:4px;">${kpi.self_score}점</div>
                        </div>
                        <div>
                            <div style="font-size:11px; color:var(--accent-teal); font-weight:700;">보직자 평가점수</div>
                            <input type="number" id="score_${kpi.id}" class="form-control" value="${kpi.manager_score}" min="0" max="100" style="padding:4px 8px; font-size:12px; border-color:var(--border-active);">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 2fr; gap:12px; margin-bottom:12px;">
                        <div>
                            <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">달성 상태</label>
                            <select id="status_${kpi.id}" class="form-control" style="padding:6px; font-size:12px;">
                                <option value="진행중" ${kpi.status === '진행중' ? 'selected' : ''}>진행중</option>
                                <option value="달성완료" ${kpi.status === '달성완료' ? 'selected' : ''}>달성완료</option>
                                <option value="우수" ${kpi.status === '우수' ? 'selected' : ''}>우수 성과</option>
                                <option value="지연경고" ${kpi.status === '지연경고' ? 'selected' : ''}>지연/개선필요</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">보직자 코칭 및 피드백 의견</label>
                            <input type="text" id="feedback_${kpi.id}" class="form-control" value="${kpi.feedback || ''}" placeholder="코칭 및 피드백 내용 작성..." style="padding:6px 10px; font-size:12px;">
                        </div>
                    </div>

                    <div style="text-align:right;">
                        <button class="btn btn-primary btn-sm" onclick="saveKpiRecord(${kpi.id})">
                            <i class="fa-solid fa-floppy-disk"></i> 해당 지표 저장
                        </button>
                    </div>
                </div>
            `).join('');

            modalBody.innerHTML = `
                <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
                    <div class="user-avatar" style="background:${emp.avatar_color}; width:50px; height:50px; font-size:20px;">${emp.name[0]}</div>
                    <div>
                        <h3 style="color:white; font-size:18px;">${emp.name} <span style="font-size:14px; color:var(--text-muted);">(${emp.title})</span></h3>
                        <p style="font-size:13px; color:var(--text-muted);">${emp.dept_name} | 사번: ${emp.emp_no} | 연락처: ${emp.phone}</p>
                    </div>
                </div>
                <div>
                    <h4 style="font-size:14px; color:var(--primary); margin-bottom:12px;"><i class="fa-solid fa-list-check"></i> 정량/정성 KPI 5대 항목 평가표</h4>
                    ${kpiRowsHtml}
                </div>
            `;
        })
        .catch(err => {
            modalBody.innerHTML = `<div style="color:red; text-align:center;">오류가 발생했습니다: ${err}</div>`;
        });
}

function closeKpiModal() {
    document.getElementById('kpiModal').classList.remove('active');
}

function saveKpiRecord(recordId) {
    const actual_val = parseFloat(document.getElementById(`actual_${recordId}`).value) || 0;
    const manager_score = parseFloat(document.getElementById(`score_${recordId}`).value) || 0;
    const status = document.getElementById(`status_${recordId}`).value;
    const feedback = document.getElementById(`feedback_${recordId}`).value;

    fetch('/api/kpi/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            record_id: recordId,
            actual_val: actual_val,
            manager_score: manager_score,
            status: status,
            feedback: feedback
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('보직자 평가 및 실적이 성공적으로 업데이트되었습니다.');
            // Reload list if on employees page
            if (typeof loadEmployeesData === 'function') loadEmployeesData();
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } else {
            alert('수정 실패: ' + (data.error || '알 수 없는 오류'));
        }
    })
    .catch(err => alert('오류 발생: ' + err));
}

// ==================== ADD EMPLOYEE MODAL ====================

function openAddEmployeeModal() {
    const modal = document.getElementById('kpiModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.innerText = "신규 연구원 등록";
    const template = document.getElementById('addEmployeeTemplate');
    modalBody.innerHTML = template.innerHTML;

    // Populate dept select
    const select = document.getElementById('addDeptSelect');
    if (select && currentDepartments) {
        select.innerHTML = currentDepartments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }

    modal.classList.add('active');
}

function submitAddEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    fetch('/api/employee/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(resData => {
        if (resData.success) {
            alert('신규 연구원이 성공적으로 등록되었습니다.');
            closeKpiModal();
            loadEmployeesData();
        } else {
            alert('등록 실패: ' + (resData.error || '알 수 없는 오류'));
        }
    })
    .catch(err => alert('오류 발생: ' + err));
}

// ==================== PROJECTS FUNCTIONS ====================

function loadProjectsData() {
    fetch('/api/projects')
        .then(res => res.json())
        .then(data => {
            const body = document.getElementById('projectsTableBody');
            if (!body) return;

            let totalBudget = 0;
            let totalProgress = 0;

            body.innerHTML = data.projects.map(p => {
                totalBudget += p.budget_million;
                totalProgress += p.progress_pct;

                let badgeClass = p.status === '우수' ? 'badge-success' : 'badge-info';

                return `
                    <tr>
                        <td><span style="font-family:monospace; color:var(--accent-teal);">${p.code}</span></td>
                        <td><strong style="color:white;">${p.title}</strong></td>
                        <td>${p.dept_name}</td>
                        <td>${p.lead_name} (${p.lead_position})</td>
                        <td><strong style="color:var(--accent-orange);">${p.budget_million.toLocaleString()} 백만원</strong></td>
                        <td style="width:180px;">
                            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                                <span>진척률</span>
                                <span>${p.progress_pct}%</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width:${p.progress_pct}%;"></div>
                            </div>
                        </td>
                        <td><span class="badge ${badgeClass}">${p.status}</span></td>
                    </tr>
                `;
            }).join('');

            const countElem = document.getElementById('totalProjectCount');
            if (countElem) countElem.innerHTML = `${data.projects.length} <span style="font-size:14px; font-weight:normal;">개 과제</span>`;

            const budgetElem = document.getElementById('totalProjectBudget');
            if (budgetElem) budgetElem.innerHTML = `${totalBudget.toLocaleString()} <span style="font-size:14px; font-weight:normal;">백만원</span>`;

            const avgElem = document.getElementById('avgProjectProgress');
            if (avgElem && data.projects.length > 0) {
                const avg = (totalProgress / data.projects.length).toFixed(1);
                avgElem.innerHTML = `${avg} <span style="font-size:14px; font-weight:normal;">%</span>`;
            }
        })
        .catch(err => console.error('Projects load error:', err));
}

// ==================== REPORTS FUNCTIONS ====================

function loadReportsData() {
    fetch('/api/dashboard_summary')
        .then(res => res.json())
        .then(data => {
            const body = document.getElementById('reportDeptTable');
            if (!body) return;

            body.innerHTML = data.dept_performance.map(d => {
                let badge = 'badge-info';
                let grade = 'B+ (양호)';
                if (d.avg_score >= 93) { badge = 'badge-success'; grade = 'S (최우수)'; }
                else if (d.avg_score >= 90) { badge = 'badge-success'; grade = 'A (우수)'; }
                else if (d.avg_score < 85) { badge = 'badge-warning'; grade = 'C (보통)'; }

                return `
                    <tr>
                        <td><strong>${d.name} (${d.code})</strong></td>
                        <td>${d.head_name}</td>
                        <td>${d.emp_count}명</td>
                        <td>${d.target_score}점</td>
                        <td><strong style="color:var(--accent-teal);">${d.avg_score}점</strong></td>
                        <td>${d.avg_achieve_pct}%</td>
                        <td><span class="badge ${badge}">${grade}</span></td>
                    </tr>
                `;
            }).join('');
        })
        .catch(err => console.error('Reports load error:', err));
}
