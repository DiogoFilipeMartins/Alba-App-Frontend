import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import CustomAlertModal from '../components/CustomAlertModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiService, CalendarEvent } from '../services/apiService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Calendar'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const CELL_W = SCREEN_W / 7;
const HOUR_H = 60;
const TIMELINE_HOURS = Array.from({ length: 24 }, (_, i) => i);

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const EVENT_COLORS = [
  '#007AFF',
  '#34C759',
  '#FF3B30',
  '#FF9500',
  '#AF52DE',
  '#FF2D55',
  '#5AC8FA',
  '#FFCC00',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDOW(y: number, m: number) { return new Date(y, m, 1).getDay(); }
const todayStr = () => new Date().toISOString().slice(0, 10);
const dayISO = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const eventDay = (ts?: string) => ts?.slice(0, 10) ?? '';
const fmtTime = (ts?: string | null) => ts?.slice(11, 16) ?? '';
const buildTS = (date: string, time: string) => {
  if (!time) return `${date}T00:00:00+00:00`;
  const match = time.match(/^(\d{1,2})[.:h](\d{0,2})$/i);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = (match[2] || '0').padStart(2, '0');
    return `${date}T${h}:${m}:00+00:00`;
  }
  const matchHour = time.match(/^(\d{1,2})$/);
  if (matchHour) {
    const h = matchHour[1].padStart(2, '0');
    return `${date}T${h}:00:00+00:00`;
  }
  return `${date}T00:00:00+00:00`;
};
const colorForEvent = (e: CalendarEvent, idx: number) => e.color || EVENT_COLORS[idx % EVENT_COLORS.length];
const fmtHour = (h: number) => h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
const eventTopOffset = (ts?: string) => {
  if (!ts) return 0;
  const h = parseInt(ts.slice(11, 13), 10);
  const m = parseInt(ts.slice(14, 16), 10);
  return h * HOUR_H + (m / 60) * HOUR_H;
};
const eventHeight = (start?: string, end?: string | null) => {
  if (!start || !end) return HOUR_H;
  const s = parseInt(start.slice(11, 13), 10) * 60 + parseInt(start.slice(14, 16), 10);
  const e = parseInt(end.slice(11, 13), 10) * 60 + parseInt(end.slice(14, 16), 10);
  return Math.max((e - s) / 60 * HOUR_H, 24);
};

const parseTimeStr = (timeStr: string, defaultH: number) => {
  const d = new Date();
  if (timeStr && timeStr.includes(':')) {
    const [h, m] = timeStr.split(':');
    d.setHours(Number(h), Number(m), 0, 0);
  } else {
    d.setHours(defaultH, 0, 0, 0);
  }
  return d;
};

// ─── DotPill ──────────────────────────────────────────────────────────────────

interface DotPillProps { color: string; label: string; allDay: boolean; }

const DotPill: React.FC<DotPillProps> = ({ color, label }) => (
  <View style={[dp.wrap, { backgroundColor: color + '22' }]}>
    <View style={[dp.dot, { backgroundColor: color }]} />
    <Text numberOfLines={1} style={[dp.text, { color }]}>{label}</Text>
  </View>
);

const dp = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1.5, marginTop: 2, marginHorizontal: 1,
    maxWidth: CELL_W - 6,
  },
  dot: { width: 5, height: 5, borderRadius: 3, marginRight: 3, flexShrink: 0 },
  text: { fontSize: 10, fontWeight: '500', flexShrink: 1 },
});

// ─── DayTimeline ──────────────────────────────────────────────────────────────

