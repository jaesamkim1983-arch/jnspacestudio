import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase가 설정되지 않았습니다.' });
  }

  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10); // 1-12

  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({ error: 'year, month 쿼리 파라미터가 필요합니다.' });
  }

  const pad = (n) => String(n).padStart(2, '0');
  const rangeStart = `${year}-${pad(month)}-01`;
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const rangeEnd = `${nextMonth.y}-${pad(nextMonth.m)}-01`;

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('date_start, date_end')
    .gte('date_start', rangeStart)
    .lt('date_start', rangeEnd)
    .order('date_start', { ascending: true });

  if (error) {
    console.error('Supabase select error (reservations):', error);
    return res.status(500).json({ error: '예약 현황을 불러오지 못했습니다.' });
  }

  const bookings = (data || [])
    .map((row) => {
      const [startDate, startTime] = String(row.date_start || '').split('T');
      const [, endTime] = String(row.date_end || '').split('T');
      if (!startDate || !startTime) return null;
      return {
        date: startDate,
        start: startTime.slice(0, 5),
        end: endTime ? endTime.slice(0, 5) : null,
      };
    })
    .filter(Boolean);

  return res.status(200).json({ bookings });
}
