// Cloudflare Pages Function: handles waitlist form POST to /waitlist
// 静态文件 (index.html) 由 Cloudflare 自动伺服，本函数只拦截匹配的路由。

export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const email = formData.get('email');

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, message: 'A valid email is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 暂存到 Worker 日志（Cloudflare 控制台 Workers Logs 可见）
    // 后续可接 KV / D1 / 转发到邮箱，此处先留 TODO。
    console.log('New LumTale waitlist signup:', email);

    return new Response(
      JSON.stringify({ success: true, message: "You're on the list!" }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