interface TimelineProps {
  events: CalendarEvent[];
  date: string;
  ios: { text: string; textSecondary: string; cardBg: string; separator: string; accent: string; todayBg: string; };
  onEdit: (e: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  isDark: boolean;
  onBack?: () => void;
}

function DayTimeline({ events, date, ios, onEdit, onDelete, onAdd, isDark, onBack }: TimelineProps) {
  const scrollRef = useRef<ScrollView>(null);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = date === todayStr();

  useEffect(() => {
    const targetHour = isToday ? Math.max(now.getHours() - 1, 0) : 8;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetHour * HOUR_H, animated: true });
    }, 300);
  }, [date]);

  const allDayEvents = events.filter(e => e.all_day);
  const timedEvents = events.filter(e => !e.all_day);

  const layoutEvents = useMemo(() => {
    const sorted = [...timedEvents].sort((a, b) => {
      const startA = eventTopOffset(a.starts_at);
      const startB = eventTopOffset(b.starts_at);
      if (startA === startB) {
        return eventHeight(b.starts_at, b.ends_at) - eventHeight(a.starts_at, a.ends_at);
      }
      return startA - startB;
    });

    const columns: { top: number; bottom: number }[][] = [];
    let lastEventEnding: number | null = null;
    const groups: { event: CalendarEvent, top: number, bottom: number, colIndex: number, originalIndex: number }[][] = [];
    let currentGroup: { event: CalendarEvent, top: number, bottom: number, colIndex: number, originalIndex: number }[] = [];

    sorted.forEach(e => {
      const originalIndex = events.findIndex(ev => ev.id === e.id);
      const top = eventTopOffset(e.starts_at);
      const bottom = top + eventHeight(e.starts_at, e.ends_at);

      if (lastEventEnding !== null && top >= lastEventEnding) {
        groups.push([...currentGroup]);
        columns.length = 0;
        currentGroup = [];
        lastEventEnding = null;
      }

      let placed = false;
      let colIndex = 0;
      for (let i = 0; i < columns.length; i++) {
        if (top >= columns[i][columns[i].length - 1].bottom) {
          columns[i].push({ top, bottom });
          colIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([{ top, bottom }]);
        colIndex = columns.length - 1;
      }

      currentGroup.push({ event: e, top, bottom, colIndex, originalIndex });
      lastEventEnding = lastEventEnding === null ? bottom : Math.max(lastEventEnding, bottom);
    });
    if (currentGroup.length > 0) groups.push(currentGroup);

    const availW = SCREEN_W - 64 - 8;
    const result: any[] = [];
    
    groups.forEach(group => {
      const numCols = Math.max(...group.map(g => g.colIndex)) + 1;
      const w = availW / numCols;
      group.forEach(item => {
        result.push({
          event: item.event,
          top: item.top,
          height: item.bottom - item.top,
          left: 64 + (item.colIndex * w),
          width: w > 2 ? w - 2 : w,
          color: colorForEvent(item.event, item.originalIndex)
        });
      });
    });

    return result;
  }, [timedEvents, events]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header do dia */}
      <View style={[tl.header, { borderBottomColor: ios.separator }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onBack && (
            <Pressable onPress={onBack} style={{ marginRight: 12 }}>
              <Ionicons name="chevron-back" size={24} color={ios.accent} />
            </Pressable>
          )}
          <View>
            <Text style={[tl.headerWeekday, { color: ios.todayBg }]}>
              {new Date(date + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long' }).toUpperCase()}
            </Text>
            <Text style={[tl.headerDate, { color: ios.text }]}>
              {new Date(date + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}
            </Text>
          </View>
        </View>
        <Pressable onPress={onAdd} style={[tl.addBtn, { backgroundColor: ios.accent }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Eventos todo o dia */}
      {allDayEvents.length > 0 && (
        <View style={[tl.allDayStrip, { borderBottomColor: ios.separator, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
          <Text style={[tl.allDayLabel, { color: ios.textSecondary }]}>todo o dia</Text>
          <View style={{ flex: 1, gap: 3 }}>
            {allDayEvents.map((e, i) => (
              <Pressable key={e.id} onPress={() => onEdit(e)}>
                <View style={[tl.allDayPill, { backgroundColor: EVENT_COLORS[i % EVENT_COLORS.length] }]}>
                  <Text style={tl.allDayPillText} numberOfLines={1}>{e.title}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Timeline com horas */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={tl.timelineWrap}>
          {TIMELINE_HOURS.map(h => (
            <View key={h} style={[tl.hourRow, { height: HOUR_H }]}>
              <Text style={[tl.hourLabel, { color: ios.textSecondary }]}>{fmtHour(h)}</Text>
              <View style={[tl.hourLine, { backgroundColor: ios.separator }]} />
            </View>
          ))}

          {isToday && (
            <View style={[tl.nowLine, { top: (nowMinutes / 60) * HOUR_H }]}>
              <View style={tl.nowDot} />
              <View style={tl.nowBar} />
            </View>
          )}

          {layoutEvents.map(({ event: e, top, height, left, width, color }) => (
            <Pressable
              key={e.id}
              style={[tl.eventBlock, {
                top, height, left, width,
                backgroundColor: color + '22',
                borderLeftColor: color,
              }]}
              onPress={() => onEdit(e)}
              onLongPress={() => onDelete(e.id)}
            >
              <Text style={[tl.eventTitle, { color }]} numberOfLines={height > 40 ? 2 : 1}>{e.title}</Text>
              {height > 30 && (
                <Text style={[tl.eventTime, { color: color + 'BB' }]}>
                  {fmtTime(e.starts_at)}{e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}
                </Text>
              )}
              {height > 50 && e.description && (
                <Text style={[tl.eventDesc, { color: ios.textSecondary }]} numberOfLines={Math.floor((height - 35) / 14)}>
                  {e.description}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const tl = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerWeekday: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  headerDate: { fontSize: 20, fontWeight: '700', marginTop: 1 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  allDayStrip: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  allDayLabel: { fontSize: 11, width: 48, paddingTop: 3 },
  allDayPill: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  allDayPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  timelineWrap: { position: 'relative', paddingBottom: 40, marginTop: 16 },
  hourRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hourLabel: { width: 56, textAlign: 'right', fontSize: 11, fontWeight: '400', paddingRight: 8, marginTop: -7 },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },
  nowLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  nowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', marginLeft: 50 },
  nowBar: { flex: 1, height: 1.5, backgroundColor: '#FF3B30' },
  eventBlock: { position: 'absolute', borderLeftWidth: 3, borderRadius: 6, padding: 5, overflow: 'hidden' },
  eventTitle: { fontSize: 12, fontWeight: '600' },
  eventTime: { fontSize: 11, marginTop: 1 },
  eventDesc: { fontSize: 10, marginTop: 2, lineHeight: 14 },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(todayStr());
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(todayStr());
  const [form, setForm] = useState({
    title: '', description: '', startTime: '', endTime: '', allDay: false, colorIdx: 0,
  });
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [alertState, setAlertState] = useState({ visible: false, title: '', message: '', icon: undefined as any, iconColor: undefined as any, primaryButton: undefined as any, secondaryButton: undefined as any });
  const closeAlert = () => setAlertState(s => ({ ...s, visible: false }));
  const showAlert = (config: Omit<typeof alertState, 'visible'>) => setAlertState({ ...config, visible: true });

  const touchX = useRef(0);

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00+00:00`;
      const last = daysInMonth(year, month);
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${last}T23:59:59+00:00`;
      const data = await apiService.getCalendarEvents(userId, from, to);
      setEvents(data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month, userId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Request notification permissions on mount
  useEffect(() => {
    notificationService.requestPermissions();
  }, []);

  // ── Grid ──────────────────────────────────────────────────────────────────

  const total = daysInMonth(year, month);
  const first = firstDOW(year, month);
  const cells = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const eventsForDay = (iso: string) => events.filter(e => eventDay(e.starts_at) === iso);

  // ── Navigation ────────────────────────────────────────────────────────────

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDay(todayStr()); };

  // ── Form ──────────────────────────────────────────────────────────────────

  const resetForm = () => setForm({ title: '', description: '', startTime: '', endTime: '', allDay: false, colorIdx: 0 });

  const openNewForm = (iso: string) => {
    setFormDate(iso); setEditingEvent(null); resetForm();
    setTimeout(() => setShowForm(true), 100);
  };

  const openEditForm = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormDate(eventDay(event.starts_at) || todayStr());
    setForm({
      title: event.title,
      description: event.description || '',
      startTime: event.all_day ? '' : fmtTime(event.starts_at),
      endTime: event.all_day ? '' : fmtTime(event.ends_at ?? undefined),
      allDay: event.all_day,
      colorIdx: event.color ? Math.max(0, EVENT_COLORS.indexOf(event.color)) : 0,
    });
    setTimeout(() => setShowForm(true), 100);
  };

  const closeForm = () => { setShowForm(false); setEditingEvent(null); resetForm(); };

  const handleSave = async () => {
    if (!form.title.trim()) { showAlert({ title: 'Título obrigatório', message: 'Escreve um título para o evento.', icon: 'alert-circle', iconColor: '#f59e0b', primaryButton: undefined, secondaryButton: undefined }); return; }
    if (!userId) { showAlert({ title: 'Erro', message: 'Faz login novamente.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined, secondaryButton: undefined }); return; }
    setSaving(true);
    try {
      const starts = form.allDay ? buildTS(formDate, '00:00') : buildTS(formDate, form.startTime);
      const ends = form.allDay ? buildTS(formDate, '23:59') : (form.endTime ? buildTS(formDate, form.endTime) : null);
      const payload = {
        user_id: userId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        starts_at: starts, ends_at: ends, all_day: form.allDay,
        color: EVENT_COLORS[form.colorIdx],
      };
      let savedEvent: CalendarEvent;
      if (editingEvent) {
        savedEvent = await apiService.updateCalendarEvent(editingEvent.id, payload);
      } else {
        savedEvent = await apiService.createCalendarEvent(payload);
      }
      // Schedule a 30-min reminder (skipped for all-day events)
      if (!form.allDay) {
        notificationService.scheduleEventReminder(savedEvent.id, savedEvent.title, savedEvent.starts_at);
      } else {
        notificationService.cancelEventReminder(savedEvent.id);
      }
      closeForm();
      await fetchEvents();
    } catch (e: any) { showAlert({ title: 'Erro', message: e.message, icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined, secondaryButton: undefined }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    showAlert({
      title: 'Eliminar evento',
      message: 'Tens a certeza que queres eliminar este evento?',
      icon: 'trash',
      iconColor: '#ef4444',
      primaryButton: {
        text: 'Eliminar',
        onPress: async () => {
          await apiService.deleteCalendarEvent(id);
          await notificationService.cancelEventReminder(id);
          setEvents(p => p.filter(e => e.id !== id));
        },
        destructive: true,
      },
      secondaryButton: { text: 'Cancelar', onPress: () => {} },
    });
  };

  // ── Theme ─────────────────────────────────────────────────────────────────

  const today = todayStr();
  const ios = {
    accent: colors.primary,
    todayBg: colors.primary,
    cellBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    headerBg: isDark ? '#1C1C1E' : '#F2F2F7',
    sheetBg: isDark ? '#1C1C1E' : '#FFFFFF',
    handle: isDark ? '#48484A' : '#C7C7CC',
    cardBg: isDark ? '#2C2C2E' : '#F2F2F7',
    inputBg: isDark ? '#2C2C2E' : '#F2F2F7',
    separator: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.root, { backgroundColor: ios.headerBg }]} edges={['top']}>

      {viewMode === 'month' ? (
        <>
          {/* Header */}
          <View style={[s.header, { backgroundColor: ios.headerBg }]}>
            <View style={s.headerLeft}>
              <Pressable onPress={prev} hitSlop={8} style={s.navBtn}>
                <Ionicons name="chevron-back" size={20} color={ios.accent} />
              </Pressable>
              <Pressable onPress={next} hitSlop={8} style={s.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={ios.accent} />
              </Pressable>
            </View>
            <Pressable onPress={goToday} style={s.headerCenter}>
              <Text style={[s.monthTitle, { color: ios.text }]}>{MONTHS[month]}</Text>
              <Text style={[s.yearTitle, { color: ios.textSecondary }]}>{year}</Text>
            </Pressable>
            <View style={s.headerRight}>
              {loading && <ActivityIndicator size="small" color={ios.accent} style={{ marginRight: 6 }} />}
              <Pressable hitSlop={8} style={s.navBtn} onPress={() => openNewForm(selectedDay)}>
                <Ionicons name="add" size={24} color={ios.accent} />
              </Pressable>
            </View>
          </View>

          {/* Dias da semana */}
          <View style={[s.weekRow, { backgroundColor: ios.headerBg, borderBottomColor: ios.cellBorder }]}>
            {WEEK_DAYS.map((d, i) => (
              <Text key={i} style={[s.weekLabel, { color: i === 0 || i === 6 ? ios.todayBg : ios.textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grelha */}
          <View
            style={[s.grid, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
            onTouchStart={e => { touchX.current = e.nativeEvent.pageX; }}
            onTouchEnd={e => {
              const diff = e.nativeEvent.pageX - touchX.current;
              if (Math.abs(diff) > 60) { if (diff > 0) prev(); else next(); }
            }}
          >
            {weeks.map((week, wi) => (
              <View key={wi} style={[s.weekLine, { borderBottomColor: ios.cellBorder }]}>
                {week.map((d, di) => {
                  const iso = d ? dayISO(year, month, d) : '';
                  const isToday = iso === today;
                  const isSelected = iso === selectedDay && iso !== today;
                  const dayEvts = d ? eventsForDay(iso) : [];
                  const isWeekend = di === 0 || di === 6;
                  return (
                    <Pressable
                      key={di}
                      style={[s.cell, { borderRightColor: ios.cellBorder }]}
                      onPress={() => {
                        if (iso) {
                          setSelectedDay(iso);
                          setViewMode('day');
                        }
                      }}
                    >
                      <View style={[
                        s.dayNumWrap,
                        isToday && { backgroundColor: ios.todayBg },
                        isSelected && { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' },
                      ]}>
                        <Text style={[
                          s.dayNum,
                          { color: d ? (isWeekend ? ios.todayBg : ios.text) : 'transparent' },
                          (isToday || isSelected) && { color: isToday ? '#FFFFFF' : ios.text },
                        ]}>
                          {d ?? ''}
                        </Text>
                      </View>
                      <ScrollView style={s.pillsScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                        {dayEvts.map((e, ei) => (
                          <DotPill key={e.id} color={colorForEvent(e, ei)} label={e.title} allDay={e.all_day} />
                        ))}
                      </ScrollView>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
          <DayTimeline
            events={eventsForDay(selectedDay)}
            date={selectedDay}
            ios={{
              text: ios.text,
              textSecondary: ios.textSecondary,
              cardBg: ios.cardBg,
              separator: ios.separator,
              accent: ios.accent,
              todayBg: ios.todayBg,
            }}
            onEdit={openEditForm}
            onDelete={handleDelete}
            onAdd={() => openNewForm(selectedDay)}
            isDark={isDark}
            onBack={() => setViewMode('month')}
          />
        </View>
      )}

      {/* Modal formulário */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={closeForm} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={closeForm} />
          <View style={[s.formSheet, { backgroundColor: ios.sheetBg, paddingBottom: insets.bottom + 16 }]}>
            <View style={[s.sheetHandle, { backgroundColor: ios.handle }]} />
            <View style={s.formHeader}>
              <Pressable onPress={closeForm}>
                <Text style={[s.formCancel, { color: ios.accent }]}>Cancelar</Text>
              </Pressable>
              <Text style={[s.formTitle, { color: ios.text }]}>
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </Text>
              <Pressable onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={ios.accent} />
                  : <Text style={[s.formSave, { color: ios.accent }]}>{editingEvent ? 'Atualizar' : 'Adicionar'}</Text>}
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {/* Cor */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                {EVENT_COLORS.map((c, i) => (
                  <Pressable key={i} onPress={() => setForm(f => ({ ...f, colorIdx: i }))}
                    style={[s.colorDot, { backgroundColor: c }, form.colorIdx === i && s.colorDotSelected]} />
                ))}
              </ScrollView>

              <Text style={[s.fieldLabel, { color: ios.textSecondary }]}>TÍTULO</Text>
              <TextInput
                style={[s.input, { backgroundColor: ios.inputBg, color: ios.text }]}
                placeholder="Título do evento" placeholderTextColor={ios.textSecondary}
                value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} autoFocus
              />

              <Text style={[s.fieldLabel, { color: ios.textSecondary }]}>DESCRIÇÃO</Text>
              <TextInput
                style={[s.input, s.inputMultiline, { backgroundColor: ios.inputBg, color: ios.text }]}
                placeholder="Notas (opcional)" placeholderTextColor={ios.textSecondary}
                multiline value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))}
              />

              <View style={[s.toggleRow, { backgroundColor: ios.inputBg }]}>
                <Text style={[s.toggleLabel, { color: ios.text }]}>Todo o dia</Text>
                <Switch
                  value={form.allDay} onValueChange={v => setForm(f => ({ ...f, allDay: v }))}
                  trackColor={{ false: '#767577', true: ios.accent }}
                  thumbColor="#FFFFFF" ios_backgroundColor="#767577"
                />
              </View>

              {!form.allDay && (
                <View style={s.timeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: ios.textSecondary }]}>INÍCIO</Text>
                    {Platform.OS === 'ios' ? (
                      <View style={[s.input, { backgroundColor: ios.inputBg, paddingVertical: 8, height: 50, justifyContent: 'center' }]}>
                        <DateTimePicker
                          value={parseTimeStr(form.startTime, 9)}
                          mode="time"
                          display="compact"
                          themeVariant={isDark ? 'dark' : 'light'}
                          onChange={(e, d) => {
                            if (d) setForm(f => ({ ...f, startTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }));
                          }}
                        />
                      </View>
                    ) : (
                      <>
                        <Pressable 
                          style={[s.input, { backgroundColor: ios.inputBg, height: 50, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }]}
                          onPress={() => setShowPicker('start')}
                        >
                          <Ionicons name="time-outline" size={18} color={ios.text} style={{ marginRight: 8 }} />
                          <Text style={{ color: ios.text, fontSize: 16 }}>{form.startTime || '--:--'}</Text>
                        </Pressable>
                        {showPicker === 'start' && (
                          <DateTimePicker
                            value={parseTimeStr(form.startTime, 9)}
                            mode="time"
                            display="default"
                            is24Hour={true}
                            onChange={(e, d) => {
                              setShowPicker(null);
                              if (e.type === 'set' && d) {
                                setForm(f => ({ ...f, startTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }));
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: ios.textSecondary }]}>FIM</Text>
                    {Platform.OS === 'ios' ? (
                      <View style={[s.input, { backgroundColor: ios.inputBg, paddingVertical: 8, height: 50, justifyContent: 'center' }]}>
                        <DateTimePicker
                          value={parseTimeStr(form.endTime, 10)}
                          mode="time"
                          display="compact"
                          themeVariant={isDark ? 'dark' : 'light'}
                          onChange={(e, d) => {
                            if (d) setForm(f => ({ ...f, endTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }));
                          }}
                        />
                      </View>
                    ) : (
                      <>
                        <Pressable 
                          style={[s.input, { backgroundColor: ios.inputBg, height: 50, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }]}
                          onPress={() => setShowPicker('end')}
                        >
                          <Ionicons name="time-outline" size={18} color={ios.text} style={{ marginRight: 8 }} />
                          <Text style={{ color: ios.text, fontSize: 16 }}>{form.endTime || '--:--'}</Text>
                        </Pressable>
                        {showPicker === 'end' && (
                          <DateTimePicker
                            value={parseTimeStr(form.endTime, 10)}
                            mode="time"
                            display="default"
                            is24Hour={true}
                            onChange={(e, d) => {
                              setShowPicker(null);
                              if (e.type === 'set' && d) {
                                setForm(f => ({ ...f, endTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }));
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        icon={alertState.icon}
        iconColor={alertState.iconColor}
        primaryButton={alertState.primaryButton}
        secondaryButton={alertState.secondaryButton}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({

  root: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },

  headerLeft: { flexDirection: 'row', gap: 2, flex: 1 },

  headerCenter: { alignItems: 'center', flex: 2 },

  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1, gap: 2 },

  navBtn: { padding: 6 },

  monthTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  
  yearTitle: { fontSize: 13, fontWeight: '400', marginTop: -1 },

  weekRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },

  weekLabel: { width: CELL_W, textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: 5, letterSpacing: 0.2 },

  grid: { flex: 1 },

  weekLine: { flexDirection: 'row', flex: 1, borderBottomWidth: StyleSheet.hairlineWidth },

  cell: { width: CELL_W, borderRightWidth: StyleSheet.hairlineWidth, paddingBottom: 2 },

  dayNumWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', margin: 3, alignSelf: 'center' },
  
  dayNum: { fontSize: 13, fontWeight: '400' },

  pillsScroll: { flex: 1, paddingHorizontal: 1 },

  sheetHandle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },

  formSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 10 },

  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },

  formTitle: { fontSize: 17, fontWeight: '600' },

  formCancel: { fontSize: 16 },

  formSave: { fontSize: 16, fontWeight: '600' },

  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },

  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },

  inputMultiline: { height: 80, textAlignVertical: 'top' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },

  toggleLabel: { fontSize: 15 },

  timeRow: { flexDirection: 'row', gap: 12 },

  colorDot: { width: 28, height: 28, borderRadius: 14 },

  colorDotSelected: { borderWidth: 3, borderColor: '#FFFFFF', transform: [{ scale: 1.15 }] },
});
