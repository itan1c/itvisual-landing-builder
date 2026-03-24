export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { email, password } = body;
        if (!email || !password) return new Response("Email and password required", { status: 400 });

        // hash password simple (for MVP)
        const password_hash = password;
        const id = crypto.randomUUID();
        const token = crypto.randomUUID();

        // Check exists
        const exists = await env.DB.prepare("SELECT email FROM users WHERE email = ?").bind(email).first();
        if (exists) return new Response(JSON.stringify({ error: "Користувач вже існує" }), { status: 400 });

        await env.DB.prepare("INSERT INTO users (id, email, password_hash, plan, token) VALUES (?, ?, ?, ?, ?)").bind(id, email, password_hash, 'free', token).run();

        return new Response(JSON.stringify({ success: true, user: { email, plan: 'free', token } }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
}
