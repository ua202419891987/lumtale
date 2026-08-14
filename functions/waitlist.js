// Cloudflare Pages Function: handles waitlist form POST to /waitlist
// 静态文件 (index.html) 由 Cloudflare 自动伺服，本函数只拦截匹配的路由。
//
// WAITLIST_WEBHOOK 说明（重要）:
//   这是一个指向 Google Apps Script (或其他接收端) 的 URL，用于把新邮箱线索
//   实时转发到 Google Sheet / 邮件等。它必须作为 Pages 环境变量 (env var)
//   在 Cloudflare Dashboard 的 "Pages > 你的项目 > Settings > Environment variables"
//   中设置（变量名必须精确为 WAITLIST_WEBHOOK）。本地 wrangler dev 可在
//   .dev.vars 或 wrangler.toml 的 [vars] 中配置。若未设置该变量，则跳过转发，
//   仅保留 console.log 作为兜底记录，不阻塞用户注册。

const EMAIL_MAX_LENGTH = 254;

// 轻量邮箱格式校验：必须有 @、含本地部分和域名、总字符数 <= 254。
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH) return false;
  // 简单但实用的格式检查：user@host.tld
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestPost(context) {
  // 1) 解析请求体。无 body 或表单解析失败时，按"无效请求"返回 400，
  //    避免直接抛到 500 破坏表单契约。
  let email;
  try {
    const contentType = context.request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await context.request.json();
      email = body && body.email;
    } else {
      const formData = await context.request.formData();
      email = formData.get('email');
    }
  } catch (e) {
    // body 缺失 / 解析失败：视为无效输入
    return new Response(
      JSON.stringify({ success: false, message: 'A valid email is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2) 轻量滥用防护 + 格式校验：缺失、过长、格式不合法一律拒绝。
  if (!email || !isValidEmail(email)) {
    return new Response(
      JSON.stringify({ success: false, message: 'A valid email is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3) 兜底日志：无论 webhook 是否配置，始终记录到 Worker 日志
  //    （Cloudflare 控制台 Workers Logs 可见）。
  console.log('New LumTale waitlist signup:', email);

  // 4) 若配置了 WAITLIST_WEBHOOK，则转发线索到 Google Apps Script 接收端。
  //    webhook 失败只记录错误，绝不阻塞用户注册（永远返回 success）。
  const webhook = context.env && context.env.WAITLIST_WEBHOOK;
  if (webhook) {
    try {
      const target = webhook + '?email=' + encodeURIComponent(email);
      await fetch(target, { method: 'GET' });
    } catch (err) {
      console.error('Waitlist webhook forward failed for', email, '-', err && err.message);
    }
  }

  // 5) 保持现有表单契约：返回成功 JSON。
  return new Response(
    JSON.stringify({ success: true, message: "You're on the list!" }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
