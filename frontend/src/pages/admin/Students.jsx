import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import AdminLayout from '../../components/AdminLayout'

const LEVEL_COLORS = {
  A1: 'bg-slate-100 text-slate-600',
  A2: 'bg-green-100 text-green-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-purple-100 text-purple-700',
  C1: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS = {
  in_progress: '진행 중',
  completed:   '완료',
  scored:      '채점 완료',
}

const STATUS_COLORS = {
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-blue-100 text-blue-700',
  scored:      'bg-green-100 text-green-700',
}

const FLAG = { Russia: '🇷🇺', Kazakhstan: '🇰🇿', Uzbekistan: '🇺🇿' }

export default function Students() {
  const [students, setStudents]   = useState([])
  const [search, setSearch]       = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [showBulk, setShowBulk]   = useState(false)
  const [bulkJson, setBulkJson]   = useState('')
  const [bulkMsg, setBulkMsg]     = useState('')
  const [loading, setLoading]     = useState(true)

  const load = () => {
    setLoading(true)
    const params = {}
    if (filterCountry) params.country = filterCountry
    if (filterStatus)  params.status  = filterStatus
    api.get('/admin/students', { params })
      .then(r => setStudents(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterCountry, filterStatus])

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase())
  )

  const bulkUpload = async () => {
    try {
      const data = JSON.parse(bulkJson)
      const { data: res } = await api.post('/admin/students/bulk', data)
      setBulkMsg(`✅ ${res.created}명 등록 완료 (${res.skipped}명 중복 건너뜀)`)
      load()
    } catch (e) {
      setBulkMsg('❌ JSON 형식 오류 또는 서버 오류')
    }
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">학생 목록</h1>
            <p className="text-slate-500 text-sm">{students.length}명 전체</p>
          </div>
          <button
            onClick={() => setShowBulk(!showBulk)}
            className="btn-secondary text-sm py-2 px-4"
          >
            {showBulk ? '닫기' : '➕ 일괄 등록'}
          </button>
        </div>

        {/* Bulk upload */}
        {showBulk && (
          <div className="card mb-6">
            <h2 className="font-semibold text-slate-700 mb-3">학생 일괄 등록 (JSON)</h2>
            <p className="text-xs text-slate-400 mb-2">
              형식: {`[{"username":"s001","password":"pw","name":"홍길동","country":"Russia","age_group":"middle","grade":"7"}]`}
            </p>
            <textarea
              className="input font-mono text-xs h-32 mb-3"
              placeholder='[{"username":"s001", "password":"pass1234", "name":"Ivan Petrov", "country":"Russia", "age_group":"high", "grade":"10"}, ...]'
              value={bulkJson}
              onChange={e => setBulkJson(e.target.value)}
            />
            <div className="flex gap-3 items-center">
              <button onClick={bulkUpload} className="btn-primary text-sm py-2 px-4">업로드</button>
              {bulkMsg && <span className="text-sm text-slate-600">{bulkMsg}</span>}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            placeholder="이름 또는 아이디 검색…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-48 py-2 text-sm"
          />
          <select
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            className="input w-40 py-2 text-sm"
          >
            <option value="">전체 국가</option>
            <option>Russia</option>
            <option>Kazakhstan</option>
            <option>Uzbekistan</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input w-40 py-2 text-sm"
          >
            <option value="">전체 상태</option>
            <option value="in_progress">진행 중</option>
            <option value="completed">완료</option>
            <option value="scored">채점 완료</option>
          </select>
          <button onClick={load} className="btn-secondary text-sm py-2 px-4">🔄</button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">로딩 중…</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['이름', '아이디', '국가', '학년', '시험 상태', '점수', '레벨', '반'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/admin/students/${s.id}`} className="font-medium text-blue-600 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{s.username}</td>
                    <td className="px-4 py-3">{FLAG[s.country] || ''} {s.country}</td>
                    <td className="px-4 py-3 text-slate-500">{s.age_group} {s.grade || ''}</td>
                    <td className="px-4 py-3">
                      {s.latest_test_status ? (
                        <span className={`badge ${STATUS_COLORS[s.latest_test_status]}`}>
                          {STATUS_LABELS[s.latest_test_status]}
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-400">미응시</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {s.total_score != null ? `${s.total_score.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.level ? (
                        <span className={`badge ${LEVEL_COLORS[s.level]}`}>{s.level}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.class_name || '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
