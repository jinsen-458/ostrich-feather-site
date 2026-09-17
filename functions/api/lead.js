// Cloudflare Pages Function：接收表单提交，通过 Resend 发送邮件
// 路由：POST /api/lead
// 环境变量（在 Cloudflare Pages 后台配置，不要写进代码）：
//   RESEND_API_KEY  必填，Resend 的 API Key（re_ 开头）
//   LEAD_EMAIL      可选，收件邮箱，默认 changfuliu525@gmail.com
//   FROM_EMAIL      可选，发件地址，默认用 Resend 的 onboarding 地址

export async function onRequestPost({ request, env }) {
  const jsonHeaders = { 'content-type': 'application/json' };

  try {
    // 1) 解析请求体（支持 JSON 和普通表单两种格式）
    let name = '';
    let contact = '';
    let requirements = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      name = String(body.name || '');
      contact = String(body.contact || '');
      requirements = String(body.requirements || '');
    } else {
      const form = await request.formData();
      name = String(form.get('name') || '');
      contact = String(form.get('contact') || '');
      requirements = String(form.get('requirements') || '');
    }

    // 2) 基础校验
    if (!requirements.trim()) {
      return new Response(JSON.stringify({ ok: false, error: 'requirements is required' }), { status: 400, headers: jsonHeaders });
    }

    // 3) 读取环境变量
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'email service not configured' }), { status: 500, headers: jsonHeaders });
    }
    const toEmail = env.LEAD_EMAIL || 'changfuliu525@gmail.com';
    const fromEmail = env.FROM_EMAIL || 'Ostrich Feather Factory <noreply@ostrichfeatherfactoryliu.com>';

    // 4) 组装邮件正文
    const html = [
      '<h2 style="margin:0 0 16px;font-family:Arial,sans-serif">New inquiry from your website</h2>',
      '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:15px">',
      '<tr><td style="font-weight:bold">Name</td><td>' + escapeHtml(name || '-') + '</td></tr>',
      '<tr><td style="font-weight:bold">Contact</td><td>' + escapeHtml(contact || '-') + '</td></tr>',
      '<tr><td style="font-weight:bold">Requirements</td><td>' + escapeHtml(requirements) + '</td></tr>',
      '</table>'
    ].join('');

    // 5) 调用 Resend API 发送邮件
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: 'New inquiry from your website',
        html: html
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ ok: false, error: 'email send failed', detail: detail.slice(0, 300) }), { status: 502, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'server error' }), { status: 500, headers: jsonHeaders });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
