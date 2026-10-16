import { localTransactionTime, transactionInstant } from './transactionTime.js';

export function matchTimeLabel(value, zone = 'Asia/Ho_Chi_Minh') {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Chưa rõ thời gian';
  const [day, time] = localTransactionTime(value, zone).split('T');
  return `${time} - ${day.split('-').reverse().join('/')}`;
}

export function lateArrivalInstant(kickoff, time, zone = 'Asia/Ho_Chi_Minh') {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw Error('Chọn giờ dự kiến đến.');
  const day = localTransactionTime(kickoff, zone).slice(0, 10);
  const eta = transactionInstant(`${day}T${time}`, zone);
  if (Date.parse(eta) <= Date.parse(kickoff))
    throw Error('Giờ dự kiến đến phải sau giờ bắt đầu trận đấu.');
  if (Date.parse(eta) > Date.parse(kickoff) + 12 * 3600000)
    throw Error('Giờ dự kiến đến không được quá 12 giờ sau giờ bắt đầu.');
  return eta;
}
