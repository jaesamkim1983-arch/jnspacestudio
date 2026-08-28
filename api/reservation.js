import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { sendKakaoMemo } from './_lib/kakao.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    name,
    phone,
    email,
    headcount,
    date_start,
    date_end,
    purpose,
    rental_items,
    referral_source,
    message,
  } = req.body || {};

  if (!name || !phone || !email || !date_start || !date_end) {
    return res.status(400).json({ error: '이름, 연락처, 이메일, 촬영날짜는 필수입니다.' });
  }

  const { error } = await supabase
    .from('reservations')
    .insert([{
      name,
      phone,
      email,
      headcount: headcount || null,
      date_start,
      date_end,
      purpose: purpose || null,
      rental_items: rental_items || null,
      referral_source: referral_source || null,
      message: message || null,
    }]);

  if (error) {
    console.error('Supabase insert error (reservations):', error);
    return res.status(500).json({ error: '예약 신청 저장에 실패했습니다.' });
  }

  const lines = [
    '📸 새로운 스튜디오 예약 신청이 도착했습니다',
    `이름: ${name}`,
    `연락처: ${phone}`,
    `이메일: ${email}`,
    headcount && `촬영인원: ${headcount}`,
    `촬영날짜: ${date_start} ~ ${date_end}`,
    purpose && `사용목적: ${purpose}`,
    rental_items && `무료물품대여: ${rental_items}`,
    referral_source && `방문경로: ${referral_source}`,
    message && `기타 문의사항: ${message}`,
  ].filter(Boolean);
  const notifyText = lines.join('\n');

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailAppPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailAppPassword },
      });
      await transporter.sendMail({
        from: `JN STUDIO 예약알림 <${gmailUser}>`,
        to: 'dstudioj@naver.com',
        subject: `[제이앤스튜디오] 새 예약 신청 - ${name}`,
        text: notifyText,
      });
    } catch (e) {
      console.error('Gmail 이메일 전송 오류:', e);
    }
  }

  try {
    await sendKakaoMemo(supabaseAdmin, notifyText);
  } catch (e) {
    console.error('카카오 나에게 보내기 오류:', e);
  }

  return res.status(200).json({ success: true });
}
