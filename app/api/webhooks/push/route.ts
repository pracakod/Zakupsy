import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  'mailto:kontakt@zakupsy.pl',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Upewnijmy się że to jest webhook insert on messages
    if (body.type === 'INSERT' && body.table === 'messages') {
      const message = body.record;
      const receiver_id = message.receiver_id;
      const sender_id = message.sender_id;

      // Pobierz info o nadawcy
      const { data: sender } = await supabase.from('profiles').select('username, email').eq('id', sender_id).single();
      const senderName = sender?.username || sender?.email?.split('@')[0] || "Użytkownik";

      // Pobierz subskrypcje powiadomień użytkownika
      const { data: subs, error } = await supabase.rpc('get_push_subscriptions_for_user', { target_user_id: receiver_id });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (subs && subs.length > 0) {
        const payload = JSON.stringify({
          title: `Nowa wiadomość od ${senderName}`,
          body: `${message.content.substring(0, 40)}${message.content.length > 40 ? '...' : ''}`,
          url: '/friends'
        });

        const pushPromises = subs.map(async (sub: any) => {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: {
                auth: sub.auth,
                p256dh: sub.p256dh
              }
            }, payload);
          } catch (error: any) {
            if (error.statusCode === 410 || error.statusCode === 404) {
              // Subskrypcja wygasła
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
            console.error('Webpush sending error:', error);
          }
        });

        await Promise.all(pushPromises);
      }
    }

    return NextResponse.json({ success: true, message: 'Processed webhook' });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
