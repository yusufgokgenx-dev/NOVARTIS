import { useState, useEffect } from 'react'
import { supabase, testConnection } from './supabase'

// Types
interface BudgetItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface Payment {
  id: string
  date: string
  description: string
  amount: number
  type: 'incoming' | 'outgoing'
}

interface Advance {
  id: string
  date: string
  description: string
  amount: number
  status: 'pending' | 'closed'
  supplier: string
}

interface Expense {
  id: string
  date: string
  description: string
  amount: number
  category: string
}

interface CategoryVatRate {
  category: string
  rate: number
  customRate?: number
}

interface Project {
  id: string
  name: string
  client: string
  date: string
  currency: 'EUR' | 'USD' | 'GBP' | 'TRY'
  exchangeRate: number
  isInternational: boolean
  serviceFeePercent: number
  categories: {
    registration: BudgetItem[]
    accommodation: BudgetItem[]
    transfer: BudgetItem[]
    sponsorship: BudgetItem[]
    other: BudgetItem[]
  }
  categoryVatRates: CategoryVatRate[]
  payments: Payment[]
  advances: Advance[]
  expenses: Expense[]
  created_at?: string
  updated_at?: string
}

const defaultProject = (): Project => ({
  id: crypto.randomUUID(),
  name: '',
  client: 'Novartis',
  date: new Date().toISOString().split('T')[0],
  currency: 'EUR',
  exchangeRate: 38.50,
  isInternational: false,
  serviceFeePercent: 10,
  categories: {
    registration: [],
    accommodation: [],
    transfer: [],
    sponsorship: [],
    other: []
  },
  categoryVatRates: [
    { category: 'registration', rate: 20 },
    { category: 'accommodation', rate: 12 },
    { category: 'transfer', rate: 20 },
    { category: 'sponsorship', rate: 20 },
    { category: 'other', rate: 20 }
  ],
  payments: [],
  advances: [],
  expenses: []
})

const categoryNames: Record<string, string> = {
  registration: '📝 Kayıt',
  accommodation: '🏨 Konaklama',
  transfer: '🚗 Transfer',
  sponsorship: '💰 Sponsorluk',
  other: '📦 Diğer'
}

const vatOptions = [
  { value: 0, label: '%0 (Yurtdışı)' },
  { value: 1, label: '%1' },
  { value: 8, label: '%8' },
  { value: 10, label: '%10' },
  { value: 12, label: '%12 (10+2)' },
  { value: 18, label: '%18' },
  { value: 20, label: '%20' },
  { value: -1, label: 'Özel' }
]

