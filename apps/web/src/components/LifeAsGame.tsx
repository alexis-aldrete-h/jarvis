'use client'

import { useState, useMemo, useEffect } from 'react'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts'

interface LifeArea {
  name: string
  level: number
  xp: number
  color: string
  borderColor: string
  icon: string
}

interface PositiveHabit {
  id: string
  habit: string
  area: string
  xp: number
  varos: number
  icon: string
  cooldown?: number
}

interface NegativeHabit {
  id: string
  habit: string
  hpLoss: number
  icon: string
}

interface ShopItem {
  id: string
  item: string
  price: number
  icon: string
  description: string
}

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'level-up'
  timestamp: number
}

export default function LifeAsGame() {
  const maxHP = 1000
  const [currentHP, setCurrentHP] = useState(1000)
  const [varos, setVaros] = useState(500)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [levelUpArea, setLevelUpArea] = useState<string | null>(null)
  
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([
    { name: 'Salud', level: 5, xp: 850, color: 'bg-red-100', borderColor: 'border-red-300', icon: '❤️' },
    { name: 'Dinero', level: 4, xp: 720, color: 'bg-green-100', borderColor: 'border-green-300', icon: '💰' },
    { name: 'Carrera / Negocios', level: 6, xp: 920, color: 'bg-blue-100', borderColor: 'border-blue-300', icon: '💼' },
    { name: 'Productividad', level: 5, xp: 800, color: 'bg-purple-100', borderColor: 'border-purple-300', icon: '⚡' },
    { name: 'Relaciones', level: 3, xp: 450, color: 'bg-pink-100', borderColor: 'border-pink-300', icon: '🤝' },
    { name: 'Desarrollo personal', level: 4, xp: 680, color: 'bg-amber-100', borderColor: 'border-amber-300', icon: '📚' },
    { name: 'Estado mental / Emocional', level: 5, xp: 750, color: 'bg-indigo-100', borderColor: 'border-indigo-300', icon: '🧠' },
    { name: 'Espiritualidad', level: 2, xp: 320, color: 'bg-cyan-100', borderColor: 'border-cyan-300', icon: '✨' },
    { name: 'Hábitos / Disciplina', level: 5, xp: 820, color: 'bg-slate-100', borderColor: 'border-slate-300', icon: '🔥' },
  ])

  const positiveHabits: PositiveHabit[] = [
    { id: 'exercise', habit: 'Hacer ejercicio', area: 'Salud', xp: 50, varos: 100, icon: '💪' },
    { id: 'read', habit: 'Leer o estudiar', area: 'Desarrollo personal', xp: 40, varos: 80, icon: '📚' },
    { id: 'work', habit: 'Trabajar enfocado', area: 'Productividad', xp: 60, varos: 120, icon: '🎯' },
    { id: 'meditate', habit: 'Meditar', area: 'Estado mental / Emocional', xp: 30, varos: 60, icon: '🧘' },
    { id: 'connect', habit: 'Conectar con otros', area: 'Relaciones', xp: 35, varos: 70, icon: '🤝' },
    { id: 'spiritual', habit: 'Práctica espiritual', area: 'Espiritualidad', xp: 25, varos: 50, icon: '✨' },
    { id: 'finance', habit: 'Gestionar finanzas', area: 'Dinero', xp: 45, varos: 90, icon: '💰' },
    { id: 'discipline', habit: 'Mantener disciplina', area: 'Hábitos / Disciplina', xp: 40, varos: 80, icon: '🔥' },
  ]

  const negativeHabits: NegativeHabit[] = [
    { id: 'procrastinate', habit: 'Procrastinar mucho', hpLoss: 50, icon: '⏰' },
    { id: 'skip-exercise', habit: 'Saltarme el ejercicio', hpLoss: 30, icon: '🏃' },
    { id: 'bad-food', habit: 'Comer mal constantemente', hpLoss: 40, icon: '🍔' },
    { id: 'stay-up', habit: 'Desvelarme sin necesidad', hpLoss: 60, icon: '🌙' },
  ]

  const shopItems: ShopItem[] = [
    { id: 'beer', item: '1 cerveza', price: 200, icon: '🍺', description: 'Disfruta de una cerveza sin culpa' },
    { id: 'cheat-meal', item: 'Comida libre', price: 150, icon: '🍕', description: 'Cheat meal sin remordimientos' },
    { id: 'series', item: 'Maratón de serie', price: 100, icon: '📺', description: 'Binge watching permitido' },
    { id: 'rest-day', item: 'Día de descanso total', price: 300, icon: '😴', description: 'Descanso completo sin culpa' },
  ]

  const hpPercentage = (currentHP / maxHP) * 100

  // Agregar notificación
  const addNotification = (message: string, type: Notification['type']) => {
    const id = Math.random().toString(36).substr(2, 9)
    const notification: Notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
    }
    setNotifications(prev => [...prev, notification])
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3000)
  }

  // Calcular XP necesario para el siguiente nivel
  const getXPForNextLevel = (level: number) => level * 200

  // Completar hábito positivo
  const completePositiveHabit = (habit: PositiveHabit) => {
    const areaIndex = lifeAreas.findIndex(area => area.name === habit.area)
    if (areaIndex === -1) return

    const area = lifeAreas[areaIndex]
    const oldLevel = area.level
    const newXP = area.xp + habit.xp
    const xpForNextLevel = getXPForNextLevel(area.level)
    
    let newLevel = area.level
    let remainingXP = newXP
    
    // Subir de nivel si es necesario
    while (remainingXP >= getXPForNextLevel(newLevel) && newLevel < 20) {
      remainingXP -= getXPForNextLevel(newLevel)
      newLevel += 1
    }

    // Actualizar área
    const updatedAreas = [...lifeAreas]
    updatedAreas[areaIndex] = {
      ...area,
      level: newLevel,
      xp: remainingXP,
    }
    setLifeAreas(updatedAreas)

    // Agregar varos
    setVaros(prev => prev + habit.varos)

    // Notificaciones
    if (newLevel > oldLevel) {
      setLevelUpArea(habit.area)
      addNotification(`🎉 ¡Subiste a nivel ${newLevel} en ${habit.area}!`, 'level-up')
      setTimeout(() => setLevelUpArea(null), 2000)
    } else {
      addNotification(`+${habit.xp} XP y +${habit.varos} varos en ${habit.area}`, 'success')
    }
  }

  // Registrar mal hábito
  const registerNegativeHabit = (habit: NegativeHabit) => {
    const newHP = Math.max(0, currentHP - habit.hpLoss)
    setCurrentHP(newHP)
    
    if (newHP === 0) {
      addNotification('💀 Has "muerto" en el juego. Para revivir, recorre 50 km en menos de 4 horas.', 'error')
    } else {
      addNotification(`-${habit.hpLoss} HP por ${habit.habit}`, 'error')
    }
  }

  // Comprar item en tienda
  const buyShopItem = (item: ShopItem) => {
    if (varos >= item.price) {
      setVaros(prev => prev - item.price)
      addNotification(`✅ Compraste: ${item.item}`, 'success')
    } else {
      addNotification(`❌ No tienes suficientes varos. Necesitas ${item.price} varos.`, 'error')
    }
  }

  // Preparar datos para el radar chart
  const statsForRadar = useMemo(() => {
    return [
      { stat: 'Vitalidad', value: lifeAreas.find(a => a.name === 'Salud')?.level || 0 },
      { stat: 'Oficio', value: lifeAreas.find(a => a.name === 'Carrera / Negocios')?.level || 0 },
      { stat: 'Sabiduría', value: lifeAreas.find(a => a.name === 'Desarrollo personal')?.level || 0 },
      { stat: 'Aura', value: lifeAreas.find(a => a.name === 'Estado mental / Emocional')?.level || 0 },
      { stat: 'Inspiración', value: lifeAreas.find(a => a.name === 'Productividad')?.level || 0 },
    ]
  }, [lifeAreas])

  // Calcular estadísticas generales
  const totalLevel = useMemo(() => lifeAreas.reduce((sum, area) => sum + area.level, 0), [lifeAreas])
  const averageLevel = useMemo(() => (totalLevel / lifeAreas.length).toFixed(1), [totalLevel])
  const highestArea = useMemo(() => {
    return lifeAreas.reduce((max, area) => area.level > max.level ? area : max, lifeAreas[0])
  }, [lifeAreas])
  const lowestArea = useMemo(() => {
    return lifeAreas.reduce((min, area) => area.level < min.level ? area : min, lifeAreas[0])
  }, [lifeAreas])

  // Auto-remover notificaciones antiguas
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setNotifications(prev => prev.filter(n => now - n.timestamp < 3000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg border-2 animate-slide-in-right ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-300 text-green-800'
                : notification.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-800'
                : notification.type === 'level-up'
                ? 'bg-yellow-50 border-yellow-400 text-yellow-900 font-bold'
                : 'bg-blue-50 border-blue-300 text-blue-800'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Mi vida como videojuego
        </h1>
        <p className="text-lg md:text-xl text-slate-600 font-medium max-w-3xl mx-auto">
          Convertí mis metas y hábitos en un sistema de niveles, vida, experiencia y moneda ficticia.
        </p>
      </section>

      {/* Dashboard Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Stats y HP */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tus Stats - Radar Chart */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-slate-700 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center bg-slate-700/50">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-200 italic">Tus stats</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Nivel promedio</p>
                <p className="text-2xl font-bold text-slate-100">{averageLevel}</p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={statsForRadar}>
                  <PolarGrid stroke="#475569" strokeWidth={1} />
                  <PolarAngleAxis 
                    dataKey="stat" 
                    tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 'bold' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 16]} 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickCount={9}
                  />
                  <Radar
                    name="Stats"
                    dataKey="value"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.7}
                    strokeWidth={3}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '2px solid #475569',
                      borderRadius: '12px',
                      color: '#cbd5e1',
                      padding: '12px',
                    }}
                    labelStyle={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: '14px' }}
                    itemStyle={{ color: '#ef4444', fontWeight: 'bold' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Tu progreso actual</span>
              </div>
              <span>⚡ Powered by ChartBas</span>
            </div>
          </div>

          {/* HP y Varos - Card Mejorado */}
          <div className="bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 rounded-2xl border-2 border-red-200 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Avatar</h2>
                <p className="text-sm text-slate-600">Puntos de vida y recursos</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/80 rounded-xl px-4 py-3 border-2 border-amber-300 shadow-md">
                  <p className="text-xs text-slate-600 mb-1">Varos</p>
                  <p className="text-2xl font-bold text-amber-700">{varos.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                <span>HP: {currentHP} / {maxHP}</span>
                <span className={`px-3 py-1 rounded-lg ${
                  hpPercentage > 60 ? 'bg-green-100 text-green-700' :
                  hpPercentage > 30 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {Math.round(hpPercentage)}%
                </span>
              </div>
              <div className="relative h-12 bg-slate-200 rounded-full overflow-hidden border-2 border-slate-300 shadow-inner">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                    hpPercentage > 60 ? 'bg-gradient-to-r from-green-500 via-green-600 to-green-500' :
                    hpPercentage > 30 ? 'bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500' :
                    'bg-gradient-to-r from-red-500 via-red-600 to-red-500'
                  } shadow-lg`}
                  style={{ width: `${hpPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-800 drop-shadow-lg">
                    {currentHP} / {maxHP} HP
                  </span>
                </div>
              </div>
            </div>

            {currentHP === 0 && (
              <div className="mt-4 bg-red-100 border-2 border-red-400 rounded-xl p-4 animate-pulse">
                <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                  <span className="text-xl">💀</span>
                  Has "muerto" en el juego. Para revivir, debes recorrer 50 km en menos de 4 horas.
                </p>
              </div>
            )}

            {/* Estadísticas rápidas */}
            <div className="mt-6 grid grid-cols-3 gap-3 pt-4 border-t border-red-200">
              <div className="text-center">
                <p className="text-xs text-slate-600 mb-1">Nivel más alto</p>
                <p className="text-lg font-bold text-slate-900">{highestArea.level}</p>
                <p className="text-xs text-slate-500">{highestArea.name}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600 mb-1">Nivel más bajo</p>
                <p className="text-lg font-bold text-slate-900">{lowestArea.level}</p>
                <p className="text-xs text-slate-500">{lowestArea.name}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600 mb-1">Total niveles</p>
                <p className="text-lg font-bold text-slate-900">{totalLevel}</p>
                <p className="text-xs text-slate-500">9 áreas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Acciones Rápidas */}
        <div className="space-y-6">
          {/* Hábitos Positivos */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border-2 border-blue-200 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Hábitos Positivos</h3>
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-xs text-slate-600 mb-4">Completa hábitos para ganar XP y varos</p>
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {positiveHabits.map((habit) => {
                const area = lifeAreas.find(a => a.name === habit.area)
                return (
                  <button
                    key={habit.id}
                    onClick={() => completePositiveHabit(habit)}
                    className="w-full bg-white rounded-xl border-2 border-blue-200 p-4 hover:shadow-lg hover:border-blue-400 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-3xl group-hover:scale-110 transition-transform">{habit.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm mb-1">{habit.habit}</p>
                          <p className="text-xs text-slate-600 truncate">{habit.area}</p>
                          {area && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-xs font-semibold text-slate-500">Lv.{area.level}</span>
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[60px]">
                                <div 
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${(area.xp / getXPForNextLevel(area.level)) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-300 whitespace-nowrap">
                          +{habit.xp} XP
                        </span>
                        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-300 whitespace-nowrap">
                          +{habit.varos}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Malos Hábitos */}
          <div className="bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 rounded-2xl border-2 border-red-200 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Malos Hábitos</h3>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-xs text-slate-600 mb-4">Registra malos hábitos (reducen HP)</p>
            <div className="space-y-2">
              {negativeHabits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => registerNegativeHabit(habit)}
                  className="w-full bg-white rounded-xl border-2 border-red-200 p-4 hover:shadow-lg hover:border-red-400 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl group-hover:scale-110 transition-transform">{habit.icon}</span>
                      <p className="font-bold text-slate-900 text-sm">{habit.habit}</p>
                    </div>
                    <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold border-2 border-red-300 whitespace-nowrap">
                      -{habit.hpLoss} HP
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Áreas de Vida - Grid Mejorado */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">Las 9 áreas de mi vida</h2>
          <p className="text-slate-600">
            Cada área tiene un nivel. Los hábitos positivos me dan puntos de experiencia (XP).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lifeAreas.map((area, index) => {
            const xpForNextLevel = getXPForNextLevel(area.level)
            const xpProgress = Math.min((area.xp / xpForNextLevel) * 100, 100)
            const isLevelingUp = levelUpArea === area.name
            
            return (
              <div
                key={index}
                className={`${area.color} ${area.borderColor} rounded-xl border-2 p-5 shadow-md hover:shadow-xl transition-all ${
                  isLevelingUp ? 'ring-4 ring-yellow-400 ring-offset-2 scale-105' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{area.icon}</span>
                    <h3 className="font-bold text-slate-900 text-base">{area.name}</h3>
                  </div>
                  <div className={`bg-white/90 rounded-lg px-3 py-1.5 border-2 border-slate-300 ${
                    isLevelingUp ? 'animate-bounce' : ''
                  }`}>
                    <span className="text-xl font-bold text-slate-800">Lv.{area.level}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>XP: {area.xp}</span>
                    <span>Próximo: {xpForNextLevel}</span>
                  </div>
                  <div className="relative h-3 bg-white/60 rounded-full overflow-hidden border border-slate-300">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full transition-all duration-500 ${
                        isLevelingUp ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${xpProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-shimmer" />
                    </div>
                  </div>
                  {isLevelingUp && (
                    <p className="text-xs font-bold text-yellow-600 animate-pulse">🎉 ¡Subiendo de nivel!</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Tienda Mejorada */}
      <section className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-8 shadow-xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">La tiendita: antojos con control</h2>
            <p className="text-slate-700 max-w-2xl mx-auto">
              Gasta tus varos en antojos controlados. Si hice ejercicio 6 veces en la semana, 
              el fin de semana me puedo tomar una cerveza pagándola con varos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {shopItems.map((item) => {
              const canAfford = varos >= item.price
              return (
                <button
                  key={item.id}
                  onClick={() => buyShopItem(item)}
                  disabled={!canAfford}
                  className={`bg-white rounded-xl border-2 p-5 shadow-md hover:shadow-xl transition-all text-center group ${
                    canAfford 
                      ? 'border-amber-200 hover:border-amber-400 cursor-pointer' 
                      : 'border-slate-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{item.icon}</div>
                  <h3 className="font-bold text-slate-900 mb-2 text-sm">{item.item}</h3>
                  <p className="text-xs text-slate-600 mb-3">{item.description}</p>
                  <div className={`rounded-lg px-3 py-2 border-2 ${
                    canAfford 
                      ? 'bg-amber-100 border-amber-300 group-hover:bg-amber-200' 
                      : 'bg-slate-100 border-slate-300'
                  } transition-colors`}>
                    <span className={`text-lg font-bold ${
                      canAfford ? 'text-amber-700' : 'text-slate-500'
                    }`}>
                      {item.price} varos
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Explicación Final */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200 p-8 shadow-lg">
        <div className="max-w-3xl mx-auto space-y-4 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Por qué este juego funciona para mí</h2>
          <div className="space-y-3 text-slate-700 leading-relaxed">
            <p>
              Mi productividad se ha disparado. Ahora mis metas no son solo ideas, están conectadas a reglas claras 
              que puedo seguir cada día. El sistema convierte cada día en una partida donde gano experiencia y cuido mis puntos de vida.
            </p>
            <p className="pt-2 text-slate-600 italic">
              Si te llamó la atención este sistema, en mis redes sigo contando cómo lo uso para mejorar mi vida.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
