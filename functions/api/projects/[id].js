export async function onRequestGet({ request, env, params }) {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
    const token = auth.replace("Bearer ", "");

    const user = await env.DB.prepare("SELECT email FROM users WHERE token = ?").bind(token).first();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { id } = params;
    const project = await env.DB.prepare("SELECT * FROM projects WHERE id = ? AND user_email = ?").bind(id, user.email).first();
    if (!project) return new Response("Not found", { status: 404 });

    return new Response(JSON.stringify(project), { headers: { "Content-Type": "application/json" } });
}

export async function onRequestPut({ request, env, params }) {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
    const token = auth.replace("Bearer ", "");

    const user = await env.DB.prepare("SELECT email FROM users WHERE token = ?").bind(token).first();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const body = await request.json();
    const { id } = params;

    let query = "UPDATE projects SET html = ?, name = ?, updated_at = CURRENT_TIMESTAMP";
    const binds = [body.html, body.name];

    if (body.files !== undefined) {
        query += ", files = ?";
        binds.push(body.files);
    }
    if (body.template !== undefined) {
        query += ", template = ?";
        binds.push(body.template);
    }
    query += " WHERE id = ? AND user_email = ?";
    binds.push(id, user.email);

    await env.DB.prepare(query).bind(...binds).run();

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}

export async function onRequestDelete({ request, env, params }) {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
    const token = auth.replace("Bearer ", "");

    const user = await env.DB.prepare("SELECT email FROM users WHERE token = ?").bind(token).first();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { id } = params;
    await env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_email = ?").bind(id, user.email).run();

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}