const currencySymbols: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  TRY: '₺'
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<'budget' | 'payments' | 'advances' | 'expenses' | 'analysis'>('budget')
  const [activeCategory, setActiveCategory] = useState<string>('registration')
  const [isLoading, setIsLoading] = useState(true)
  const [useSupabase, setUseSupabase] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Initialize and check connection
  useEffect(() => {
    const init = async () => {
      const connected = await testConnection()
      setUseSupabase(connected)
      
      if (connected) {
        // Load from Supabase
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          // Convert Supabase snake_case to camelCase
          const formatted = data.map((p: any) => ({
            id: p.id,
            name: p.name || '',
            client: p.client || 'Novartis',
            date: p.date || new Date().toISOString().split('T')[0],
            currency: p.currency || 'EUR',
            exchangeRate: Number(p.exchange_rate) || 38.50,
            isInternational: p.is_international || false,
            serviceFeePercent: Number(p.service_fee_percent) || 10,
            categories: p.categories || { registration: [], accommodation: [], transfer: [], sponsorship: [], other: [] },
            categoryVatRates: p.category_vat_rates || [
              { category: 'registration', rate: 20 },
              { category: 'accommodation', rate: 12 },
              { category: 'transfer', rate: 20 },
              { category: 'sponsorship', rate: 20 },
              { category: 'other', rate: 20 }
            ],
            payments: p.payments || [],
            advances: p.advances || [],
            expenses: p.expenses || [],
            created_at: p.created_at,
            updated_at: p.updated_at
          }))
          setProjects(formatted)
        }
      } else {
        // Load from localStorage
        const saved = localStorage.getItem('novartis_projects')
        if (saved) {
          setProjects(JSON.parse(saved))
        }
      }
      setIsLoading(false)
    }
    init()
  }, [])

  // Auto-save current project
  useEffect(() => {
    if (!currentProject) return

    const saveProject = async () => {
      setIsSaving(true)
      const updatedProjects = projects.map(p => 
        p.id === currentProject.id ? { ...currentProject, updated_at: new Date().toISOString() } : p
      )
      
      if (!projects.find(p => p.id === currentProject.id)) {
        updatedProjects.push({ ...currentProject, created_at: new Date().toISOString() })
      }
      
      setProjects(updatedProjects)
      
      if (useSupabase) {
        // Convert camelCase to snake_case for Supabase
        await supabase.from('projects').upsert({
          id: currentProject.id,
          name: currentProject.name,
          client: currentProject.client,
          date: currentProject.date,
          currency: currentProject.currency,
          exchange_rate: currentProject.exchangeRate,
          is_international: currentProject.isInternational,
          service_fee_percent: currentProject.serviceFeePercent,
          categories: currentProject.categories,
          category_vat_rates: currentProject.categoryVatRates,
          payments: currentProject.payments,
          advances: currentProject.advances,
          expenses: currentProject.expenses,
          updated_at: new Date().toISOString()
        })
      } else {
        localStorage.setItem('novartis_projects', JSON.stringify(updatedProjects))
      }
      
      setLastSaved(new Date())
      setIsSaving(false)
    }

    const timer = setTimeout(saveProject, 500)
    return () => clearTimeout(timer)
  }, [currentProject, useSupabase])

  // Subscribe to realtime changes
  useEffect(() => {
    if (!useSupabase) return

    const subscription = supabase
      .channel('projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setProjects(prev => [payload.new as Project, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setProjects(prev => prev.map(p => p.id === (payload.new as Project).id ? payload.new as Project : p))
          if (currentProject?.id === (payload.new as Project).id) {
            setCurrentProject(payload.new as Project)
          }
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== (payload.old as Project).id))
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [useSupabase, currentProject?.id])

  const createProject = () => {
    const newProject = defaultProject()
    setCurrentProject(newProject)
    setActiveTab('budget')
  }

  const deleteProject = async (id: string) => {
    if (!confirm('Bu projeyi silmek istediğinize emin misiniz?')) return
    
    const updated = projects.filter(p => p.id !== id)
    setProjects(updated)
    
    if (useSupabase) {
      await supabase.from('projects').delete().eq('id', id)
    } else {
      localStorage.setItem('novartis_projects', JSON.stringify(updated))
    }
    
    if (currentProject?.id === id) {
      setCurrentProject(null)
    }
  }

  const updateProject = (updates: Partial<Project>) => {
    if (!currentProject) return
    setCurrentProject({ ...currentProject, ...updates })
  }

  const addBudgetItem = (category: string) => {
    if (!currentProject) return
    const newItem: BudgetItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }
    updateProject({
      categories: {
        ...currentProject.categories,
        [category]: [...currentProject.categories[category as keyof typeof currentProject.categories], newItem]
      }
    })
  }

  const updateBudgetItem = (category: string, id: string, updates: Partial<BudgetItem>) => {
    if (!currentProject) return
    const items = currentProject.categories[category as keyof typeof currentProject.categories]
    const updated = items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, ...updates }
        newItem.total = newItem.quantity * newItem.unitPrice
        return newItem
      }
      return item
    })
    updateProject({
      categories: {
        ...currentProject.categories,
        [category]: updated
      }
    })
  }

  const deleteBudgetItem = (category: string, id: string) => {
    if (!currentProject) return
    const items = currentProject.categories[category as keyof typeof currentProject.categories]
    updateProject({
      categories: {
        ...currentProject.categories,
        [category]: items.filter(item => item.id !== id)
      }
    })
  }

  const getVatRate = (category: string): number => {
    if (!currentProject) return 20
    if (currentProject.isInternational) return 0
    const vatConfig = currentProject.categoryVatRates.find(v => v.category === category)
    if (!vatConfig) return 20
    if (vatConfig.rate === -1) return vatConfig.customRate || 0
    return vatConfig.rate
  }

  const setVatRate = (category: string, rate: number, customRate?: number) => {
    if (!currentProject) return
    const updated = currentProject.categoryVatRates.map(v => 
      v.category === category ? { ...v, rate, customRate } : v
    )
    updateProject({ categoryVatRates: updated })
  }

  const getCategoryTotal = (category: string): number => {
    if (!currentProject) return 0
    const items = currentProject.categories[category as keyof typeof currentProject.categories]
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const getSubtotal = (): number => {
    if (!currentProject) return 0
    return Object.keys(currentProject.categories).reduce((sum, cat) => sum + getCategoryTotal(cat), 0)
  }

  const getServiceFee = (): number => {
    return getSubtotal() * (currentProject?.serviceFeePercent || 0) / 100
  }

  const getTotalBeforeVat = (): number => {
    return getSubtotal() + getServiceFee()
  }

  const getTotalVat = (): number => {
    if (!currentProject) return 0
    let totalVat = 0
    Object.keys(currentProject.categories).forEach(cat => {
      const catTotal = getCategoryTotal(cat)
      const vatRate = getVatRate(cat)
      totalVat += catTotal * vatRate / 100
    })
    // Service fee VAT (20%)
    totalVat += getServiceFee() * 0.20
    return totalVat
  }

  const getGrandTotal = (): number => {
    return getTotalBeforeVat() + getTotalVat()
  }

  const toTRY = (amount: number): number => {
    if (!currentProject || currentProject.currency === 'TRY') return amount
    return amount * currentProject.exchangeRate
  }

  const formatCurrency = (amount: number, showTRY = false): string => {
    if (!currentProject) return '0'
    const symbol = currencySymbols[currentProject.currency]
    const formatted = `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (showTRY && currentProject.currency !== 'TRY') {
      return `${formatted} (₺${toTRY(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
    }
    return formatted
  }

  // Payments
  const addPayment = (type: 'incoming' | 'outgoing') => {
    if (!currentProject) return
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      type
    }
    updateProject({ payments: [...currentProject.payments, newPayment] })
  }

  const updatePayment = (id: string, updates: Partial<Payment>) => {
    if (!currentProject) return
    updateProject({
      payments: currentProject.payments.map(p => p.id === id ? { ...p, ...updates } : p)
    })
  }

  const deletePayment = (id: string) => {
    if (!currentProject) return
    updateProject({ payments: currentProject.payments.filter(p => p.id !== id) })
  }

  // Advances
  const addAdvance = () => {
    if (!currentProject) return
    const newAdvance: Advance = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      status: 'pending',
      supplier: ''
    }
    updateProject({ advances: [...currentProject.advances, newAdvance] })
  }

  const updateAdvance = (id: string, updates: Partial<Advance>) => {
    if (!currentProject) return
    updateProject({
      advances: currentProject.advances.map(a => a.id === id ? { ...a, ...updates } : a)
    })
  }

  const deleteAdvance = (id: string) => {
    if (!currentProject) return
    updateProject({ advances: currentProject.advances.filter(a => a.id !== id) })
  }

  // Expenses
  const addExpense = () => {
    if (!currentProject) return
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      category: 'other'
    }
    updateProject({ expenses: [...currentProject.expenses, newExpense] })
  }

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    if (!currentProject) return
    updateProject({
      expenses: currentProject.expenses.map(e => e.id === id ? { ...e, ...updates } : e)
    })
  }

  const deleteExpense = (id: string) => {
    if (!currentProject) return
    updateProject({ expenses: currentProject.expenses.filter(e => e.id !== id) })
  }

  // Analysis calculations
  const getTotalIncomingPayments = () => currentProject?.payments.filter(p => p.type === 'incoming').reduce((sum, p) => sum + p.amount, 0) || 0
  const getTotalOutgoingPayments = () => currentProject?.payments.filter(p => p.type === 'outgoing').reduce((sum, p) => sum + p.amount, 0) || 0
  const getTotalAdvances = () => currentProject?.advances.reduce((sum, a) => sum + a.amount, 0) || 0
  const getPendingAdvances = () => currentProject?.advances.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0) || 0
  const getTotalExpenses = () => currentProject?.expenses.reduce((sum, e) => sum + e.amount, 0) || 0
  const getNetProfit = () => getServiceFee() - getTotalExpenses()
  const getCashFlow = () => getTotalIncomingPayments() - getTotalOutgoingPayments() - getTotalAdvances()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Project List View
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">🏢 Novartis Bütçe Yönetimi</h1>
                <p className="text-gray-500 mt-1">Yetkili Acente Bütçe Takip Sistemi</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm ${useSupabase ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {useSupabase ? '☁️ Bulut Senkron' : '💾 Yerel Kayıt'}
                </span>
                <button
                  onClick={createProject}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
                >
                  ➕ Yeni Proje
                </button>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">Henüz Proje Yok</h2>
              <p className="text-gray-500 mb-6">İlk projenizi oluşturmak için butona tıklayın</p>
              <button
                onClick={createProject}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl text-lg"
              >
                ➕ İlk Projemi Oluştur
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <div key={project.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 truncate">{project.name || 'İsimsiz Proje'}</h3>
                      <p className="text-gray-500 text-sm">{project.client}</p>
                    </div>
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm font-medium">
                      {project.currency}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    <p>📅 {new Date(project.date).toLocaleDateString('tr-TR')}</p>
                    <p className="font-medium text-gray-700 mt-1">
                      {currencySymbols[project.currency]}{Object.values(project.categories).flat().reduce((sum, item) => sum + item.total, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentProject(project)}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition-all"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Setup Instructions */}
          {!useSupabase && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-800 mb-2">☁️ Ekip ile Paylaşmak İçin</h3>
              <p className="text-blue-700 text-sm">
                Supabase kurulumu yaparak ekip arkadaşlarınızla aynı verileri paylaşabilirsiniz. 
                Aşağıdaki kurulum adımlarını takip edin.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Project Editor View
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Top Bar */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentProject(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              ← Projelere Dön
            </button>
            <div className="flex items-center gap-3">
              {isSaving && <span className="text-orange-500 text-sm">💾 Kaydediliyor...</span>}
              {lastSaved && !isSaving && (
                <span className="text-green-600 text-sm">
                  ✓ {lastSaved.toLocaleTimeString('tr-TR')}
                </span>
              )}
              <span className={`px-2 py-1 rounded text-xs ${useSupabase ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {useSupabase ? '☁️ Senkron' : '💾 Yerel'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Project Info */}
        <div className="bg-white rounded-xl shadow-lg p-5 mb-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Proje Adı</label>
              <input
                type="text"
                value={currentProject.name}
                onChange={(e) => updateProject({ name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Kongre adı..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Müşteri</label>
              <input
                type="text"
                value={currentProject.client}
                onChange={(e) => updateProject({ client: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tarih</label>
              <input
                type="date"
                value={currentProject.date}
                onChange={(e) => updateProject({ date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Para Birimi & Kur</label>
              <div className="flex gap-2">
                <select
                  value={currentProject.currency}
                  onChange={(e) => updateProject({ currency: e.target.value as Project['currency'] })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                  <option value="TRY">TRY ₺</option>
                </select>
                {currentProject.currency !== 'TRY' && (
                  <input
                    type="number"
                    value={currentProject.exchangeRate}
                    onChange={(e) => updateProject({ exchangeRate: parseFloat(e.target.value) || 0 })}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Kur"
                    step="0.01"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentProject.isInternational}
                onChange={(e) => updateProject({ isInternational: e.target.checked })}
                className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500"
              />
              <span className="font-medium">🌍 Yurtdışı İş (KDV'siz)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Hizmet Bedeli:</span>
              <input
                type="number"
                value={currentProject.serviceFeePercent}
                onChange={(e) => updateProject({ serviceFeePercent: parseFloat(e.target.value) || 0 })}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                min="0"
                max="100"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-4 overflow-hidden">
          <div className="flex overflow-x-auto">
            {[
              { id: 'budget', label: '📋 Bütçe', color: 'orange' },
              { id: 'payments', label: '💳 Ödemeler', color: 'blue' },
              { id: 'advances', label: '💵 Avanslar', color: 'purple' },
              { id: 'expenses', label: '📊 Giderler', color: 'red' },
              { id: 'analysis', label: '📈 Analiz', color: 'green' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 min-w-max px-6 py-4 font-medium transition-all ${
                  activeTab === tab.id
                    ? `bg-${tab.color}-500 text-white`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={activeTab === tab.id ? { backgroundColor: tab.color === 'orange' ? '#f97316' : tab.color === 'blue' ? '#3b82f6' : tab.color === 'purple' ? '#a855f7' : tab.color === 'red' ? '#ef4444' : '#22c55e' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Budget Tab */}
            {activeTab === 'budget' && (
              <div className="space-y-4">
                {/* Category Tabs */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="flex overflow-x-auto border-b">
                    {Object.entries(categoryNames).map(([key, name]) => (
                      <button
                        key={key}
                        onClick={() => setActiveCategory(key)}
                        className={`flex-1 min-w-max px-4 py-3 font-medium transition-all ${
                          activeCategory === key
                            ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-500'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {/* VAT Rate Selector */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">KDV Oranı:</span>
                      <select
                        value={currentProject.categoryVatRates.find(v => v.category === activeCategory)?.rate || 20}
                        onChange={(e) => setVatRate(activeCategory, parseInt(e.target.value))}
                        disabled={currentProject.isInternational}
                        className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-200"
                      >
                        {vatOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {currentProject.categoryVatRates.find(v => v.category === activeCategory)?.rate === -1 && (
                        <input
                          type="number"
                          value={currentProject.categoryVatRates.find(v => v.category === activeCategory)?.customRate || 0}
                          onChange={(e) => setVatRate(activeCategory, -1, parseFloat(e.target.value))}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-500"
                          placeholder="%"
                          min="0"
                          max="100"
                        />
                      )}
                      {currentProject.isInternational && (
                        <span className="text-sm text-green-600 font-medium">✓ Yurtdışı - KDV Yok</span>
                      )}
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 text-sm font-medium text-gray-600">Açıklama</th>
                            <th className="text-center py-2 px-2 text-sm font-medium text-gray-600 w-20">Adet</th>
                            <th className="text-right py-2 px-2 text-sm font-medium text-gray-600 w-32">Birim Fiyat</th>
                            <th className="text-right py-2 px-2 text-sm font-medium text-gray-600 w-32">Toplam</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentProject.categories[activeCategory as keyof typeof currentProject.categories].map(item => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateBudgetItem(activeCategory, item.id, { description: e.target.value })}
                                  className="w-full border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="Açıklama..."
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateBudgetItem(activeCategory, item.id, { quantity: parseInt(e.target.value) || 0 })}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  min="0"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => updateBudgetItem(activeCategory, item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-right focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="py-2 px-2 text-right font-medium">
                                {formatCurrency(item.total)}
                              </td>
                              <td className="py-2 px-2">
                                <button
                                  onClick={() => deleteBudgetItem(activeCategory, item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={() => addBudgetItem(activeCategory)}
                      className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-all"
                    >
                      ➕ Yeni Satır Ekle
                    </button>

                    <div className="mt-4 p-3 bg-orange-50 rounded-lg flex justify-between items-center">
                      <span className="font-medium text-gray-700">Kategori Toplamı (KDV Hariç):</span>
                      <span className="font-bold text-xl text-orange-600">{formatCurrency(getCategoryTotal(activeCategory), true)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-xl shadow-lg p-5">
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => addPayment('incoming')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-all"
                  >
                    ➕ Gelen Ödeme
                  </button>
                  <button
                    onClick={() => addPayment('outgoing')}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-all"
                  >
                    ➕ Giden Ödeme
                  </button>
                </div>

                <div className="space-y-3">
                  {currentProject.payments.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Henüz ödeme kaydı yok</p>
                  )}
                  {currentProject.payments.map(payment => (
                    <div key={payment.id} className={`p-4 rounded-lg border-l-4 ${payment.type === 'incoming' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                      <div className="grid md:grid-cols-4 gap-3">
                        <input
                          type="date"
                          value={payment.date}
                          onChange={(e) => updatePayment(payment.id, { date: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <input
                          type="text"
                          value={payment.description}
                          onChange={(e) => updatePayment(payment.id, { description: e.target.value })}
                          className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="Açıklama..."
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={payment.amount}
                            onChange={(e) => updatePayment(payment.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="Tutar"
                            min="0"
                            step="0.01"
                          />
                          <button
                            onClick={() => deletePayment(payment.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 px-3 rounded-lg"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm font-medium">
                        {payment.type === 'incoming' ? '✅ Müşteriden Gelen' : '📤 Tedarikçiye Giden'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advances Tab */}
            {activeTab === 'advances' && (
              <div className="bg-white rounded-xl shadow-lg p-5">
                <button
                  onClick={addAdvance}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-medium transition-all mb-4"
                >
                  ➕ Yeni Avans Ekle
                </button>

                <div className="space-y-3">
                  {currentProject.advances.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Henüz avans kaydı yok</p>
                  )}
                  {currentProject.advances.map(advance => (
                    <div key={advance.id} className={`p-4 rounded-lg border-l-4 ${advance.status === 'pending' ? 'bg-yellow-50 border-yellow-500' : 'bg-green-50 border-green-500'}`}>
                      <div className="grid md:grid-cols-5 gap-3">
                        <input
                          type="date"
                          value={advance.date}
                          onChange={(e) => updateAdvance(advance.id, { date: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <input
                          type="text"
                          value={advance.supplier}
                          onChange={(e) => updateAdvance(advance.id, { supplier: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="Tedarikçi..."
                        />
                        <input
                          type="text"
                          value={advance.description}
                          onChange={(e) => updateAdvance(advance.id, { description: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="Açıklama..."
                        />
                        <input
                          type="number"
                          value={advance.amount}
                          onChange={(e) => updateAdvance(advance.id, { amount: parseFloat(e.target.value) || 0 })}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="Tutar"
                          min="0"
                          step="0.01"
                        />
                        <div className="flex gap-2">
                          <select
                            value={advance.status}
                            onChange={(e) => updateAdvance(advance.id, { status: e.target.value as 'pending' | 'closed' })}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                          >
                            <option value="pending">⏳ Beklemede</option>
                            <option value="closed">✅ Kapatıldı</option>
                          </select>
                          <button
                            onClick={() => deleteAdvance(advance.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 px-3 rounded-lg"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <div className="bg-white rounded-xl shadow-lg p-5">
                <button
                  onClick={addExpense}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-all mb-4"
                >
                  ➕ Yeni Gider Ekle
                </button>

                <div className="space-y-3">
                  {currentProject.expenses.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Henüz gider kaydı yok</p>
                  )}
                  {currentProject.expenses.map(expense => (
                    <div key={expense.id} className="p-4 rounded-lg bg-red-50 border-l-4 border-red-500">
                      <div className="grid md:grid-cols-5 gap-3">
                        <input
                          type="date"
                          value={expense.date}
                          onChange={(e) => updateExpense(expense.id, { date: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <select
                          value={expense.category}
                          onChange={(e) => updateExpense(expense.id, { category: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2"
                        >
                          {Object.entries(categoryNames).map(([key, name]) => (
                            <option key={key} value={key}>{name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={expense.description}
                          onChange={(e) => updateExpense(expense.id, { description: e.target.value })}
                          className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="Açıklama..."
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={expense.amount}
                            onChange={(e) => updateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="Tutar"
                            min="0"
                            step="0.01"
                          />
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 px-3 rounded-lg"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Tab */}
            {activeTab === 'analysis' && (
              <div className="space-y-4">
                {/* Profit Analysis */}
                <div className="bg-white rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Kar/Zarar Analizi</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                      <span>Hizmet Bedeli Geliri:</span>
                      <span className="font-bold text-green-600">+{formatCurrency(getServiceFee(), true)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                      <span>Gerçekleşen Giderler:</span>
                      <span className="font-bold text-red-600">-{formatCurrency(getTotalExpenses(), true)}</span>
                    </div>
                    <div className={`flex justify-between p-4 rounded-lg ${getNetProfit() >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <span className="font-bold">NET KAR/ZARAR:</span>
                      <span className={`font-bold text-xl ${getNetProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {getNetProfit() >= 0 ? '+' : ''}{formatCurrency(getNetProfit(), true)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cash Flow */}
                <div className="bg-white rounded-xl shadow-lg p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">💳 Nakit Akışı</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                      <span>Müşteriden Alınan:</span>
                      <span className="font-bold text-green-600">+{formatCurrency(getTotalIncomingPayments(), true)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                      <span>Tedarikçilere Ödenen:</span>
                      <span className="font-bold text-red-600">-{formatCurrency(getTotalOutgoingPayments(), true)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-yellow-50 rounded-lg">
                      <span>Verilen Avanslar:</span>
                      <span className="font-bold text-yellow-600">-{formatCurrency(getTotalAdvances(), true)}</span>
                    </div>
                    <div className={`flex justify-between p-4 rounded-lg ${getCashFlow() >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <span className="font-bold">KALAN BAKİYE:</span>
                      <span className={`font-bold text-xl ${getCashFlow() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {getCashFlow() >= 0 ? '+' : ''}{formatCurrency(getCashFlow(), true)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pending Advances */}
                {getPendingAdvances() > 0 && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-yellow-800 mb-2">⏳ Bekleyen Avanslar</h3>
                    <p className="text-yellow-700">
                      Toplam: <strong>{formatCurrency(getPendingAdvances(), true)}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-5 sticky top-20">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Bütçe Özeti</h3>
              
              <div className="space-y-2 text-sm">
                {Object.entries(categoryNames).map(([key, name]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{name}:</span>
                    <span className="font-medium">{formatCurrency(getCategoryTotal(key))}</span>
                  </div>
                ))}
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ara Toplam:</span>
                    <span className="font-medium">{formatCurrency(getSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Hizmet Bedeli ({currentProject.serviceFeePercent}%):</span>
                    <span className="font-medium">+{formatCurrency(getServiceFee())}</span>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Toplam (KDV Hariç):</span>
                    <span className="font-medium">{formatCurrency(getTotalBeforeVat())}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Toplam KDV:</span>
                    <span className="font-medium">+{formatCurrency(getTotalVat())}</span>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">GENEL TOPLAM:</span>
                    <span className="font-bold text-orange-600">{formatCurrency(getGrandTotal())}</span>
                  </div>
                  {currentProject.currency !== 'TRY' && (
                    <div className="text-right text-sm text-gray-500 mt-1">
                      ≈ ₺{toTRY(getGrandTotal()).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>

              {/* Category VAT Details */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-600 mb-2">KDV Oranları:</h4>
                <div className="space-y-1 text-xs">
                  {Object.entries(categoryNames).map(([key, name]) => (
                    <div key={key} className="flex justify-between text-gray-500">
                      <span>{name}:</span>
                      <span>%{getVatRate(key)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              {(currentProject.payments.length > 0 || currentProject.advances.length > 0) && (
                <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Gelen Ödeme:</span>
                    <span className="font-medium text-green-600">{formatCurrency(getTotalIncomingPayments())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Giden Ödeme:</span>
                    <span className="font-medium text-red-600">{formatCurrency(getTotalOutgoingPayments())}</span>
                  </div>
                  {getPendingAdvances() > 0 && (
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Bekleyen Avans:</span>
                      <span className="font-medium text-yellow-600">{formatCurrency(getPendingAdvances())}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
