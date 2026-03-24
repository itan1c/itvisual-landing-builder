export async function onRequestGet({ request, env }) {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
    const token = auth.replace("Bearer ", "");

    const user = await env.DB.prepare("SELECT email FROM users WHERE token = ?").bind(token).first();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { results } = await env.DB.prepare("SELECT id, user_email, name, html, files, template, updated_at FROM projects WHERE user_email = ? ORDER BY updated_at DESC").bind(user.email).all();
    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost({ request, env }) {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
    const token = auth.replace("Bearer ", "");

    const user = await env.DB.prepare("SELECT email FROM users WHERE token = ?").bind(token).first();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const project = await request.json();
    const id = project.id || crypto.randomUUID();
    const name = project.name || "Untitled";
    const html = project.html || "";
    const files = project.files || null;
    const template = project.template || null;

    await env.DB.prepare("INSERT INTO projects (id, user_email, name, html, files, template) VALUES (?, ?, ?, ?, ?, ?)").bind(id, user.email, name, html, files, template).run();

    return new Response(JSON.stringify({ success: true, id }), { headers: { "Content-Type": "application/json" } });
}
