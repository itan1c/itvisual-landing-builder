export async function onRequestPost({ request, env }) {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const token = auth.replace("Bearer ", "");

    const sender = await env.DB.prepare("SELECT email FROM users WHERE token = ?").bind(token).first();
    if (!sender) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { targetEmail, project } = await request.json();
    if (!targetEmail || !project) return new Response(JSON.stringify({ error: "Невірні дані" }), { status: 400 });

    const target = await env.DB.prepare("SELECT email FROM users WHERE LOWER(email) = LOWER(?)").bind(targetEmail).first();
    if (!target) return new Response(JSON.stringify({ error: "Користувача з таким email не знайдено" }), { status: 404 });

    const id = crypto.randomUUID();
    const name = (project.name || "Shared") + ` (від ${sender.email})`;
    const html = project.html || "";
    const files = project.files || null;
    const template = project.template || null;

    await env.DB.prepare("INSERT INTO projects (id, user_email, name, html, files, template) VALUES (?, LOWER(?), ?, ?, ?, ?)").bind(id, target.email, name, html, files, template).run();

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}
